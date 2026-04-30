package handler

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sort"
	"strconv"
	"strings"
	"time"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// GetDashboardOverview returns comprehensive market overview data for the dashboard:
// - Major index quotes (上证/深证/创业板)
// - Detailed rise/fall distribution (涨停, 涨停~5%, 5%~1%, 1%~0%, 平, 0~-1%, -1%~-5%, -5%~跌停, 跌停)
// - Sentiment score with 5-day history
// - Total market turnover (万亿元)
// - Limit up/down/broken stats
// - Board ladder (连板天梯)
// - Concept heat (热力概念)
// - Limit stocks (当日涨跌停个股)
//
// Data source priority: Tushare > Eastmoney > Tonghuashun
func (h *Handler) GetDashboardOverview(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"

	// 1. Fetch major indices from Eastmoney (real-time, always fast)
	indices := fetchMajorIndices()

	// 2. Ensure we have limit list data in DB (涨停/跌停/炸板)
	ensureLimitListData(tradeDate, refresh)

	// 3. Get limit counts from DB
	var upLimitCount, downLimitCount, brokenCount int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&upLimitCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'D'", tradeDate).Count(&downLimitCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'Z'", tradeDate).Count(&brokenCount)

	// 4. Get total market amount (成交额 - 万亿元 unit)
	// Priority: Tushare moneyflow (total_amount from daily) > Eastmoney index f6
	totalAmountWanYi := fetchTotalAmountFromTushare(tradeDate)
	if totalAmountWanYi <= 0 {
		// Fallback: compute from Eastmoney index amounts (上证+深证)
		totalAmountWanYi = fetchTotalAmountWanYi()
	}
	if totalAmountWanYi <= 0 {
		// Last fallback
		totalAmountYi := fetchMarketTotalAmount() // returns 亿元
		totalAmountWanYi = totalAmountYi / 10000  // convert to 万亿
	}

	// 5. Rise/Fall distribution
	// Priority: Eastmoney real-time (most comprehensive for distribution)
	distribution := fetchRiseFallDistribution()
	// If Eastmoney fails, try computing from limit data
	if isDistributionEmpty(distribution) {
		distribution = computeDistributionFromTushare(tradeDate)
	}

	// 6. Board ladder (连板天梯) - Tushare limit_step
	if refresh {
		fetchAndSaveLimitStep(tradeDate)
	}
	ladderData := fetchBoardLadderFromDB(tradeDate)

	// 7. Get highest board
	highestBoard := 0
	if ladderData != nil && len(ladderData) > 0 {
		for _, level := range ladderData {
			if lv, ok := level["level"].(int); ok && lv > highestBoard {
				highestBoard = lv
			}
		}
	}
	if highestBoard == 0 {
		var maxItem TsLimitList
		if err := repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
			Order("limit_times DESC").First(&maxItem).Error; err == nil {
			highestBoard = maxItem.LimitTimes
		}
	}

	// 8. Up/Down/Flat counts - Eastmoney real-time
	upCount, downCount, flatCount := fetchUpDownFromIndices()
	if upCount == 0 && downCount == 0 {
		// Try from distribution
		for _, d := range distribution {
			v := 0
			if val, ok := d["value"].(int); ok {
				v = val
			}
			label := ""
			if l, ok := d["label"].(string); ok {
				label = l
			}
			if strings.Contains(label, "涨") && !strings.Contains(label, "跌") {
				upCount += v
			} else if strings.Contains(label, "跌") {
				downCount += v
			} else if label == "平盘" {
				flatCount += v
			}
		}
	}

	// 9. Sentiment score computation
	sentimentScore := computeSentimentScore(upCount, downCount, flatCount, int(upLimitCount), int(downLimitCount), int(brokenCount), highestBoard, totalAmountWanYi)

	// 10. Seal ratio: 封板比 = limit_up / (limit_up + broken)
	sealRatio := "---"
	if upLimitCount+brokenCount > 0 {
		sealRatio = strconv.FormatInt(upLimitCount, 10) + ":" + strconv.FormatInt(brokenCount, 10)
	}

	// Broken rate
	brokenRate := 0.0
	if upLimitCount+brokenCount > 0 {
		brokenRate = float64(brokenCount) / float64(upLimitCount+brokenCount) * 100
	}

	// 11. 5-day sentiment history
	sentimentHistory := fetchSentimentHistory(5)

	// 12. Limit stocks for current day (当日涨跌停个股)
	limitStocks := fetchLimitStocksFromDB(tradeDate)

	// 13. Concept heat (热力概念) - Tushare ths_daily > Eastmoney
	conceptHeat := fetchConceptHeatTushare(tradeDate)
	if len(conceptHeat) == 0 {
		conceptHeat = fetchConceptHeatEastmoney()
	}

	// 14. Save/update MarketSentiment in DB for history tracking
	saveSentimentToDB(tradeDate, sentimentScore, int(upLimitCount), int(downLimitCount), int(brokenCount), highestBoard, totalAmountWanYi, upCount, downCount, flatCount)

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"indices":    indices,
		"distribution": distribution,
		"up_count":   upCount,
		"down_count": downCount,
		"flat_count": flatCount,
		"total_amount": totalAmountWanYi, // 万亿元
		"sentiment": gin.H{
			"score":        sentimentScore,
			"label":        getSentimentLabel(sentimentScore),
			"limit_up":     upLimitCount,
			"limit_down":   downLimitCount,
			"broken":       brokenCount,
			"broken_rate":  math.Round(brokenRate*10) / 10,
			"highest_board": highestBoard,
			"seal_ratio":   sealRatio,
		},
		"sentiment_history": sentimentHistory,
		"board_ladder":      ladderData,
		"limit_stocks":      limitStocks,
		"concept_heat":      conceptHeat,
	})
}

