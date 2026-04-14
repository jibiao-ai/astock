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
	"time"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// ==================== Trend Chart (分时图) ====================

// GetTrendChart returns intraday minute-level trend data from Eastmoney
func (h *Handler) GetTrendChart(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=%s&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=1", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		response.InternalError(c, "获取分时数据失败: "+err.Error())
		return
	}

	result := parseTrendData(data)
	response.Success(c, result)
}

// GetTrendChart5Day returns 5-day intraday trend data
func (h *Handler) GetTrendChart5Day(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2his.eastmoney.com/api/qt/stock/trends2/get?secid=%s&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55,f56,f57,f58&iscr=0&ndays=5", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		response.InternalError(c, "获取5日分时数据失败: "+err.Error())
		return
	}

	result := parseTrendData(data)
	response.Success(c, result)
}

func parseTrendData(body []byte) gin.H {
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return gin.H{"trends": []interface{}{}, "pre_close": 0}
	}

	data, ok := raw["data"].(map[string]interface{})
	if !ok {
		return gin.H{"trends": []interface{}{}, "pre_close": 0}
	}

	preClose := 0.0
	if pc, ok := data["preClose"].(float64); ok {
		preClose = pc
	}
	if preClose > 100 {
		preClose /= 100
	}

	name := ""
	if n, ok := data["name"].(string); ok {
		name = n
	}

	code := ""
	if c, ok := data["code"].(string); ok {
		code = c
	}

	trends := []gin.H{}
	if trendsRaw, ok := data["trends"].([]interface{}); ok {
		for _, t := range trendsRaw {
			if tStr, ok := t.(string); ok {
				parts := strings.Split(tStr, ",")
				if len(parts) >= 8 {
					price, _ := strconv.ParseFloat(parts[1], 64)
					avg, _ := strconv.ParseFloat(parts[2], 64)
					vol, _ := strconv.ParseFloat(parts[5], 64)
					amt, _ := strconv.ParseFloat(parts[6], 64)
					trends = append(trends, gin.H{
						"time":   parts[0],
						"price":  price,
						"avg":    avg,
						"volume": vol,
						"amount": amt,
					})
				}
			}
		}
	}

	return gin.H{
		"name":      name,
		"code":      code,
		"pre_close": preClose,
		"trends":    trends,
	}
}

// ==================== Chip Distribution (筹码分布) ====================

// GetChipDistribution returns chip distribution data from Eastmoney
func (h *Handler) GetChipDistribution(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2his.eastmoney.com/api/qt/stock/fflow/daykline/get?secid=%s&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		response.InternalError(c, "获取资金流数据失败: "+err.Error())
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		response.InternalError(c, "解析数据失败")
		return
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		response.Success(c, gin.H{"klines": []interface{}{}, "code": code})
		return
	}

	klines := []gin.H{}
	if klinesRaw, ok := resultData["klines"].([]interface{}); ok {
		for _, k := range klinesRaw {
			if kStr, ok := k.(string); ok {
				parts := strings.Split(kStr, ",")
				if len(parts) >= 7 {
					mainIn, _ := strconv.ParseFloat(parts[1], 64)
					mainOut, _ := strconv.ParseFloat(parts[2], 64)
					retailIn, _ := strconv.ParseFloat(parts[5], 64)
					retailOut, _ := strconv.ParseFloat(parts[6], 64)
					klines = append(klines, gin.H{
						"date":       parts[0],
						"main_in":    mainIn / 10000,
						"main_out":   mainOut / 10000,
						"main_net":   (mainIn + mainOut) / 10000,
						"retail_in":  retailIn / 10000,
						"retail_out": retailOut / 10000,
						"retail_net": (retailIn + retailOut) / 10000,
					})
				}
			}
		}
	}

	response.Success(c, gin.H{
		"code":   code,
		"klines": klines,
	})
}

// ==================== Stock Fund Flow (个股资金流) ====================

// GetStockFundFlow returns fund flow data for a stock from Eastmoney
func (h *Handler) GetStockFundFlow(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?secid=%s&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&klt=101&lmt=5", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		response.InternalError(c, "获取资金流数据失败: "+err.Error())
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		response.InternalError(c, "解析数据失败")
		return
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		response.Success(c, gin.H{"klines": []interface{}{}, "code": code})
		return
	}

	klines := []gin.H{}
	if klinesRaw, ok := resultData["klines"].([]interface{}); ok {
		for _, k := range klinesRaw {
			if kStr, ok := k.(string); ok {
				parts := strings.Split(kStr, ",")
				if len(parts) >= 6 {
					mainNet, _ := strconv.ParseFloat(parts[1], 64)
					retailNet, _ := strconv.ParseFloat(parts[5], 64)
					superBig, _ := strconv.ParseFloat(parts[2], 64)
					big, _ := strconv.ParseFloat(parts[3], 64)
					mid, _ := strconv.ParseFloat(parts[4], 64)
					klines = append(klines, gin.H{
						"date":       parts[0],
						"main_net":   mainNet,
						"retail_net": retailNet,
						"super_big":  superBig,
						"big":        big,
						"mid":        mid,
					})
				}
			}
		}
	}

	response.Success(c, gin.H{
		"code":   code,
		"klines": klines,
	})
}

// ==================== Watchlist CRUD ====================

// GetWatchlist returns user's watchlist
func (h *Handler) GetWatchlist(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var items []model.WatchlistItem
	repository.DB.Where("user_id = ?", userID).Order("sort_order asc, created_at desc").Find(&items)
	response.Success(c, items)
}

