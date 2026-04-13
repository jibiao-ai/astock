package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
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
						"date":        parts[0],
						"main_in":     mainIn / 10000,  // 转万元
						"main_out":    mainOut / 10000,
						"main_net":    (mainIn + mainOut) / 10000,
						"retail_in":   retailIn / 10000,
						"retail_out":  retailOut / 10000,
						"retail_net":  (retailIn + retailOut) / 10000,
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

	// Check if already exists
	var existing model.WatchlistItem
	err := repository.DB.Where("user_id = ? AND code = ?", userID, req.Code).First(&existing).Error
	if err == nil {
		response.BadRequest(c, "该股票已在自选列表中")
		return
	}

	// If name is empty, fetch from Eastmoney
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

	// Audit
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

	// Audit
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

	// Batch fetch quotes from Eastmoney
	codes := []string{}
	for _, item := range items {
		codes = append(codes, item.Code)
	}

	quotes := fetchBatchQuotes(codes)

	// Also fetch 5-day close prices for each
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
	// Eastmoney concept board API
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205"

	data, err := fetchEastmoneyAPI(url)
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

// GetLimitUpDownDetails returns detailed real-time limit-up and limit-down stocks
func (h *Handler) GetLimitUpDownDetails(c *gin.Context) {
	limitType := c.DefaultQuery("type", "up") // "up" or "down"

	var url string
	if limitType == "down" {
		// Limit-down pool
		url = "https://push2ex.eastmoney.com/getTopicDTPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"
	} else {
		// Limit-up pool
		url = "https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"
	}

	data, err := fetchEastmoneyAPI(url)
	if err != nil {
		response.InternalError(c, "获取涨跌停数据失败: "+err.Error())
		return
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(data, &raw); err != nil {
		response.InternalError(c, "解析数据失败")
		return
	}

	resultData, ok := raw["data"].(map[string]interface{})
	if !ok {
		response.Success(c, gin.H{"stocks": []interface{}{}, "count": 0})
		return
	}

	pool, ok := resultData["pool"].([]interface{})
	if !ok {
		response.Success(c, gin.H{"stocks": []interface{}{}, "count": 0})
		return
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
			"code":       safeString(d, "f12"),
			"name":       safeString(d, "f14"),
			"price":      price,
			"open":       openPrice,
			"change_pct": changePct,
			"fund_amount": fundAmt,
			"concept":    safeString(d, "f225"),
			"board_count": safeInt(d, "f136"),
		})
	}

	response.Success(c, gin.H{
		"stocks": stocks,
		"count":  len(stocks),
		"type":   limitType,
	})
}

// GetSectorFundFlow returns sector fund flow with actual amounts
func (h *Handler) GetSectorFundFlow(c *gin.Context) {
	category := c.DefaultQuery("category", "sector") // "sector" or "concept"

	var fs string
	if category == "concept" {
		fs = "m:90+t:3"
	} else {
		fs = "m:90+t:2"
	}
	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f62&fs=%s&fields=f2,f3,f12,f14,f62,f66,f69,f72,f75,f184,f204,f205", fs)

	data, err := fetchEastmoneyAPI(url)
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
			"net_flow":   safeFloat(d, "f62") / 10000,          // 万元
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
	// This endpoint fetches fresh data from Eastmoney APIs in real-time
	// and combines it with existing DB data

	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	forceRefresh := c.DefaultQuery("refresh", "false") == "true"

	// If force refresh or today's date, fetch from Eastmoney
	today := time.Now().Format("2006-01-02")
	if forceRefresh || date == today {
		go fetchAllMarketData(date)
	}

	// Get from DB (including freshly fetched data)
	h.GetDashboardEnhanced(c)
}

// ==================== Helper Functions ====================

func buildSecID(code string) string {
	if strings.HasPrefix(code, "6") {
		return "1." + code
	}
	return "0." + code
}

func fetchEastmoneyAPI(url string) ([]byte, error) {
	client := &http.Client{Timeout: 15 * time.Second}
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

	return io.ReadAll(resp.Body)
}

// fetchBatchQuotes fetches multiple stock quotes from Eastmoney
func fetchBatchQuotes(codes []string) map[string]*model.StockQuote {
	result := make(map[string]*model.StockQuote)

	// Build secids
	secids := []string{}
	for _, code := range codes {
		secids = append(secids, buildSecID(code))
	}

	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/ulist.np/get?secids=%s&fields=f2,f3,f4,f5,f6,f7,f12,f14,f15,f16,f17,f18,f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117",
		strings.Join(secids, ","))

	data, err := fetchEastmoneyAPI(url)
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

	// Fill missing
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
					"main_net":   mainNet / 10000, // 万元
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