// ==================== 1. 成交额 (Tushare daily_basic - doc 345) ====================

// fetchTotalAmountFromTushare fetches total market turnover from Tushare daily_basic API
// Uses index daily data (000001.SH + 399001.SZ) to get total market amount
// Returns value in 万亿元. Retries up to 3 times.
func fetchTotalAmountFromTushare(tradeDate string) float64 {
	for attempt := 0; attempt < 3; attempt++ {
		if attempt > 0 {
			time.Sleep(time.Duration(500*(attempt+1)) * time.Millisecond)
		}

		// Use index_dailybasic to get total market turnover (total_mv covers all A-shares)
		// Alternative: use daily API with ts_code for index to get amount field
		resp, err := callTushareAPI("daily", map[string]string{
			"trade_date": tradeDate,
			"ts_code":    "000001.SH",
		}, "ts_code,trade_date,amount")
		if err != nil {
			log.Printf("[DashboardOverview] Tushare daily (SH index) attempt %d error: %v", attempt+1, err)
			continue
		}

		rows := tushareDataToMap(resp)
		shAmount := 0.0
		if len(rows) > 0 {
			// amount is in 千元 (thousands of yuan)
			shAmount = tsFloat(rows[0], "amount") * 1000 // convert to yuan
		}

		// Also get Shenzhen
		time.Sleep(300 * time.Millisecond)
		resp2, err := callTushareAPI("daily", map[string]string{
			"trade_date": tradeDate,
			"ts_code":    "399001.SZ",
		}, "ts_code,trade_date,amount")
		if err != nil {
			log.Printf("[DashboardOverview] Tushare daily (SZ index) attempt %d error: %v", attempt+1, err)
			if shAmount > 0 {
				// At least have SH data, estimate total as SH * 2 (rough)
				return shAmount * 2 / 1e12
			}
			continue
		}

		szAmount := 0.0
		rows2 := tushareDataToMap(resp2)
		if len(rows2) > 0 {
			szAmount = tsFloat(rows2[0], "amount") * 1000
		}

		totalAmount := shAmount + szAmount
		if totalAmount > 0 {
			result := totalAmount / 1e12 // Convert to 万亿
			log.Printf("[DashboardOverview] Tushare total amount: %.4f 万亿 (SH=%.0f, SZ=%.0f)", result, shAmount, szAmount)
			return result
		}
	}

	return 0 // All 3 attempts failed, caller will use Eastmoney fallback
}

// ==================== 2. Major Indices (东方财富实时) ====================