// AddWatchlistItem adds a stock to user's watchlist
func (h *Handler) AddWatchlistItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req struct {
		Code string `json:"code" binding:"required"`
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	var existing model.WatchlistItem
	err := repository.DB.Where("user_id = ? AND code = ?", userID, req.Code).First(&existing).Error
	if err == nil {
		response.BadRequest(c, "该股票已在自选列表中")
		return
	}

	if req.Name == "" {
		quote, _ := fetchQuoteFromSource(req.Code, "eastmoney")
		if quote != nil && quote.Name != "" {
			req.Name = quote.Name
		} else {
			req.Name = req.Code
		}
	}

	item := model.WatchlistItem{
		UserID: userID.(uint),
		Code:   req.Code,
		Name:   req.Name,
	}
	repository.DB.Create(&item)

	repository.DB.Create(&model.AuditLog{
		UserID: userID.(uint), Module: "watchlist", Action: "add",
		Target: req.Code, Detail: fmt.Sprintf("添加自选股: %s(%s)", req.Name, req.Code),
		IP: c.ClientIP(), Status: "success",
	})

	response.Success(c, item)
}

// RemoveWatchlistItem removes a stock from watchlist
func (h *Handler) RemoveWatchlistItem(c *gin.Context) {
	userID, _ := c.Get("user_id")
	code := c.Param("code")

	result := repository.DB.Where("user_id = ? AND code = ?", userID, code).Delete(&model.WatchlistItem{})
	if result.RowsAffected == 0 {
		response.BadRequest(c, "自选股不存在")
		return
	}

	repository.DB.Create(&model.AuditLog{
		UserID: userID.(uint), Module: "watchlist", Action: "delete",
		Target: code, Detail: fmt.Sprintf("删除自选股: %s", code),
		IP: c.ClientIP(), Status: "success",
	})

	response.Success(c, nil)
}

// GetWatchlistQuotes returns real-time quotes for all watchlist items
func (h *Handler) GetWatchlistQuotes(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var items []model.WatchlistItem
	repository.DB.Where("user_id = ?", userID).Order("sort_order asc, created_at desc").Find(&items)

	if len(items) == 0 {
		response.Success(c, []interface{}{})
		return
	}

	codes := []string{}
	for _, item := range items {
		codes = append(codes, item.Code)
	}

	quotes := fetchBatchQuotes(codes)

	results := []gin.H{}
	for _, item := range items {
		q := quotes[item.Code]
		fiveDayClose := fetch5DayClose(item.Code)
		fundFlow := fetchFundFlowSummary(item.Code)

		results = append(results, gin.H{
			"id":             item.ID,
			"code":           item.Code,
			"name":           ifStr(q.Name, item.Name),
			"price":          q.Price,
			"change":         q.Change,
			"change_pct":     q.ChangePct,
			"volume":         q.Volume,
			"amount":         q.Amount,
			"high":           q.High,
			"low":            q.Low,
			"open":           q.Open,
			"pre_close":      q.PreClose,
			"five_day_close": fiveDayClose,
			"main_net":       fundFlow["main_net"],
			"retail_net":     fundFlow["retail_net"],
			"created_at":     item.CreatedAt,
		})
	}

	response.Success(c, results)
}

// ==================== Concept Heat (概念热力) ====================

// GetConceptHeat returns concept/theme heat data from Eastmoney
func (h *Handler) GetConceptHeat(c *gin.Context) {
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205"

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		response.InternalError(c, "获取概念板块数据失败: "+err.Error())
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		response.InternalError(c, "解析数据失败")
		return
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		response.Success(c, []interface{}{})
		return
	}
	diffArr, ok := resultData["diff"].([]interface{})
	if !ok {
		response.Success(c, []interface{}{})
		return
	}

	concepts := []gin.H{}
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		concepts = append(concepts, gin.H{
			"name":       safeString(d, "f14"),
			"code":       safeString(d, "f12"),
			"change_pct": safeFloat(d, "f3"),
			"net_flow":   safeFloat(d, "f62") / 100000000,
			"flow_in":    safeFloat(d, "f66") / 100000000,
			"flow_out":   safeFloat(d, "f72") / 100000000,
			"lead_stock": safeString(d, "f204"),
			"price":      safeFloat(d, "f2"),
		})
	}

	response.Success(c, concepts)
}

// ==================== Dashboard Real Data ====================

// GetLimitUpDownDetails returns today's limit-up and limit-down stocks (09:15 to current time).
// Uses Eastmoney clist API to fetch all A-stocks sorted by change_pct, then filters by limit thresholds.
// Includes retry mechanism for reliability.
func (h *Handler) GetLimitUpDownDetails(c *gin.Context) {
	limitType := c.DefaultQuery("type", "up")

	// Try up to 3 times to get data
	var stocks []gin.H
	for attempt := 1; attempt <= 3; attempt++ {
		// First try the dedicated pool API (more accurate during trading hours)
		poolStocks := fetchLimitPoolStocks(limitType)
		if len(poolStocks) > 0 {
			stocks = poolStocks
			break
		}

		// Fallback: use clist API to scan all A-stocks and filter by limit thresholds
		clistStocks := fetchLimitStocksFromClist(limitType)
		if len(clistStocks) > 0 {
			stocks = clistStocks
			break
		}

		if attempt < 3 {
			log.Printf("[LimitDetails] Attempt %d returned no data, retrying in 1s...", attempt)
			time.Sleep(1 * time.Second)
		}
	}

	if stocks == nil {
		stocks = []gin.H{}
	}

	response.Success(c, gin.H{
		"stocks": stocks,
		"count":  len(stocks),
		"type":   limitType,
	})
}

