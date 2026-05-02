package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// ==================== Hot Money Data Scheduler ====================
// Automatically fetches and stores dragon tiger (龙虎榜) data daily
// Data sources: Tushare (primary) -> AkShare (fallback)

var (
	hotMoneySchedulerMu   sync.Mutex
	lastHotMoneyFetchTime time.Time
)

// StartHotMoneyScheduler starts the daily dragon tiger data collection scheduler
// Runs after market close (15:30+) to fetch complete daily data
func StartHotMoneyScheduler() {
	go func() {
		log.Println("[HotMoney] Scheduler started - fetches daily dragon tiger data after market close")

		// Run immediately on start to backfill if needed
		go hotMoneySchedulerRun()

		// Check every 30 minutes
		ticker := time.NewTicker(30 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			go hotMoneySchedulerRun()
		}
	}()
}

func hotMoneySchedulerRun() {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	now := time.Now().In(loc)

	// Skip weekends
	if now.Weekday() == time.Saturday || now.Weekday() == time.Sunday {
		return
	}

	// Only run after 16:00 (dragon tiger data is usually available after 16:00)
	if now.Hour() < 16 {
		return
	}

	// Prevent running too frequently (minimum 2 hours between runs)
	hotMoneySchedulerMu.Lock()
	if time.Since(lastHotMoneyFetchTime) < 2*time.Hour {
		hotMoneySchedulerMu.Unlock()
		return
	}
	lastHotMoneyFetchTime = time.Now()
	hotMoneySchedulerMu.Unlock()

	tradeDate := now.Format("20060102")
	log.Printf("[HotMoney] Scheduler: fetching dragon tiger data for %s", tradeDate)

	// Check if data already exists for today
	var count int64
	repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", tradeDate).Count(&count)
	if count > 0 {
		log.Printf("[HotMoney] Data already exists for %s (%d records), skipping", tradeDate, count)
		return
	}

	// Try Tushare first
	success := fetchAndSaveDragonTiger(tradeDate)
	if success {
		log.Printf("[HotMoney] Successfully fetched data from Tushare for %s", tradeDate)
		return
	}

	// Fallback to AkShare
	log.Printf("[HotMoney] Tushare failed, trying AkShare fallback for %s", tradeDate)
	success = fetchAndSaveDragonTigerFromAkShare(tradeDate)
	if success {
		log.Printf("[HotMoney] Successfully fetched data from AkShare for %s", tradeDate)
		return
	}

	log.Printf("[HotMoney] WARNING: Failed to fetch dragon tiger data from all sources for %s", tradeDate)
}

// BackfillHotMoneyData backfills dragon tiger data for the past N trading days
func BackfillHotMoneyData(days int) {
	loc, _ := time.LoadLocation("Asia/Shanghai")
	now := time.Now().In(loc)

	log.Printf("[HotMoney] Starting backfill for past %d trading days", days)
	filled := 0

	for i := 0; i < days*2 && filled < days; i++ {
		d := now.AddDate(0, 0, -i)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		tradeDate := d.Format("20060102")

		// Check if data exists
		var count int64
		repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", tradeDate).Count(&count)
		if count > 0 {
			filled++
			continue
		}

		// Try to fetch
		log.Printf("[HotMoney] Backfill: fetching data for %s", tradeDate)
		success := fetchAndSaveDragonTiger(tradeDate)
		if !success {
			success = fetchAndSaveDragonTigerFromAkShare(tradeDate)
		}
		if success {
			filled++
			log.Printf("[HotMoney] Backfill: success for %s", tradeDate)
		} else {
			log.Printf("[HotMoney] Backfill: no data available for %s", tradeDate)
		}

		// Rate limiting between API calls
		time.Sleep(2 * time.Second)
	}

	log.Printf("[HotMoney] Backfill complete: %d days processed", filled)
}