// fetchMajorIndices fetches 上证指数, 深证成指, 创业板指 real-time quotes
func fetchMajorIndices() []gin.H {
	url := "https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001,0.399006&fields=f2,f3,f4,f6,f12,f14"

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		log.Printf("[DashboardOverview] fetchMajorIndices error: %v", err)
		return []gin.H{}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return []gin.H{}
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return []gin.H{}
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok {
		return []gin.H{}
	}

	indices := []gin.H{}
	totalMarketAmount := 0.0

	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		price := safeFloat(d, "f2") / 100   // Price is in cents
		change := safeFloat(d, "f4") / 100  // Change in cents
		changePct := safeFloat(d, "f3") / 100 // Change percent * 100
		amount := safeFloat(d, "f6")         // Turnover in yuan
		code := ""
		name := ""
		if v, ok := d["f12"].(string); ok {
			code = v
		}
		if v, ok := d["f14"].(string); ok {
			name = v
		}

		// Handle cases where Eastmoney returns raw numbers without division
		if price > 100000 {
			price = safeFloat(d, "f2")
			change = safeFloat(d, "f4")
			changePct = safeFloat(d, "f3")
		}

		amountYi := amount / 100000000 // 亿元
		totalMarketAmount += amount

		indices = append(indices, gin.H{
			"code":       code,
			"name":       name,
			"price":      price,
			"change":     change,
			"change_pct": changePct,
			"amount":     math.Round(amountYi*100) / 100, // 亿元
		})
	}

	// Store the total amount on the first index for reference
	if len(indices) > 0 {
		indices[0]["total_market_amount_wanyi"] = math.Round(totalMarketAmount/1e12*10000) / 10000
	}

	return indices
}

// ==================== 3. 涨跌分布 (Eastmoney real-time + Tushare fallback) ====================

// fetchRiseFallDistribution fetches the detailed distribution of rises and falls
// Returns: 涨停, 涨停~5%, 5%~1%, 1%~0%, 平盘, 0~-1%, -1%~-5%, -5%~跌停, 跌停
func fetchRiseFallDistribution() []gin.H {
	// Eastmoney provides rise/fall distribution via market overview
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3"

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		log.Printf("[DashboardOverview] fetchRiseFallDistribution error: %v", err)
		return defaultDistribution()
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return defaultDistribution()
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return defaultDistribution()
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok || len(diffArr) == 0 {
		return defaultDistribution()
	}

	// Count by range
	limitUp := 0    // >= 9.5%
	up5 := 0        // 5% ~ limit
	up1to5 := 0     // 1% ~ 5%
	up0to1 := 0     // 0% ~ 1%
	flat := 0       // 0%
	down0to1 := 0   // -1% ~ 0%
	down1to5 := 0   // -5% ~ -1%
	down5 := 0      // limit ~ -5%
	limitDown := 0  // <= -9.5%

	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		pct := safeFloat(d, "f3")

		switch {
		case pct >= 9.5:
			limitUp++
		case pct >= 5:
			up5++
		case pct >= 1:
			up1to5++
		case pct > 0:
			up0to1++
		case pct == 0:
			flat++
		case pct > -1:
			down0to1++
		case pct > -5:
			down1to5++
		case pct > -9.5:
			down5++
		default:
			limitDown++
		}
	}

	return []gin.H{
		{"label": "涨停", "value": limitUp, "color": "#DC2626"},
		{"label": "涨停~5%", "value": up5, "color": "#EF4444"},
		{"label": "5%~1%", "value": up1to5, "color": "#F87171"},
		{"label": "1%~0%", "value": up0to1, "color": "#FCA5A5"},
		{"label": "平盘", "value": flat, "color": "#D1D5DB"},
		{"label": "0%~-1%", "value": down0to1, "color": "#86EFAC"},
		{"label": "-1%~-5%", "value": down1to5, "color": "#4ADE80"},
		{"label": "-5%~跌停", "value": down5, "color": "#22C55E"},
		{"label": "跌停", "value": limitDown, "color": "#16A34A"},
	}
}

func isDistributionEmpty(dist []gin.H) bool {
	for _, d := range dist {
		if v, ok := d["value"].(int); ok && v > 0 {
			return false
		}
	}
	return true
}

// computeDistributionFromTushare computes distribution from limit_list data in DB
func computeDistributionFromTushare(tradeDate string) []gin.H {
	var upCount, downCount, brokenCount int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&upCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'D'", tradeDate).Count(&downCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'Z'", tradeDate).Count(&brokenCount)

	if upCount == 0 && downCount == 0 {
		return defaultDistribution()
	}

	// We only have exact limit_up/down/broken from Tushare, estimate rest
	return []gin.H{
		{"label": "涨停", "value": int(upCount), "color": "#DC2626"},
		{"label": "涨停~5%", "value": 0, "color": "#EF4444"},
		{"label": "5%~1%", "value": 0, "color": "#F87171"},
		{"label": "1%~0%", "value": 0, "color": "#FCA5A5"},
		{"label": "平盘", "value": 0, "color": "#D1D5DB"},
		{"label": "0%~-1%", "value": 0, "color": "#86EFAC"},
		{"label": "-1%~-5%", "value": 0, "color": "#4ADE80"},
		{"label": "-5%~跌停", "value": 0, "color": "#22C55E"},
		{"label": "跌停", "value": int(downCount), "color": "#16A34A"},
	}
}