// fetchLimitPoolStocks tries the dedicated ZT/DT pool API (works during trading hours)
func fetchLimitPoolStocks(limitType string) []gin.H {
	var url string
	if limitType == "down" {
		url = "https://push2ex.eastmoney.com/getTopicDTPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"
	} else {
		url = "https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"
	}

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
	if err != nil {
		return nil
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		return nil
	}

	pool, ok := resultData["pool"].([]interface{})
	if !ok || len(pool) == 0 {
		return nil
	}

	stocks := []gin.H{}
	for _, item := range pool {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		price := safeFloat(d, "f2") / 1000
		changePct := safeFloat(d, "f3") / 1000
		openPrice := safeFloat(d, "f17") / 1000
		fundAmt := safeFloat(d, "f6") / 100000000

		stocks = append(stocks, gin.H{
			"code":        safeString(d, "f12"),
			"name":        safeString(d, "f14"),
			"price":       price,
			"open":        openPrice,
			"change_pct":  changePct,
			"fund_amount": fundAmt,
			"concept":     safeString(d, "f225"),
			"board_count": safeInt(d, "f136"),
		})
	}

	return stocks
}

// fetchLimitStocksFromClist uses the A-stock list API to find stocks at their limit
func fetchLimitStocksFromClist(limitType string) []gin.H {
	po := "1"
	if limitType == "down" {
		po = "0"
	}

	allStocks := []gin.H{}
	fs := "m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048"

	for page := 1; page <= 5; page++ {
		url := fmt.Sprintf(
			"https://push2.eastmoney.com/api/qt/clist/get?pn=%d&pz=100&po=%s&np=1&fltt=2&invt=2&fid=f3&fs=%s&fields=f2,f3,f4,f5,f6,f7,f12,f14,f15,f16,f17,f18,f62",
			page, po, fs)

		data, err := fetchEastmoneyAPIWithRetry(url, 2)
		if err != nil {
			log.Printf("[LimitClist] page %d fetch error: %v", page, err)
			break
		}

		var raw map[string]interface{}
		if err := json.Unmarshal(data, &raw); err != nil {
			break
		}

		resultData, ok := raw["data"].(map[string]interface{})
		if !ok {
			break
		}

		diffArr, ok := resultData["diff"].([]interface{})
		if !ok || len(diffArr) == 0 {
			break
		}

		foundAny := false
		for _, item := range diffArr {
			d, ok := item.(map[string]interface{})
			if !ok {
				continue
			}

			code := safeString(d, "f12")
			name := safeString(d, "f14")
			changePct := safeFloat(d, "f3")
			price := safeFloat(d, "f2")
			openPrice := safeFloat(d, "f17")
			preClose := safeFloat(d, "f18")
			fundAmt := safeFloat(d, "f62")

			threshold := getLimitThreshold(code, name)
			if threshold == 0 {
				continue
			}

			isLimit := false
			if limitType == "up" {
				isLimit = changePct >= threshold
			} else {
				isLimit = changePct <= -threshold
			}

			if !isLimit {
				continue
			}

			foundAny = true
			allStocks = append(allStocks, gin.H{
				"code":        code,
				"name":        name,
				"price":       price,
				"open":        openPrice,
				"pre_close":   preClose,
				"change_pct":  changePct,
				"fund_amount": fundAmt / 100000000,
				"concept":     "",
				"board_count": 0,
			})
		}

		if !foundAny {
			break
		}
	}

	return allStocks
}

// getLimitThreshold returns the daily limit threshold (%) for a stock based on its code and name.
func getLimitThreshold(code, name string) float64 {
	if strings.HasPrefix(name, "N") || strings.HasPrefix(name, "C") {
		if !strings.Contains(name, "ST") && !strings.Contains(name, "st") {
			return 0
		}
	}

	isST := strings.Contains(name, "ST") || strings.Contains(name, "st")

	if strings.HasPrefix(code, "30") {
		return 19.9
	}
	if strings.HasPrefix(code, "688") {
		return 19.9
	}
	if strings.HasPrefix(code, "8") || strings.HasPrefix(code, "4") || strings.HasPrefix(code, "92") {
		return 29.9
	}

	if isST {
		return 4.9
	}

	return 9.9
}

// ==================== Real-time Dashboard Stats ====================