// fetchAndSaveDragonTigerFromAkShare fetches dragon tiger data from AkShare and saves to DB
func fetchAndSaveDragonTigerFromAkShare(tradeDate string) bool {
	akURL := getAkShareServiceURL()
	url := fmt.Sprintf("%s/dragon_tiger?trade_date=%s", akURL, tradeDate)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("[HotMoney] AkShare dragon_tiger request error: %v", err)
		return false
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[HotMoney] AkShare dragon_tiger read error: %v", err)
		return false
	}

	var result struct {
		Code int `json:"code"`
		Data struct {
			Stocks       []map[string]interface{} `json:"stocks"`
			Institutions []map[string]interface{} `json:"institutions"`
			TradeDate    string                   `json:"trade_date"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("[HotMoney] AkShare dragon_tiger parse error: %v", err)
		return false
	}

	if result.Code != 0 || len(result.Data.Stocks) == 0 {
		log.Printf("[HotMoney] AkShare dragon_tiger: no stocks for %s", tradeDate)
		return false
	}

	// Convert AkShare data to TsDragonTiger format and save
	items := make([]TsDragonTiger, 0, len(result.Data.Stocks))
	for _, stock := range result.Data.Stocks {
		code := safeStringFromMap(stock, "code")
		if code == "" {
			continue
		}
		// Convert code to ts_code format (000001 -> 000001.SZ)
		tsCode := code
		if !strings.Contains(code, ".") {
			if strings.HasPrefix(code, "6") {
				tsCode = code + ".SH"
			} else {
				tsCode = code + ".SZ"
			}
		}

		items = append(items, TsDragonTiger{
			TradeDate:    tradeDate,
			TsCode:       tsCode,
			Name:         safeStringFromMap(stock, "name"),
			Close:        safeFloatFromMap(stock, "close"),
			PctChange:    safeFloatFromMap(stock, "pct_change"),
			TurnoverRate: safeFloatFromMap(stock, "turnover_rate"),
			Amount:       safeFloatFromMap(stock, "total_amount"),
			LBuy:         safeFloatFromMap(stock, "lhb_buy"),
			LSell:        safeFloatFromMap(stock, "lhb_sell"),
			LAmount:      safeFloatFromMap(stock, "lhb_amount"),
			NetAmount:    safeFloatFromMap(stock, "lhb_net_buy"),
			NetRate:      safeFloatFromMap(stock, "net_rate"),
			AmountRate:   safeFloatFromMap(stock, "amount_rate"),
			Reason:       safeStringFromMap(stock, "reason"),
		})
	}

	if len(items) == 0 {
		return false
	}

	// Save to DB
	tx := repository.DB.Begin()
	if tx.Error != nil {
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsDragonTiger{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[HotMoney] AkShare save error: %v", err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		return false
	}

	log.Printf("[HotMoney] Saved %d AkShare dragon tiger records for %s", len(items), tradeDate)

	// Also try to save institution details
	if len(result.Data.Institutions) > 0 {
		instItems := make([]TsDragonTigerInst, 0, len(result.Data.Institutions))
		for _, inst := range result.Data.Institutions {
			code := safeStringFromMap(inst, "code")
			tsCode := code
			if !strings.Contains(code, ".") {
				if strings.HasPrefix(code, "6") {
					tsCode = code + ".SH"
				} else {
					tsCode = code + ".SZ"
				}
			}
			instItems = append(instItems, TsDragonTigerInst{
				TradeDate: tradeDate,
				TsCode:    tsCode,
				Exalter:   safeStringFromMap(inst, "name"),
				Side:      "0", // from institution list, default buy side
				Buy:       safeFloatFromMap(inst, "buy_amt"),
				Sell:      safeFloatFromMap(inst, "sell_amt"),
				NetBuy:    safeFloatFromMap(inst, "net_amt"),
				Reason:    safeStringFromMap(inst, "reason"),
			})
		}
		if len(instItems) > 0 {
			txInst := repository.DB.Begin()
			txInst.Where("trade_date = ?", tradeDate).Delete(&TsDragonTigerInst{})
			txInst.CreateInBatches(&instItems, 100)
			txInst.Commit()
		}
	}

	return true
}

// Helper functions for safely extracting values from map[string]interface{}
func safeStringFromMap(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok && v != nil {
		return fmt.Sprintf("%v", v)
	}
	return ""
}

func safeFloatFromMap(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok && v != nil {
		switch val := v.(type) {
		case float64:
			return val
		case float32:
			return float64(val)
		case int:
			return float64(val)
		case int64:
			return float64(val)
		case string:
			f, _ := strconv.ParseFloat(val, 64)
			return f
		}
	}
	return 0
}

// ==================== GetHotMoneyBoard ====================
// Dedicated hot money board endpoint: returns trader-stock data for
// scrolling broadcast + stock selection detail views
// This is the independent "游资打板" feature, separated from the dashboard
func (h *Handler) GetHotMoneyBoard(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"
	sortBy := c.DefaultQuery("sort", "net") // net, buy, sell

	// Ensure data exists
	var count int64
	repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count == 0 || refresh {
		// Try current date and fallback to recent trading days
		fetched := false
		candidates := []string{tradeDate}
		if count == 0 {
			now := time.Now()
			for i := 1; i <= 7; i++ {
				d := now.AddDate(0, 0, -i)
				if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
					continue
				}
				candidate := d.Format("20060102")
				if candidate != tradeDate {
					candidates = append(candidates, candidate)
				}
			}
		}

		for _, candidate := range candidates {
			if fetchAndSaveDragonTiger(candidate) {
				repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", candidate).Count(&count)
				if count > 0 {
					tradeDate = candidate
					fetched = true
					break
				}
			}
		}
		if !fetched {
			var latestRecord TsDragonTiger
			if err := repository.DB.Order("trade_date DESC").First(&latestRecord).Error; err == nil {
				tradeDate = latestRecord.TradeDate
			}
		}
	}

	// Load all items and institutions for the date
	var allItems []TsDragonTiger
	repository.DB.Where("trade_date = ?", tradeDate).Order("net_amount DESC").Find(&allItems)

	var allInsts []TsDragonTigerInst
	repository.DB.Where("trade_date = ?", tradeDate).Find(&allInsts)

	instMap := map[string][]TsDragonTigerInst{}
	for _, inst := range allInsts {
		instMap[inst.TsCode] = append(instMap[inst.TsCode], inst)
	}

	// Ensure hot money name list is loaded
	ensureHotMoneyList()

	// Build stock info map
	stockInfoMap := map[string]gin.H{}
	for _, item := range allItems {
		code := tsCodeToCode(item.TsCode)
		stockInfoMap[item.TsCode] = gin.H{
			"code":          code,
			"ts_code":       item.TsCode,
			"name":          item.Name,
			"close":         item.Close,
			"pct_change":    item.PctChange,
			"turnover_rate": item.TurnoverRate,
			"amount":        item.Amount,
			"net_amount":    item.NetAmount,
			"reason":        item.Reason,
		}
	}

	// Group by trader
	type traderData struct {
		Name       string
		TotalBuy   float64
		TotalSell  float64
		TotalNet   float64
		TradeCount int
		IsKnown    bool
		Stocks     []gin.H // individual stock trades
	}
	traderMap := map[string]*traderData{}
	traderOrder := []string{}

	// Also build a scrolling broadcast list (flat, for marquee)
	type scrollItem struct {
		TraderName string
		StockName  string
		StockCode  string
		BuyAmt     float64
		SellAmt    float64
		NetAmt     float64
		Side       string
		IsKnown    bool
	}
	scrollItems := []scrollItem{}

	for _, item := range allItems {
		code := tsCodeToCode(item.TsCode)
		insts := instMap[item.TsCode]

		for _, inst := range insts {
			seatName := inst.Exalter
			if seatName == "" {
				continue
			}

			traderName := matchHotMoneyTraderName(seatName)
			isKnown := traderName != ""
			if traderName == "" {
				traderName = simplifyUnmatchedSeat(seatName)
			}

			if _, ok := traderMap[traderName]; !ok {
				traderMap[traderName] = &traderData{
					Name:    traderName,
					IsKnown: isKnown,
					Stocks:  []gin.H{},
				}
				traderOrder = append(traderOrder, traderName)
			}

			trader := traderMap[traderName]
			if isKnown && !trader.IsKnown {
				trader.IsKnown = true
			}

			trader.Stocks = append(trader.Stocks, gin.H{
				"code":     code,
				"ts_code":  item.TsCode,
				"name":     item.Name,
				"seat":     seatName,
				"buy_amt":  inst.Buy,
				"sell_amt": inst.Sell,
				"net_amt":  inst.NetBuy,
				"side":     inst.Side,
				"reason":   inst.Reason,
				"close":    item.Close,
				"pct_chg":  item.PctChange,
			})
			trader.TotalBuy += inst.Buy
			trader.TotalSell += inst.Sell
			trader.TotalNet += inst.NetBuy
			trader.TradeCount++

			// Add to scroll broadcast if known or significant amount
			if isKnown || inst.Buy > 5000 || inst.Sell > 5000 {
				scrollItems = append(scrollItems, scrollItem{
					TraderName: traderName,
					StockName:  item.Name,
					StockCode:  code,
					BuyAmt:     inst.Buy,
					SellAmt:    inst.Sell,
					NetAmt:     inst.NetBuy,
					Side:       inst.Side,
					IsKnown:    isKnown,
				})
			}
		}
	}

	// Sort traders
	sort.Slice(traderOrder, func(i, j int) bool {
		ti := traderMap[traderOrder[i]]
		tj := traderMap[traderOrder[j]]
		if ti.IsKnown != tj.IsKnown {
			return ti.IsKnown
		}
		switch sortBy {
		case "buy":
			return ti.TotalBuy > tj.TotalBuy
		case "sell":
			return ti.TotalSell > tj.TotalSell
		default:
			return math.Abs(ti.TotalNet) > math.Abs(tj.TotalNet)
		}
	})

	// Sort scroll items: known traders first, then by amount
	sort.Slice(scrollItems, func(i, j int) bool {
		if scrollItems[i].IsKnown != scrollItems[j].IsKnown {
			return scrollItems[i].IsKnown
		}
		return math.Abs(scrollItems[i].NetAmt) > math.Abs(scrollItems[j].NetAmt)
	})

	// Build response
	traders := []gin.H{}
	for _, name := range traderOrder {
		t := traderMap[name]
		traders = append(traders, gin.H{
			"trader_name": t.Name,
			"total_buy":   t.TotalBuy,
			"total_sell":  t.TotalSell,
			"total_net":   t.TotalNet,
			"trade_count": t.TradeCount,
			"is_known":    t.IsKnown,
			"stocks":      t.Stocks,
		})
	}

	// Build scroll broadcast items
	scrollList := []gin.H{}
	for _, s := range scrollItems {
		action := "买入"
		amt := s.BuyAmt
		if s.Side == "1" || s.SellAmt > s.BuyAmt {
			action = "卖出"
			amt = s.SellAmt
		}
		scrollList = append(scrollList, gin.H{
			"trader":  s.TraderName,
			"stock":   s.StockName,
			"code":    s.StockCode,
			"action":  action,
			"amount":  amt,
			"net_amt": s.NetAmt,
			"is_known": s.IsKnown,
		})
	}

	// Build unique stocks list (for stock panel selection)
	stocks := []gin.H{}
	seenStocks := map[string]bool{}
	for _, item := range allItems {
		code := tsCodeToCode(item.TsCode)
		if seenStocks[code] {
			continue
		}
		seenStocks[code] = true
		stocks = append(stocks, gin.H{
			"code":       code,
			"ts_code":    item.TsCode,
			"name":       item.Name,
			"close":      item.Close,
			"pct_change": item.PctChange,
			"amount":     item.Amount,
			"net_amount": item.NetAmount,
			"reason":     item.Reason,
		})
	}

	response.Success(c, gin.H{
		"trade_date":    formatTradeDateForDisplay(tradeDate),
		"traders":       traders,
		"scroll_items":  scrollList,
		"stocks":        stocks,
		"total_traders": len(traders),
		"total_stocks":  len(stocks),
		"sort":          sortBy,
	})
}

// ==================== GetHotMoneyDetail ====================
// Returns detailed data for a specific stock from the dragon tiger list
// Used when user selects a stock in the hot money board
func (h *Handler) GetHotMoneyDetail(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))

	// Find the stock in dragon tiger data
	tsCode := codeToTsCode(code)
	var dtItem TsDragonTiger
	err := repository.DB.Where("ts_code = ? AND trade_date = ?", tsCode, tradeDate).First(&dtItem).Error
	if err != nil {
		// Try to find in any recent date
		err = repository.DB.Where("ts_code = ?", tsCode).Order("trade_date DESC").First(&dtItem).Error
	}

	stockInfo := gin.H{
		"code":   code,
		"name":   "",
		"close":  0,
		"reason": "",
	}

	if err == nil {
		stockInfo["name"] = dtItem.Name
		stockInfo["close"] = dtItem.Close
		stockInfo["pct_change"] = dtItem.PctChange
		stockInfo["amount"] = dtItem.Amount
		stockInfo["net_amount"] = dtItem.NetAmount
		stockInfo["reason"] = dtItem.Reason
		stockInfo["turnover_rate"] = dtItem.TurnoverRate
	} else {
		// Try to get name from stock_basic
		var basic TsStockBasic
		if e := repository.DB.Where("ts_code = ?", tsCode).First(&basic).Error; e == nil {
			stockInfo["name"] = basic.Name
		}
	}

	// Get all institutions that traded this stock
	var insts []TsDragonTigerInst
	if dtItem.TradeDate != "" {
		repository.DB.Where("ts_code = ? AND trade_date = ?", tsCode, dtItem.TradeDate).Find(&insts)
	}

	ensureHotMoneyList()

	instList := []gin.H{}
	for _, inst := range insts {
		traderName := matchHotMoneyTraderName(inst.Exalter)
		if traderName == "" {
			traderName = simplifyUnmatchedSeat(inst.Exalter)
		}
		instList = append(instList, gin.H{
			"trader":   traderName,
			"seat":     inst.Exalter,
			"side":     inst.Side,
			"buy_amt":  inst.Buy,
			"sell_amt": inst.Sell,
			"net_amt":  inst.NetBuy,
			"is_known": matchHotMoneyTraderName(inst.Exalter) != "",
		})
	}

	response.Success(c, gin.H{
		"stock":        stockInfo,
		"institutions": instList,
		"trade_date":   formatTradeDateForDisplay(dtItem.TradeDate),
	})
}

// ==================== GetHotMoneyDates ====================
// Returns available trade dates with dragon tiger data
func (h *Handler) GetHotMoneyDates(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	if limit < 1 || limit > 90 {
		limit = 30
	}

	type dateResult struct {
		TradeDate string
		Count     int64
	}

	var dates []dateResult
	repository.DB.Model(&TsDragonTiger{}).
		Select("trade_date, COUNT(*) as count").
		Group("trade_date").
		Order("trade_date DESC").
		Limit(limit).
		Find(&dates)

	results := []gin.H{}
	for _, d := range dates {
		results = append(results, gin.H{
			"trade_date": formatTradeDateForDisplay(d.TradeDate),
			"raw_date":   d.TradeDate,
			"count":      d.Count,
		})
	}

	response.Success(c, gin.H{
		"dates": results,
		"total": len(results),
	})
}

// NOTE: simplifyUnmatchedSeat, matchHotMoneyTraderName, ensureHotMoneyList,
// fetchAndSaveDragonTiger, normTradeDate, formatTradeDateForDisplay, tsCodeToCode
// are all defined in tushare_dashboard.go (same package)

// ==================== HotMoneyBackfill ====================
// Admin endpoint to manually trigger backfill of dragon tiger data
func (h *Handler) HotMoneyBackfill(c *gin.Context) {
	days, _ := strconv.Atoi(c.DefaultQuery("days", "30"))
	if days < 1 {
		days = 5
	}
	if days > 60 {
		days = 60
	}

	go BackfillHotMoneyData(days)

	response.Success(c, gin.H{
		"message": fmt.Sprintf("Backfill started for %d trading days", days),
		"days":    days,
	})
}