func defaultDistribution() []gin.H {
	return []gin.H{
		{"label": "涨停", "value": 0, "color": "#DC2626"},
		{"label": "涨停~5%", "value": 0, "color": "#EF4444"},
		{"label": "5%~1%", "value": 0, "color": "#F87171"},
		{"label": "1%~0%", "value": 0, "color": "#FCA5A5"},
		{"label": "平盘", "value": 0, "color": "#D1D5DB"},
		{"label": "0%~-1%", "value": 0, "color": "#86EFAC"},
		{"label": "-1%~-5%", "value": 0, "color": "#4ADE80"},
		{"label": "-5%~跌停", "value": 0, "color": "#22C55E"},
		{"label": "跌停", "value": 0, "color": "#16A34A"},
	}
}

// ==================== 4. 连板天梯 (Tushare limit_step - doc 356) ====================

// fetchBoardLadderFromDB retrieves the board ladder data from DB
func fetchBoardLadderFromDB(tradeDate string) []gin.H {
	var steps []TsLimitStep
	repository.DB.Where("trade_date = ?", tradeDate).Order("CAST(nums AS INTEGER) DESC").Find(&steps)

	if len(steps) == 0 {
		// Try fetching from Tushare
		if fetchAndSaveLimitStep(tradeDate) {
			repository.DB.Where("trade_date = ?", tradeDate).Order("CAST(nums AS INTEGER) DESC").Find(&steps)
		}
	}

	if len(steps) == 0 {
		// Fallback: build ladder from limit_list data (limit_times >= 2)
		return fetchBoardLadderFromLimitList(tradeDate)
	}

	// Group by board level
	ladderMap := make(map[int][]gin.H)
	for _, s := range steps {
		level, _ := strconv.Atoi(s.Nums)
		if level < 2 {
			continue
		}
		ladderMap[level] = append(ladderMap[level], gin.H{
			"code": tsCodeToCode(s.TsCode),
			"name": s.Name,
		})
	}

	// Sort levels descending
	levels := make([]int, 0, len(ladderMap))
	for k := range ladderMap {
		levels = append(levels, k)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(levels)))

	result := make([]gin.H, 0, len(levels))
	for _, level := range levels {
		stocks := ladderMap[level]
		result = append(result, gin.H{
			"level":  level,
			"count":  len(stocks),
			"stocks": stocks,
		})
	}

	return result
}

// fetchBoardLadderFromLimitList builds a ladder from limit_list data
func fetchBoardLadderFromLimitList(tradeDate string) []gin.H {
	var items []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'U' AND limit_times >= 2", tradeDate).
		Order("limit_times DESC").Find(&items)

	if len(items) == 0 {
		return []gin.H{}
	}

	ladderMap := make(map[int][]gin.H)
	for _, item := range items {
		level := item.LimitTimes
		if level < 2 {
			continue
		}
		ladderMap[level] = append(ladderMap[level], gin.H{
			"code": tsCodeToCode(item.TsCode),
			"name": item.Name,
		})
	}

	levels := make([]int, 0, len(ladderMap))
	for k := range ladderMap {
		levels = append(levels, k)
	}
	sort.Sort(sort.Reverse(sort.IntSlice(levels)))

	result := make([]gin.H, 0, len(levels))
	for _, level := range levels {
		stocks := ladderMap[level]
		result = append(result, gin.H{
			"level":  level,
			"count":  len(stocks),
			"stocks": stocks,
		})
	}

	return result
}

// ==================== 5. 当日涨跌停个股 ====================

// fetchLimitStocksFromDB retrieves limit up/down stocks from DB
func fetchLimitStocksFromDB(tradeDate string) gin.H {
	var upItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
		Order("limit_times DESC, pct_chg DESC").Limit(50).Find(&upItems)

	var downItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'D'", tradeDate).
		Order("pct_chg ASC").Limit(50).Find(&downItems)

	var brokenItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'Z'", tradeDate).
		Order("pct_chg DESC").Limit(30).Find(&brokenItems)

	toList := func(items []TsLimitList) []gin.H {
		result := make([]gin.H, 0, len(items))
		for _, item := range items {
			result = append(result, gin.H{
				"code":           tsCodeToCode(item.TsCode),
				"name":           item.Name,
				"close":          item.Close,
				"pct_chg":        item.PctChg,
				"amount":         item.Amount,
				"turnover_ratio": item.TurnoverRatio,
				"limit_times":    item.LimitTimes,
				"first_time":     item.FirstTime,
				"last_time":      item.LastTime,
				"open_times":     item.OpenTimes,
				"tag":            item.Tag,
				"status":         item.Status,
				"industry":       item.Industry,
			})
		}
		return result
	}

	return gin.H{
		"up_stocks":     toList(upItems),
		"down_stocks":   toList(downItems),
		"broken_stocks": toList(brokenItems),
		"limit_up":      len(upItems),
		"limit_down":    len(downItems),
		"broken":        len(brokenItems),
	}
}