// GetRealTimeStats returns real-time computed dashboard stats from live Eastmoney APIs.
// This replaces the demo/DB-based stats with actual live data.
func (h *Handler) GetRealTimeStats(c *gin.Context) {
	log.Println("[RealTimeStats] Fetching real-time dashboard stats...")

	// Fetch limit-up stocks (with board info)
	limitUpStocks := fetchLimitPoolStocks("up")
	if limitUpStocks == nil {
		limitUpStocks = fetchLimitStocksFromClist("up")
	}
	if limitUpStocks == nil {
		limitUpStocks = []gin.H{}
	}

	// Fetch limit-down stocks
	limitDownStocks := fetchLimitPoolStocks("down")
	if limitDownStocks == nil {
		limitDownStocks = fetchLimitStocksFromClist("down")
	}
	if limitDownStocks == nil {
		limitDownStocks = []gin.H{}
	}

	// Fetch broken (炸板) stocks - using ZT pool broken API
	brokenStocks := fetchBrokenStocksFromEastmoney()

	// Calculate highest board
	highestBoard := 0
	for _, s := range limitUpStocks {
		bc, _ := s["board_count"].(int)
		if bc > highestBoard {
			highestBoard = bc
		}
	}
	// If we only have clist data, check the pool for board counts
	if highestBoard == 0 {
		// Try fetching pool data specifically for board counts
		poolStocks := fetchLimitPoolStocks("up")
		if poolStocks != nil {
			for _, s := range poolStocks {
				bc, _ := s["board_count"].(int)
				if bc > highestBoard {
					highestBoard = bc
				}
			}
		}
	}

	// Fetch total market turnover from market indices (上证+深证+创业板)
	totalAmount := fetchMarketTotalAmount()

	// Fetch up/down/flat counts from Eastmoney
	upCount, downCount, flatCount := fetchMarketUpDownCounts()

	// Calculate sentiment score
	limitUpCount := len(limitUpStocks)
	brokenCount := len(brokenStocks)
	sentimentScore := float64(limitUpCount) * 0.8
	if sentimentScore > 85 {
		sentimentScore = 85
	}
	sentimentScore += float64(highestBoard) * 2
	if brokenCount > 0 {
		sentimentScore -= float64(brokenCount) * 0.3
	}
	if sentimentScore < 10 {
		sentimentScore = 10
	}
	if sentimentScore > 100 {
		sentimentScore = 100
	}

	// Build board ladder from limit-up stocks
	ladder := make(map[int]int)
	maxBoard := 0
	for _, s := range limitUpStocks {
		bc, _ := s["board_count"].(int)
		if bc <= 0 {
			bc = 1
		}
		ladder[bc]++
		if bc > maxBoard {
			maxBoard = bc
		}
	}

	// Sort limit-ups by board_count desc for the board list
	sort.Slice(limitUpStocks, func(i, j int) bool {
		bci, _ := limitUpStocks[i]["board_count"].(int)
		bcj, _ := limitUpStocks[j]["board_count"].(int)
		return bci > bcj
	})

	response.Success(c, gin.H{
		"market_sentiment": gin.H{
			"limit_up_count":   limitUpCount,
			"limit_down_count": len(limitDownStocks),
			"broken_count":     brokenCount,
			"highest_board":    highestBoard,
			"total_amount":     totalAmount,
			"score":            math.Round(sentimentScore*10) / 10,
			"up_count":         upCount,
			"down_count":       downCount,
			"flat_count":       flatCount,
		},
		"limit_ups":    limitUpStocks,
		"brokens":      brokenStocks,
		"board_ladder": gin.H{"ladder": ladder, "max_board": maxBoard},
	})
}

// fetchBrokenStocksFromEastmoney fetches stocks that had a limit-up but failed to hold (炸板)
func fetchBrokenStocksFromEastmoney() []gin.H {
	// Use the ZB (炸板) pool API
	url := "https://push2ex.eastmoney.com/getTopicZBPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
	if err != nil {
		log.Printf("[Broken] fetch error: %v", err)
		return []gin.H{}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return []gin.H{}
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		return []gin.H{}
	}

	pool, ok := resultData["pool"].([]interface{})
	if !ok || len(pool) == 0 {
		return []gin.H{}
	}

	stocks := []gin.H{}
	for _, item := range pool {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		price := safeFloat(d, "f2") / 1000
		changePct := safeFloat(d, "f3") / 1000
		openPrice := safeFloat(d, "f17") / 1000
		fundAmt := safeFloat(d, "f6") / 100000000

		stocks = append(stocks, gin.H{
			"code":        safeString(d, "f12"),
			"name":        safeString(d, "f14"),
			"price":       price,
			"open":        openPrice,
			"change_pct":  changePct,
			"fund_amount": fundAmt,
			"concept":     safeString(d, "f225"),
			"open_count":  safeInt(d, "f136"),
		})
	}

	log.Printf("[Broken] Found %d broken stocks", len(stocks))
	return stocks
}

// fetchMarketTotalAmount fetches the total market turnover (in 亿元)
func fetchMarketTotalAmount() float64 {
	// Fetch major indices: 上证指数(1.000001), 深证成指(0.399001), 创业板指(0.399006)
	url := "https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001,0.399006&fields=f2,f3,f4,f6,f12,f14,f43,f44,f45,f46,f47,f48"

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
	if err != nil {
		return 0
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return 0
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return 0
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok {
		return 0
	}

	totalAmount := 0.0
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		amount := safeFloat(d, "f6")
		totalAmount += amount
	}

	// Convert to 亿元
	return math.Round(totalAmount/100000000*10) / 10
}

// fetchMarketUpDownCounts fetches the number of stocks that are up, down, and flat
func fetchMarketUpDownCounts() (int, int, int) {
	// Fetch all A-stocks and count by change_pct
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=1&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3,f12,f104,f105,f106"

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
	if err != nil {
		return 0, 0, 0
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return 0, 0, 0
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return 0, 0, 0
	}

	total := int(safeFloat(dataObj, "total"))

	// For up/down/flat we'll fetch a summary from the market overview
	// Use a simple estimate from the total count and first-page distribution
	// Better approach: fetch up/down from major indices
	upCount, downCount, flatCount := fetchUpDownFromIndices()
	if upCount+downCount+flatCount == 0 {
		// Fallback estimate
		upCount = total * 45 / 100
		downCount = total * 45 / 100
		flatCount = total - upCount - downCount
	}

	return upCount, downCount, flatCount
}