// ==================== 6. 热力概念 (Tushare ths_daily - doc 377) ====================

// fetchConceptHeatTushare fetches concept heat data from Tushare ths_daily
func fetchConceptHeatTushare(tradeDate string) []gin.H {
	// ths_daily: 同花顺概念和行业指数行情
	resp, err := callTushareAPI("ths_daily", map[string]string{
		"trade_date": tradeDate,
	}, "ts_code,name,trade_date,close,open,high,low,pct_change,vol,turnover_rate")
	if err != nil {
		log.Printf("[DashboardOverview] ths_daily error: %v", err)
		return nil
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return nil
	}

	// Filter for concept indices (ts_code starts with certain patterns for concepts)
	concepts := make([]gin.H, 0, 50)
	for _, row := range rows {
		name := tsString(row, "name")
		tsCode := tsString(row, "ts_code")
		pctChange := tsFloat(row, "pct_change")
		vol := tsFloat(row, "vol")

		if name == "" {
			continue
		}

		concepts = append(concepts, gin.H{
			"code":       tsCode,
			"name":       name,
			"change_pct": pctChange,
			"volume":     vol,
		})
	}

	// Sort by absolute change descending (most volatile first)
	sort.Slice(concepts, func(i, j int) bool {
		ci := concepts[i]["change_pct"].(float64)
		cj := concepts[j]["change_pct"].(float64)
		return math.Abs(ci) > math.Abs(cj)
	})

	// Return top 50
	if len(concepts) > 50 {
		concepts = concepts[:50]
	}

	return concepts
}

// fetchConceptHeatEastmoney fetches concept heat from Eastmoney as fallback
func fetchConceptHeatEastmoney() []gin.H {
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f4,f12,f14"

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
	if err != nil {
		log.Printf("[DashboardOverview] concept heat Eastmoney error: %v", err)
		return []gin.H{}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		return []gin.H{}
	}

	dataObj, ok := raw["data"].(map[string]interface{})
	if !ok {
		return []gin.H{}
	}

	diffArr, ok := dataObj["diff"].([]interface{})
	if !ok {
		return []gin.H{}
	}

	concepts := make([]gin.H, 0, len(diffArr))
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		name := ""
		code := ""
		if v, ok := d["f14"].(string); ok {
			name = v
		}
		if v, ok := d["f12"].(string); ok {
			code = v
		}
		changePct := safeFloat(d, "f3")

		concepts = append(concepts, gin.H{
			"code":       code,
			"name":       name,
			"change_pct": changePct,
		})
	}

	return concepts
}

// ==================== 7. 情绪分计算 ====================

// computeSentimentScore computes a comprehensive market sentiment score
// Uses multiple factors: up/down ratio, limit counts, board height, volume
func computeSentimentScore(upCount, downCount, flatCount, limitUp, limitDown, broken, highestBoard int, totalAmountWanYi float64) float64 {
	score := 50.0

	// Factor 1: Up/Down ratio (max ±20 points)
	total := upCount + downCount + flatCount
	if total > 0 {
		upRatio := float64(upCount) / float64(total)
		score += (upRatio - 0.5) * 40 // -20 to +20
	}

	// Factor 2: Limit up vs down (max ±15 points)
	if limitUp+limitDown > 0 {
		limitRatio := float64(limitUp) / float64(limitUp+limitDown)
		score += (limitRatio - 0.5) * 30 // -15 to +15
	}

	// Factor 3: Broken rate penalty (max -10 points)
	if limitUp+broken > 0 {
		brokenRate := float64(broken) / float64(limitUp+broken)
		score -= brokenRate * 10
	}

	// Factor 4: Highest board bonus (max +10 points)
	if highestBoard >= 3 {
		score += math.Min(float64(highestBoard-2)*2, 10)
	}

	// Factor 5: Volume factor (bonus for high volume, max ±5)
	if totalAmountWanYi > 0 {
		// Average market volume ~1万亿, above average is positive
		if totalAmountWanYi > 1.2 {
			score += math.Min((totalAmountWanYi-1.2)*5, 5)
		} else if totalAmountWanYi < 0.8 {
			score -= math.Min((0.8-totalAmountWanYi)*5, 5)
		}
	}

	// Clamp to 0-100
	if score < 0 {
		score = 0
	}
	if score > 100 {
		score = 100
	}

	return math.Round(score*10) / 10
}

func getSentimentLabel(score float64) string {
	switch {
	case score >= 80:
		return "过热"
	case score >= 60:
		return "偏热"
	case score >= 40:
		return "正常"
	case score >= 20:
		return "偏冷"
	default:
		return "冰点"
	}
}

// ==================== 8. Sentiment Persistence ====================

func saveSentimentToDB(tradeDate string, score float64, limitUp, limitDown, broken, highestBoard int, totalAmount float64, upCount, downCount, flatCount int) {
	displayDate := formatTradeDateForDisplay(tradeDate)

	sentiment := model.MarketSentiment{
		Score:          score,
		LimitUpCount:   limitUp,
		LimitDownCount: limitDown,
		BrokenCount:    broken,
		HighestBoard:   highestBoard,
		TotalAmount:    totalAmount,
		UpCount:        upCount,
		DownCount:      downCount,
		FlatCount:      flatCount,
		TradeDate:      displayDate,
	}

	var existing model.MarketSentiment
	if err := repository.DB.Where("trade_date = ?", displayDate).First(&existing).Error; err == nil {
		// Update existing
		repository.DB.Model(&existing).Updates(map[string]interface{}{
			"score":            score,
			"limit_up_count":   limitUp,
			"limit_down_count": limitDown,
			"broken_count":     broken,
			"highest_board":    highestBoard,
			"total_amount":     totalAmount,
			"up_count":         upCount,
			"down_count":       downCount,
			"flat_count":       flatCount,
		})
	} else {
		repository.DB.Create(&sentiment)
	}
}

func fetchSentimentFromDB(tradeDate string) (float64, int, int, int, float64) {
	displayDate := formatTradeDateForDisplay(tradeDate)
	var sentiment model.MarketSentiment
	if err := repository.DB.Where("trade_date = ?", displayDate).First(&sentiment).Error; err == nil {
		return sentiment.Score, sentiment.UpCount, sentiment.DownCount, sentiment.FlatCount, sentiment.TotalAmount
	}

	// Fallback: compute from Eastmoney real-time
	upCount, downCount, flatCount := fetchUpDownFromIndices()
	totalAmount := fetchMarketTotalAmount()

	// Compute simple score
	total := upCount + downCount + flatCount
	score := 50.0
	if total > 0 {
		score = float64(upCount) / float64(total) * 100
		if score > 100 {
			score = 100
		}
	}

	return score, upCount, downCount, flatCount, totalAmount
}

func fetchSentimentHistory(days int) []gin.H {
	var sentiments []model.MarketSentiment
	repository.DB.Order("trade_date DESC").Limit(days).Find(&sentiments)

	history := []gin.H{}
	// Reverse to get chronological order
	for i := len(sentiments) - 1; i >= 0; i-- {
		s := sentiments[i]
		history = append(history, gin.H{
			"trade_date":      s.TradeDate,
			"score":           s.Score,
			"limit_up_count":  s.LimitUpCount,
			"limit_down_count": s.LimitDownCount,
			"broken_count":    s.BrokenCount,
			"total_amount":    s.TotalAmount,
			"up_count":        s.UpCount,
			"down_count":      s.DownCount,
		})
	}

	return history
}

// ==================== Helper: Compute total amount from Eastmoney indices ====================

// fetchTotalAmountWanYi gets total market amount in 万亿 from Eastmoney
// This sums the turnover from all 3 major indices
func fetchTotalAmountWanYi() float64 {
	url := "https://push2.eastmoney.com/api/qt/ulist.np/get?secids=1.000001,0.399001&fields=f6"

	data, err := fetchEastmoneyAPIWithRetry(url, 3)
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

	// Sum Shanghai + Shenzhen turnover
	totalAmount := 0.0
	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		totalAmount += safeFloat(d, "f6")
	}

	// Convert to 万亿 (f6 is in yuan)
	return totalAmount / 1e12
}

// Ensure imports are used
var _ = fmt.Sprintf
var _ = strings.TrimSpace
var _ = time.Now