// fetchUpDownFromIndices gets up/down/flat counts from major index data
func fetchUpDownFromIndices() (int, int, int) {
	// Get market statistics from the index API
	url := "https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001&fields=f104,f105,f106"

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
	if err != nil {
		return 0, 0, 0
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return 0, 0, 0
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return 0, 0, 0
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok {
		return 0, 0, 0
	}

	// f104=上涨家数, f105=下跌家数, f106=平盘家数 (for the SH/SZ composite index)
	totalUp, totalDown, totalFlat := 0, 0, 0
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		totalUp += int(safeFloat(d, "f104"))
		totalDown += int(safeFloat(d, "f105"))
		totalFlat += int(safeFloat(d, "f106"))
	}

	return totalUp, totalDown, totalFlat
}

// ==================== Dragon Tiger Hot Money API ====================

// GetDragonTigerHotMoney returns dragon-tiger (龙虎榜) data grouped by hot money trader (游资)
// Data comes from Eastmoney datacenter API - RPT_OPERATEDEPT_TRADE (seat-level trades)
// Supports pagination: page, page_size (default 5)
func (h *Handler) GetDragonTigerHotMoney(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "5"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 5
	}

	// Known hot money trader seats mapping
	hotMoneySeats := getHotMoneySeatsMap()

	// Try to get data for most recent trading days (today first, then backwards)
	now := time.Now()
	var allTraders []gin.H
	var tradeDate string

	for dayOffset := 0; dayOffset <= 5; dayOffset++ {
		d := now.AddDate(0, 0, -dayOffset)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		dateStr := d.Format("2006-01-02")

		// Try fetching stock-level dragon-tiger data for this date with retry
		var stocks []map[string]interface{}
		for attempt := 1; attempt <= 3; attempt++ {
			stocks = fetchDragonTigerDetailsByDate(dateStr)
			if len(stocks) > 0 {
				break
			}
			if attempt < 3 {
				log.Printf("[DragonTiger] Attempt %d for date %s returned no data, retrying...", attempt, dateStr)
				time.Sleep(time.Duration(attempt*500) * time.Millisecond)
			}
		}
		if len(stocks) > 0 {
			tradeDate = dateStr
			// Fetch seat-level data and group by hot money trader with retry
			for attempt := 1; attempt <= 3; attempt++ {
				allTraders = fetchAndGroupByHotMoney(dateStr, hotMoneySeats)
				if len(allTraders) > 0 {
					break
				}
				if attempt < 3 {
					log.Printf("[DragonTiger] Hot money grouping attempt %d returned no data, retrying...", attempt)
					time.Sleep(time.Duration(attempt*500) * time.Millisecond)
				}
			}
			break
		}
	}

	if allTraders == nil {
		allTraders = []gin.H{}
	}

	// Paginate
	total := len(allTraders)
	start := (page - 1) * pageSize
	end := start + pageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	pagedTraders := allTraders[start:end]

	response.Success(c, gin.H{
		"traders":     pagedTraders,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + pageSize - 1) / pageSize,
		"trade_date":  tradeDate,
	})
}

// fetchDragonTigerDetailsByDate checks if dragon-tiger data exists for a given date
func fetchDragonTigerDetailsByDate(date string) []map[string]interface{} {
	url := fmt.Sprintf(
		"https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=SECURITY_CODE&sortTypes=1&pageSize=5&pageNumber=1&reportName=RPT_DAILYBILLBOARD_DETAILSNEW&columns=SECURITY_CODE,SECURITY_NAME_ABBR&filter=(TRADE_DATE='%s')",
		date)

	data, err := fetchDatacenterAPIWithRetry(url, 3)
	if err != nil {
		return nil
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}

	success, _ := raw["success"].(bool)
	if !success {
		return nil
	}

	resultData, ok := raw["result"].(map[string]interface{})
	if !ok {
		return nil
	}

	dataArr, ok := resultData["data"].([]interface{})
	if !ok || len(dataArr) == 0 {
		return nil
	}

	results := []map[string]interface{}{}
	for _, item := range dataArr {
		if d, ok := item.(map[string]interface{}); ok {
			results = append(results, d)
		}
	}
	return results
}

// fetchAndGroupByHotMoney fetches seat-level trades and groups by hot money trader
func fetchAndGroupByHotMoney(date string, hotMoneySeats map[string]string) []gin.H {
	// Fetch seat-level data from RPT_OPERATEDEPT_TRADE
	allSeats := []map[string]interface{}{}
	for page := 1; page <= 5; page++ {
		url := fmt.Sprintf(
			"https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=BUY_AMT&sortTypes=-1&pageSize=200&pageNumber=%d&reportName=RPT_OPERATEDEPT_TRADE&columns=OPERATEDEPT_NAME,SECURITY_CODE,SECURITY_NAME_ABBR,BUY_AMT,SELL_AMT,NET,TRADE_DIRECTION,CHANGE_RATE,EXPLANATION&filter=(TRADE_DATE='%s')",
			page, date)

		data, err := fetchDatacenterAPIWithRetry(url, 3)
		if err != nil {
			break
		}

		var raw map[string]interface{}
		if err := json.Unmarshal(data, &raw); err != nil {
			break
		}

		success, _ := raw["success"].(bool)
		if !success {
			break
		}

		resultData, ok := raw["result"].(map[string]interface{})
		if !ok {
			break
		}

		dataArr, ok := resultData["data"].([]interface{})
		if !ok || len(dataArr) == 0 {
			break
		}

		for _, item := range dataArr {
			if d, ok := item.(map[string]interface{}); ok {
				allSeats = append(allSeats, d)
			}
		}
	}

	if len(allSeats) == 0 {
		return []gin.H{}
	}

	// Group by hot money trader name
	traderMap := make(map[string]*hotMoneyTrader)

	for _, seat := range allSeats {
		seatName := safeString(seat, "OPERATEDEPT_NAME")
		traderName := matchHotMoneyTrader(seatName, hotMoneySeats)
		if traderName == "" {
			continue // Not a known hot money seat
		}

		trader, exists := traderMap[traderName]
		if !exists {
			trader = &hotMoneyTrader{
				Name:   traderName,
				Trades: []gin.H{},
			}
			traderMap[traderName] = trader
		}

		// BUY_AMT and SELL_AMT are in 万元(ten-thousands), NET is in 元(yuan)
		// Convert all to 万元 for consistency
		buyAmt := safeFloat(seat, "BUY_AMT")   // 万元
		sellAmt := safeFloat(seat, "SELL_AMT")  // 万元
		netAmt := safeFloat(seat, "NET") / 10000 // 元 -> 万元

		trader.TotalBuy += buyAmt
		trader.TotalSell += sellAmt
		trader.TotalNet += netAmt

		trader.Trades = append(trader.Trades, gin.H{
			"seat":       seatName,
			"code":       safeString(seat, "SECURITY_CODE"),
			"name":       safeString(seat, "SECURITY_NAME_ABBR"),
			"buy_amt":    buyAmt,   // 万元
			"sell_amt":   sellAmt,  // 万元
			"net_amt":    netAmt,   // 万元
			"direction":  safeString(seat, "TRADE_DIRECTION"),
			"change_pct": safeFloat(seat, "CHANGE_RATE"),
			"reason":     safeString(seat, "EXPLANATION"),
		})
	}

	// Convert map to sorted slice (by total net amount desc)
	result := []gin.H{}
	for _, trader := range traderMap {
		result = append(result, gin.H{
			"trader_name": trader.Name,
			"total_buy":   math.Round(trader.TotalBuy*100) / 100,
			"total_sell":  math.Round(trader.TotalSell*100) / 100,
			"total_net":   math.Round(trader.TotalNet*100) / 100,
			"trade_count": len(trader.Trades),
			"trades":      trader.Trades,
		})
	}

	sort.Slice(result, func(i, j int) bool {
		netI, _ := result[i]["total_net"].(float64)
		netJ, _ := result[j]["total_net"].(float64)
		return math.Abs(netI) > math.Abs(netJ)
	})

	return result
}

type hotMoneyTrader struct {
	Name      string
	TotalBuy  float64
	TotalSell float64
	TotalNet  float64
	Trades    []gin.H
}

// matchHotMoneyTrader maps a broker seat name to the known hot money trader
func matchHotMoneyTrader(seatName string, seats map[string]string) string {
	for keyword, traderName := range seats {
		if strings.Contains(seatName, keyword) {
			return traderName
		}
	}
	return ""
}

// getHotMoneySeatsMap returns the mapping of well-known hot money trader seats
// Comprehensive list covering 20+ famous hot money traders (游资) active in A-share market
func getHotMoneySeatsMap() map[string]string {
	return map[string]string{
		// ========== 顶级游资 ==========
		// 赵老哥 - 8年一万倍传奇，A股最知名游资之一
		"华泰证券上海武定路":       "赵老哥",
		"华泰证券上海共和新路":      "赵老哥",
		// 陈晓群(孙哥) - 超级大户，擅长大资金运作
		"中信证券上海溧阳路":       "陈晓群(孙哥)",
		"中信证券杭州四季路":       "陈晓群(孙哥)",
		// 炒股养家 - 游资教父级人物
		"国信证券深圳泰然九路":      "炒股养家",
		"国信证券泰然九路":        "炒股养家",
		// 桑田路 - 知名一线游资
		"申万宏源上海桑田路":       "桑田路",
		"申万宏源桑田路":         "桑田路",
		// 作手新一 - 涨停板战法代表
		"国泰海通上海江苏路":       "作手新一",
		"国泰君安上海江苏路":       "作手新一",
		"国泰海通证券上海江苏路":     "作手新一",
		// 章盟主 - 杭州系游资代表
		"中信证券杭州延安路":       "章盟主",
		"中信建投杭州延安路":       "章盟主",
		"中信证券股份有限公司杭州延安路": "章盟主",
		// 方新侠 - 上海系知名游资
		"华鑫证券上海茅台路":       "方新侠",
		"中信证券上海嘉里中心":      "方新侠",
		"华鑫证券上海分公司":       "方新侠",
		// 佛山无影脚 - 深圳系游资代表
		"国泰海通深圳益田路":       "佛山无影脚",
		"国泰君安深圳益田路":       "佛山无影脚",
		"国泰海通证券深圳益田路":     "佛山无影脚",

		// ========== 知名团队/帮派 ==========
		// 成都帮(成都系) - 西南游资团体
		"华西证券成都高新":        "成都帮",
		"国盛证券成都二环路":       "成都帮",
		"华鑫证券成都二环路":       "成都帮",
		"中信证券成都交子大道":      "成都帮",
		"华西证券成都":          "成都帮",
		"国金证券成都":          "成都帮",
		// 拉萨帮(小鳄鱼) - 东方财富系拉萨席位
		"东方财富拉萨团结路":       "拉萨帮",
		"东方财富拉萨东环路":       "拉萨帮",
		"东方财富拉萨东环路第二":     "拉萨帮",
		"东方财富拉萨金融城南环路":    "拉萨帮",
		"东方财富拉萨金珠西路":      "拉萨帮",
		"东方财富证券拉萨":        "拉萨帮",
		// 武汉帮
		"国泰海通武汉紫阳东路":      "武汉帮",
		"国泰君安武汉紫阳东路":      "武汉帮",
		// 南京帮
		"华泰证券南京中华路":       "南京帮",
		"华泰证券股份有限公司南京中华路": "南京帮",
		// 绍兴帮 - 浙江系
		"中国银河绍兴":          "绍兴帮",
		"财通证券绍兴":          "绍兴帮",

		// ========== 其他著名游资 ==========
		// 欢乐海岸 - 深圳知名游资
		"华泰证券深圳益田路荣超商务":   "欢乐海岸",
		"招商证券深圳蛇口":        "欢乐海岸",
		"华泰证券深圳益田路":       "欢乐海岸",
		// 金田路 - 深圳游资
		"中信建投深圳金田路":       "金田路",
		"中信建投证券深圳金田路":     "金田路",
		// 涅槃重生 - 上海知名游资
		"华泰证券上海奉贤区碧秀路":    "涅槃重生",
		"华泰证券上海碧秀路":       "涅槃重生",
		// 小沈阳(锦州帮)
		"华泰证券锦州":          "小沈阳",
		"华泰证券股份有限公司锦州解放路": "小沈阳",
		// 职业炒手
		"中信建投北京朝阳门北大街":    "职业炒手",
		"中信建投证券北京朝阳门":     "职业炒手",
		// 深圳帮/瑞银
		"瑞银证券上海花园石桥路":     "深圳帮(瑞银)",
		// 上海帮
		"光大证券上海番禺路":       "上海帮",
		"光大证券股份有限公司上海番禺路": "上海帮",
		// 北京帮
		"中信证券北京总部":        "北京帮",
		"中信建投北京三里河路":      "北京帮",
		// 温州帮
		"华鑫证券温州":          "温州帮",
		"中银国际温州":          "温州帮",
		"银河证券温州":          "温州帮",
		// 宁波桶 - 宁波解放南路系
		"银河证券宁波解放南路":      "宁波桶",
		"华鑫证券宁波":          "宁波桶",
		// 著名散户/自然人
		"自然人":             "自然人",

		// ========== 机构/北向资金 ==========
		"沪股通专用":           "沪股通",
		"深股通专用":           "深股通",
		"机构专用":            "机构",
	}
}

// GetSectorFundFlow returns sector fund flow with actual amounts
func (h *Handler) GetSectorFundFlow(c *gin.Context) {
	category := c.DefaultQuery("category", "sector")

	var fs string
	if category == "concept" {
		fs = "m:90+t:3"
	} else {
		fs = "m:90+t:2"
	}
	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f62&fs=%s&fields=f2,f3,f12,f14,f62,f66,f69,f72,f75,f184,f204,f205", fs)

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		response.InternalError(c, "获取板块资金流数据失败: "+err.Error())
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		response.InternalError(c, "解析数据失败")
		return
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		response.Success(c, []interface{}{})
		return
	}
	diffArr, ok := resultData["diff"].([]interface{})
	if !ok {
		response.Success(c, []interface{}{})
		return
	}

	flows := []gin.H{}
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		flows = append(flows, gin.H{
			"name":       safeString(d, "f14"),
			"code":       safeString(d, "f12"),
			"change_pct": safeFloat(d, "f3"),
			"net_flow":   safeFloat(d, "f62") / 10000,
			"flow_in":    safeFloat(d, "f66") / 10000,
			"flow_out":   safeFloat(d, "f72") / 10000,
			"net_pct":    safeFloat(d, "f184"),
			"lead_stock": safeString(d, "f204"),
		})
	}

	response.Success(c, gin.H{
		"flows":    flows,
		"category": category,
	})
}

// GetRealDashboardData returns complete real-time dashboard data from Eastmoney
func (h *Handler) GetRealDashboardData(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	forceRefresh := c.DefaultQuery("refresh", "false") == "true"

	today := time.Now().Format("2006-01-02")
	if forceRefresh || date == today {
		go fetchAllMarketData(date)
	}

	h.GetDashboardEnhanced(c)
}

// ==================== Helper Functions ====================

func buildSecID(code string) string {
	if strings.HasPrefix(code, "6") {
		return "1." + code
	}
	return "0." + code
}

// fetchEastmoneyAPI fetches data from Eastmoney push APIs with redirect support
func fetchEastmoneyAPI(url string) ([]byte, error) {
	client := &http.Client{
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			// Follow redirects (push2 -> push2delay)
			return nil
		},
	}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://quote.eastmoney.com")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if len(body) == 0 {
		return nil, fmt.Errorf("empty response from %s", url)
	}

	return body, nil
}

// fetchEastmoneyAPIWithRetry fetches with retry support
func fetchEastmoneyAPIWithRetry(url string, maxRetries int) ([]byte, error) {
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		data, err := fetchEastmoneyAPI(url)
		if err == nil && len(data) > 0 {
			return data, nil
		}
		lastErr = err
		if lastErr == nil {
			lastErr = fmt.Errorf("empty response")
		}
		if attempt < maxRetries {
			log.Printf("[EastmoneyAPI] Attempt %d failed: %v, retrying in %dms...", attempt, lastErr, attempt*500)
			time.Sleep(time.Duration(attempt*500) * time.Millisecond)
		}
	}
	return nil, fmt.Errorf("failed after %d retries: %v", maxRetries, lastErr)
}

// fetchDatacenterAPI fetches data from Eastmoney datacenter API (different headers)
func fetchDatacenterAPI(url string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
	req.Header.Set("Referer", "https://data.eastmoney.com/stock/tradedetail.html")

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	return io.ReadAll(resp.Body)
}

// fetchDatacenterAPIWithRetry fetches datacenter API with retry
func fetchDatacenterAPIWithRetry(url string, maxRetries int) ([]byte, error) {
	var lastErr error
	for attempt := 1; attempt <= maxRetries; attempt++ {
		data, err := fetchDatacenterAPI(url)
		if err == nil && len(data) > 0 {
			return data, nil
		}
		lastErr = err
		if lastErr == nil {
			lastErr = fmt.Errorf("empty response")
		}
		if attempt < maxRetries {
			log.Printf("[DatacenterAPI] Attempt %d failed: %v, retrying...", attempt, lastErr)
			time.Sleep(time.Duration(attempt*500) * time.Millisecond)
		}
	}
	return nil, fmt.Errorf("datacenter API failed after %d retries: %v", maxRetries, lastErr)
}

// fetchBatchQuotes fetches multiple stock quotes from Eastmoney
func fetchBatchQuotes(codes []string) map[string]*model.StockQuote {
	result := make(map[string]*model.StockQuote)

	secids := []string{}
	for _, code := range codes {
		secids = append(secids, buildSecID(code))
	}

	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/ulist.np/get?secids=%s&fields=f2,f3,f4,f5,f6,f7,f12,f14,f15,f16,f17,f18,f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117",
		strings.Join(secids, ","))

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		log.Printf("[BatchQuote] fetch error: %v", err)
		for _, code := range codes {
			result[code] = &model.StockQuote{Code: code, Name: "获取中"}
		}
		return result
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		for _, code := range codes {
			result[code] = &model.StockQuote{Code: code, Name: "获取中"}
		}
		return result
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		for _, code := range codes {
			result[code] = &model.StockQuote{Code: code, Name: "获取中"}
		}
		return result
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok {
		for _, code := range codes {
			result[code] = &model.StockQuote{Code: code, Name: "获取中"}
		}
		return result
	}

	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		code := safeString(d, "f12")
		price := safeFloat(d, "f2")
		preClose := safeFloat(d, "f18")
		if price > 1000 {
			price /= 100
		}
		if preClose > 1000 {
			preClose /= 100
		}
		high := safeFloat(d, "f15")
		low := safeFloat(d, "f16")
		open := safeFloat(d, "f17")
		if high > 1000 {
			high /= 100
		}
		if low > 1000 {
			low /= 100
		}
		if open > 1000 {
			open /= 100
		}

		change := price - preClose
		changePct := 0.0
		if preClose > 0 {
			changePct = (change / preClose) * 100
		}

		result[code] = &model.StockQuote{
			Code:      code,
			Name:      safeString(d, "f14"),
			Price:     price,
			Change:    change,
			ChangePct: changePct,
			High:      high,
			Low:       low,
			Open:      open,
			PreClose:  preClose,
			Volume:    safeFloat(d, "f47"),
			Amount:    safeFloat(d, "f48"),
		}
	}

	for _, code := range codes {
		if _, exists := result[code]; !exists {
			result[code] = &model.StockQuote{Code: code, Name: "获取中"}
		}
	}

	return result
}

// fetch5DayClose fetches recent 5 trading day close prices
func fetch5DayClose(code string) []gin.H {
	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2his.eastmoney.com/api/qt/stock/kline/get?secid=%s&fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&end=20500101&lmt=5", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		return []gin.H{}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return []gin.H{}
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		return []gin.H{}
	}

	klines := []gin.H{}
	if klinesRaw, ok := resultData["klines"].([]interface{}); ok {
		for _, k := range klinesRaw {
			if kStr, ok := k.(string); ok {
				parts := strings.Split(kStr, ",")
				if len(parts) >= 6 {
					close, _ := strconv.ParseFloat(parts[2], 64)
					klines = append(klines, gin.H{
						"date":  parts[0],
						"close": close,
					})
				}
			}
		}
	}

	return klines
}

// fetchFundFlowSummary fetches today's fund flow summary for a stock
func fetchFundFlowSummary(code string) gin.H {
	secid := buildSecID(code)
	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/stock/fflow/kline/get?secid=%s&fields1=f1,f2,f3,f7&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65&klt=101&lmt=1", secid)

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		return gin.H{"main_net": 0, "retail_net": 0}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return gin.H{"main_net": 0, "retail_net": 0}
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		return gin.H{"main_net": 0, "retail_net": 0}
	}

	if klinesRaw, ok := resultData["klines"].([]interface{}); ok && len(klinesRaw) > 0 {
		if kStr, ok := klinesRaw[len(klinesRaw)-1].(string); ok {
			parts := strings.Split(kStr, ",")
			if len(parts) >= 6 {
				mainNet, _ := strconv.ParseFloat(parts[1], 64)
				retailNet, _ := strconv.ParseFloat(parts[5], 64)
				return gin.H{
					"main_net":   mainNet / 10000,
					"retail_net": retailNet / 10000,
				}
			}
		}
	}

	return gin.H{"main_net": 0, "retail_net": 0}
}

func ifStr(a, b string) string {
	if a != "" && a != "获取中" {
		return a
	}
	return b
}
