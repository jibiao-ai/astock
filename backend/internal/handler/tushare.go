package handler

import (
	"bytes"
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

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// ==================== Tushare Client ====================

const (
	tushareAPIURL      = "http://api.tushare.pro"
	defaultTushareToken = "9009687b64bb934feeb28a7d1245fb4537047b280ea9cc400c812f3f"
)

// tushareTokenCache caches the token in memory
var (
	tushareTokenMu    sync.RWMutex
	tushareTokenCache string
	tushareTokenTime  time.Time
)

// getTushareToken retrieves the tushare token from DB (SystemConfig) or uses default
func getTushareToken() string {
	tushareTokenMu.RLock()
	if tushareTokenCache != "" && time.Since(tushareTokenTime) < 5*time.Minute {
		defer tushareTokenMu.RUnlock()
		return tushareTokenCache
	}
	tushareTokenMu.RUnlock()

	tushareTokenMu.Lock()
	defer tushareTokenMu.Unlock()

	// Double-check after acquiring write lock
	if tushareTokenCache != "" && time.Since(tushareTokenTime) < 5*time.Minute {
		return tushareTokenCache
	}

	// Try to read from DB
	var cfg model.SystemConfig
	if err := repository.DB.Where("config_key = ?", "tushare_token").First(&cfg).Error; err == nil && cfg.ConfigValue != "" {
		tushareTokenCache = cfg.ConfigValue
	} else {
		tushareTokenCache = defaultTushareToken
	}
	tushareTokenTime = time.Now()
	return tushareTokenCache
}

// clearTushareTokenCache invalidates the cached token (called on settings update)
func clearTushareTokenCache() {
	tushareTokenMu.Lock()
	defer tushareTokenMu.Unlock()
	tushareTokenCache = ""
	tushareTokenTime = time.Time{}
}

// tushareRequest represents a Tushare API request body
type tushareRequest struct {
	APIName string            `json:"api_name"`
	Token   string            `json:"token"`
	Params  map[string]string `json:"params"`
	Fields  string            `json:"fields"`
}

// tushareResponse represents a Tushare API response
type tushareResponse struct {
	RequestID string `json:"request_id"`
	Code      int    `json:"code"`
	Msg       string `json:"msg"`
	Data      struct {
		Fields  []string        `json:"fields"`
		Items   [][]interface{} `json:"items"`
		HasMore bool            `json:"has_more"`
	} `json:"data"`
}

// callTushareAPI sends a POST request to the Tushare API
func callTushareAPI(apiName string, params map[string]string, fields string) (*tushareResponse, error) {
	token := getTushareToken()

	reqBody := tushareRequest{
		APIName: apiName,
		Token:   token,
		Params:  params,
		Fields:  fields,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Post(tushareAPIURL, "application/json", bytes.NewReader(jsonData))
	if err != nil {
		return nil, fmt.Errorf("tushare API request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var result tushareResponse
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("unmarshal response: %w", err)
	}

	if result.Code != 0 {
		return nil, fmt.Errorf("tushare error code %d: %s", result.Code, result.Msg)
	}

	return &result, nil
}

// tushareDataToMap converts tushare response fields/items into a slice of maps
func tushareDataToMap(resp *tushareResponse) []map[string]interface{} {
	if resp == nil || len(resp.Data.Fields) == 0 || len(resp.Data.Items) == 0 {
		return nil
	}

	var results []map[string]interface{}
	for _, item := range resp.Data.Items {
		row := make(map[string]interface{})
		for i, field := range resp.Data.Fields {
			if i < len(item) {
				row[field] = item[i]
			}
		}
		results = append(results, row)
	}
	return results
}

// tsFloat safely extracts a float64 from a tushare data row
func tsFloat(row map[string]interface{}, key string) float64 {
	v, ok := row[key]
	if !ok || v == nil {
		return 0
	}
	switch val := v.(type) {
	case float64:
		return val
	case int:
		return float64(val)
	case int64:
		return float64(val)
	case string:
		f, _ := strconv.ParseFloat(val, 64)
		return f
	}
	return 0
}

// tsString safely extracts a string from a tushare data row
func tsString(row map[string]interface{}, key string) string {
	v, ok := row[key]
	if !ok || v == nil {
		return ""
	}
	switch val := v.(type) {
	case string:
		return val
	case float64:
		return fmt.Sprintf("%.0f", val)
	}
	return fmt.Sprintf("%v", v)
}

// codeToTsCode converts a 6-digit stock code to tushare ts_code format
// e.g., "600519" -> "600519.SH", "000001" -> "000001.SZ"
func codeToTsCode(code string) string {
	code = strings.TrimSpace(code)
	// Already has suffix
	if strings.Contains(code, ".") {
		return code
	}
	// 6xxxxx, 5xxxxx -> .SH (Shanghai)
	if strings.HasPrefix(code, "6") || strings.HasPrefix(code, "5") {
		return code + ".SH"
	}
	// 0xxxxx, 3xxxxx, 1xxxxx, 2xxxxx -> .SZ (Shenzhen)
	if strings.HasPrefix(code, "0") || strings.HasPrefix(code, "3") ||
		strings.HasPrefix(code, "1") || strings.HasPrefix(code, "2") {
		return code + ".SZ"
	}
	// 8xxxxx, 4xxxxx, 9xxxxx -> .BJ (Beijing)
	if strings.HasPrefix(code, "8") || strings.HasPrefix(code, "4") || strings.HasPrefix(code, "9") {
		return code + ".BJ"
	}
	return code + ".SH"
}

// tsCodeToCode converts "600519.SH" -> "600519"
func tsCodeToCode(tsCode string) string {
	parts := strings.Split(tsCode, ".")
	if len(parts) > 0 {
		return parts[0]
	}
	return tsCode
}

// getLatestTradeDate returns the most recent trade date string in YYYYMMDD format
// It looks back up to 10 days from today to find the latest trading day
func getLatestTradeDate() string {
	now := time.Now()
	// Try today first, then go backwards
	for i := 0; i < 10; i++ {
		d := now.AddDate(0, 0, -i)
		weekday := d.Weekday()
		if weekday == time.Saturday || weekday == time.Sunday {
			continue
		}
		return d.Format("20060102")
	}
	return now.Format("20060102")
}

// ==================== Tushare-based fetchBatchQuotes ====================

// fetchBatchQuotesTushare fetches multiple stock quotes from Tushare daily API
func fetchBatchQuotesTushare(codes []string) map[string]*model.StockQuote {
	result := make(map[string]*model.StockQuote)
	if len(codes) == 0 {
		return result
	}

	// Convert codes to ts_codes
	tsCodes := make([]string, len(codes))
	for i, code := range codes {
		tsCodes[i] = codeToTsCode(code)
	}

	tradeDate := getLatestTradeDate()

	// Fetch daily data for the latest trading day
	// Try the latest date, if no data, try previous days
	var dailyRows []map[string]interface{}
	for attempt := 0; attempt < 5; attempt++ {
		d := time.Now().AddDate(0, 0, -attempt)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		tradeDate = d.Format("20060102")

		resp, err := callTushareAPI("daily", map[string]string{
			"ts_code":    strings.Join(tsCodes, ","),
			"trade_date": tradeDate,
		}, "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount")

		if err != nil {
			log.Printf("[Tushare] daily API error for date %s: %v", tradeDate, err)
			continue
		}

		dailyRows = tushareDataToMap(resp)
		if len(dailyRows) > 0 {
			break
		}
	}

	// Build a lookup by ts_code
	dailyMap := make(map[string]map[string]interface{})
	for _, row := range dailyRows {
		tsCode := tsString(row, "ts_code")
		dailyMap[tsCode] = row
	}

	// Also try to get stock names from stock_basic if needed
	nameMap := fetchTushareStockNames(tsCodes)

	for _, code := range codes {
		tsCode := codeToTsCode(code)
		row, ok := dailyMap[tsCode]
		if !ok {
			result[code] = &model.StockQuote{Code: code, Name: nameMap[tsCode]}
			continue
		}

		closePrice := tsFloat(row, "close")
		preClose := tsFloat(row, "pre_close")
		change := tsFloat(row, "change")
		pctChg := tsFloat(row, "pct_chg")
		openPrice := tsFloat(row, "open")
		highPrice := tsFloat(row, "high")
		lowPrice := tsFloat(row, "low")
		vol := tsFloat(row, "vol")       // in 手(100 shares)
		amount := tsFloat(row, "amount") // in 千元

		name := nameMap[tsCode]
		if name == "" {
			name = code
		}

		result[code] = &model.StockQuote{
			Code:      code,
			Name:      name,
			Price:     closePrice,
			Change:    change,
			ChangePct: pctChg,
			High:      highPrice,
			Low:       lowPrice,
			Open:      openPrice,
			PreClose:  preClose,
			Volume:    vol * 100, // convert from 手 to 股
			Amount:    amount / 10, // convert from 千元 to 万元
		}
	}

	return result
}

// fetchTushareStockNames fetches stock names from tushare stock_basic
func fetchTushareStockNames(tsCodes []string) map[string]string {
	nameMap := make(map[string]string)
	if len(tsCodes) == 0 {
		return nameMap
	}

	// stock_basic doesn't support multi-code query in one call easily,
	// so we fetch all stocks and filter, but cache the result
	tushareNameCacheMu.RLock()
	if len(tushareNameCacheMap) > 0 && time.Since(tushareNameCacheTime) < 24*time.Hour {
		for _, tsCode := range tsCodes {
			if name, ok := tushareNameCacheMap[tsCode]; ok {
				nameMap[tsCode] = name
			}
		}
		tushareNameCacheMu.RUnlock()
		return nameMap
	}
	tushareNameCacheMu.RUnlock()

	resp, err := callTushareAPI("stock_basic", map[string]string{
		"list_status": "L",
	}, "ts_code,name,industry")
	if err != nil {
		log.Printf("[Tushare] stock_basic error: %v", err)
		return nameMap
	}

	rows := tushareDataToMap(resp)
	newCache := make(map[string]string)
	newIndustryCache := make(map[string]string)
	for _, row := range rows {
		tsCode := tsString(row, "ts_code")
		name := tsString(row, "name")
		industry := tsString(row, "industry")
		newCache[tsCode] = name
		newIndustryCache[tsCode] = industry
	}

	tushareNameCacheMu.Lock()
	tushareNameCacheMap = newCache
	tushareIndustryCacheMap = newIndustryCache
	tushareNameCacheTime = time.Now()
	tushareNameCacheMu.Unlock()

	for _, tsCode := range tsCodes {
		if name, ok := newCache[tsCode]; ok {
			nameMap[tsCode] = name
		}
	}
	return nameMap
}

// Name and industry cache
var (
	tushareNameCacheMu      sync.RWMutex
	tushareNameCacheMap      map[string]string
	tushareIndustryCacheMap  map[string]string
	tushareNameCacheTime     time.Time
)

// getTushareStockIndustry looks up a stock's industry from the cache
func getTushareStockIndustry(tsCode string) string {
	tushareNameCacheMu.RLock()
	defer tushareNameCacheMu.RUnlock()
	return tushareIndustryCacheMap[tsCode]
}

// getTushareStockName looks up a stock's name from the cache
func getTushareStockName(tsCode string) string {
	tushareNameCacheMu.RLock()
	defer tushareNameCacheMu.RUnlock()
	return tushareNameCacheMap[tsCode]
}

// ==================== Tushare-based fetch5DayClose ====================

func fetch5DayCloseTushare(code string) []gin.H {
	tsCode := codeToTsCode(code)

	// Fetch last 10 calendar days to get 5 trading days
	endDate := time.Now().Format("20060102")
	startDate := time.Now().AddDate(0, 0, -15).Format("20060102")

	resp, err := callTushareAPI("daily", map[string]string{
		"ts_code":    tsCode,
		"start_date": startDate,
		"end_date":   endDate,
	}, "ts_code,trade_date,close")
	if err != nil {
		log.Printf("[Tushare] 5day close error for %s: %v", code, err)
		return []gin.H{}
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return []gin.H{}
	}

	// Tushare returns newest first, we want newest last (or chronological)
	// Actually we only need the last 5 entries in chronological order
	sort.Slice(rows, func(i, j int) bool {
		return tsString(rows[i], "trade_date") < tsString(rows[j], "trade_date")
	})

	// Take last 5
	start := 0
	if len(rows) > 5 {
		start = len(rows) - 5
	}

	klines := []gin.H{}
	for _, row := range rows[start:] {
		dateStr := tsString(row, "trade_date")
		// Convert YYYYMMDD to YYYY-MM-DD
		if len(dateStr) == 8 {
			dateStr = dateStr[:4] + "-" + dateStr[4:6] + "-" + dateStr[6:]
		}
		klines = append(klines, gin.H{
			"date":  dateStr,
			"close": tsFloat(row, "close"),
		})
	}
	return klines
}

// ==================== Tushare-based K-Line ====================

// fetchKLineTushare fetches K-line data from tushare
func fetchKLineTushare(code string, period string, limit int) gin.H {
	tsCode := codeToTsCode(code)

	apiName := "daily"
	endDate := time.Now().Format("20060102")
	startDate := time.Now().AddDate(0, 0, -limit*2).Format("20060102") // extra buffer

	switch period {
	case "week", "weekly", "102":
		apiName = "weekly"
		startDate = time.Now().AddDate(0, 0, -limit*10).Format("20060102")
	case "month", "monthly", "103":
		apiName = "monthly"
		startDate = time.Now().AddDate(0, -limit*2, 0).Format("20060102")
	}

	resp, err := callTushareAPI(apiName, map[string]string{
		"ts_code":    tsCode,
		"start_date": startDate,
		"end_date":   endDate,
	}, "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount")
	if err != nil {
		log.Printf("[Tushare] KLine %s error for %s: %v", apiName, code, err)
		return gin.H{"klines": []interface{}{}, "code": code, "period": period}
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return gin.H{"klines": []interface{}{}, "code": code, "period": period}
	}

	// Sort chronologically
	sort.Slice(rows, func(i, j int) bool {
		return tsString(rows[i], "trade_date") < tsString(rows[j], "trade_date")
	})

	// Limit to requested amount
	if len(rows) > limit {
		rows = rows[len(rows)-limit:]
	}

	// Get name
	name := getTushareStockName(tsCode)

	// Pre-close from first item's pre_close
	preClose := 0.0
	if len(rows) > 0 {
		preClose = tsFloat(rows[0], "pre_close")
	}

	klines := []gin.H{}
	for _, row := range rows {
		dateStr := tsString(row, "trade_date")
		if len(dateStr) == 8 {
			dateStr = dateStr[:4] + "-" + dateStr[4:6] + "-" + dateStr[6:]
		}

		vol := tsFloat(row, "vol")       // 手
		amount := tsFloat(row, "amount") // 千元

		klines = append(klines, gin.H{
			"date":       dateStr,
			"open":       tsFloat(row, "open"),
			"close":      tsFloat(row, "close"),
			"high":       tsFloat(row, "high"),
			"low":        tsFloat(row, "low"),
			"volume":     vol * 100,  // convert to 股
			"amount":     amount * 1000, // convert to 元
			"change_pct": tsFloat(row, "pct_chg"),
			"turnover":   0, // will be filled if available
		})
	}

	return gin.H{
		"code":      code,
		"name":      name,
		"period":    period,
		"pre_close": preClose,
		"klines":    klines,
	}
}

// ==================== SystemConfig Model & Settings API ====================

// GetSystemSettings returns system settings (admin only)
func (h *Handler) GetSystemSettings(c *gin.Context) {
	var configs []model.SystemConfig
	repository.DB.Find(&configs)

	settings := make(map[string]string)
	for _, cfg := range configs {
		settings[cfg.ConfigKey] = cfg.ConfigValue
	}

	// Mask tushare token for display
	if token, ok := settings["tushare_token"]; ok && len(token) > 8 {
		settings["tushare_token"] = token[:4] + "****" + token[len(token)-4:]
	}

	response.Success(c, settings)
}

// UpdateSystemSettings updates system settings (admin only)
func (h *Handler) UpdateSystemSettings(c *gin.Context) {
	var req map[string]string
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "Invalid settings data")
		return
	}

	for key, value := range req {
		// Only allow known setting keys
		if key != "tushare_token" && key != "data_source" {
			continue
		}

		var cfg model.SystemConfig
		err := repository.DB.Where("config_key = ?", key).First(&cfg).Error
		if err != nil {
			// Create new
			cfg = model.SystemConfig{
				ConfigKey:   key,
				ConfigValue: value,
				Description: getSettingDescription(key),
			}
			repository.DB.Create(&cfg)
		} else {
			// Update existing
			repository.DB.Model(&cfg).Update("config_value", value)
		}
	}

	// Clear token cache if tushare_token was updated
	if _, ok := req["tushare_token"]; ok {
		clearTushareTokenCache()
	}

	userID, _ := c.Get("user_id")
	repository.DB.Create(&model.AuditLog{
		UserID: userID.(uint), Module: "settings", Action: "update",
		Target: "system_settings", Detail: "更新系统设置",
		IP: c.ClientIP(), Status: "success",
	})

	response.Success(c, gin.H{"message": "设置已更新"})
}

func getSettingDescription(key string) string {
	switch key {
	case "tushare_token":
		return "Tushare Pro API Token (用于获取股票行情数据)"
	case "data_source":
		return "数据源选择 (tushare/eastmoney)"
	default:
		return key
	}
}

// ==================== Tushare-based fetchBatchQuotesWithMarketCap ====================

// fetchBatchQuotesWithMarketCapTushare fetches batch quotes with market cap from Tushare
// Uses daily + daily_basic APIs to get price data and market cap/PE/PB
func fetchBatchQuotesWithMarketCapTushare(codes []string) map[string]*quoteWithCap {
	result := make(map[string]*quoteWithCap)
	if len(codes) == 0 {
		return result
	}

	// Convert codes to ts_codes
	tsCodes := make([]string, len(codes))
	for i, code := range codes {
		tsCodes[i] = codeToTsCode(code)
	}

	// Find the latest trade date with data
	tradeDate := ""
	var dailyRows []map[string]interface{}
	for attempt := 0; attempt < 7; attempt++ {
		d := time.Now().AddDate(0, 0, -attempt)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		tradeDate = d.Format("20060102")

		resp, err := callTushareAPI("daily", map[string]string{
			"ts_code":    strings.Join(tsCodes, ","),
			"trade_date": tradeDate,
		}, "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount")
		if err != nil {
			log.Printf("[Tushare] daily API error for date %s: %v", tradeDate, err)
			continue
		}

		dailyRows = tushareDataToMap(resp)
		if len(dailyRows) > 0 {
			break
		}
	}

	// Build daily data lookup
	dailyMap := make(map[string]map[string]interface{})
	for _, row := range dailyRows {
		tsCode := tsString(row, "ts_code")
		dailyMap[tsCode] = row
	}

	// Fetch daily_basic for market cap, PE, PB
	var basicRows []map[string]interface{}
	if tradeDate != "" {
		resp, err := callTushareAPI("daily_basic", map[string]string{
			"ts_code":    strings.Join(tsCodes, ","),
			"trade_date": tradeDate,
		}, "ts_code,close,turnover_rate,volume_ratio,pe,pe_ttm,pb,total_mv,circ_mv")
		if err != nil {
			log.Printf("[Tushare] daily_basic API error: %v", err)
		} else {
			basicRows = tushareDataToMap(resp)
		}
	}

	basicMap := make(map[string]map[string]interface{})
	for _, row := range basicRows {
		tsCode := tsString(row, "ts_code")
		basicMap[tsCode] = row
	}

	// Get stock names
	nameMap := fetchTushareStockNames(tsCodes)

	for _, code := range codes {
		tsCode := codeToTsCode(code)
		daily := dailyMap[tsCode]
		basic := basicMap[tsCode]

		name := nameMap[tsCode]
		if name == "" {
			name = code
		}

		price := 0.0
		changePct := 0.0
		if daily != nil {
			price = tsFloat(daily, "close")
			changePct = tsFloat(daily, "pct_chg")
		}

		marketCap := 0.0
		concept := getTushareStockIndustry(tsCode)
		if basic != nil {
			// total_mv is in 万元, convert to 亿元
			totalMv := tsFloat(basic, "total_mv")
			marketCap = totalMv / 10000 // 万 -> 亿
			marketCap = math.Round(marketCap*100) / 100
		}

		result[code] = &quoteWithCap{
			Name:      name,
			Price:     price,
			ChangePct: changePct,
			MarketCap: marketCap,
			Concept:   concept,
		}
	}

	return result
}

// ==================== Tushare-based single stock quote ====================

// fetchSingleStockQuoteTushare fetches a single stock's real-time quote data from Tushare
func fetchSingleStockQuoteTushare(code string) *model.StockQuote {
	tsCode := codeToTsCode(code)

	// Try to get daily data for the latest trade date
	for attempt := 0; attempt < 7; attempt++ {
		d := time.Now().AddDate(0, 0, -attempt)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		tradeDate := d.Format("20060102")

		resp, err := callTushareAPI("daily", map[string]string{
			"ts_code":    tsCode,
			"trade_date": tradeDate,
		}, "ts_code,trade_date,open,high,low,close,pre_close,change,pct_chg,vol,amount")
		if err != nil {
			continue
		}

		rows := tushareDataToMap(resp)
		if len(rows) == 0 {
			continue
		}

		row := rows[0]
		name := getTushareStockName(tsCode)
		if name == "" {
			// Trigger name cache load
			fetchTushareStockNames([]string{tsCode})
			name = getTushareStockName(tsCode)
		}

		return &model.StockQuote{
			Code:      code,
			Name:      name,
			Price:     tsFloat(row, "close"),
			Change:    tsFloat(row, "change"),
			ChangePct: tsFloat(row, "pct_chg"),
			High:      tsFloat(row, "high"),
			Low:       tsFloat(row, "low"),
			Open:      tsFloat(row, "open"),
			PreClose:  tsFloat(row, "pre_close"),
			Volume:    tsFloat(row, "vol") * 100,    // 手 -> 股
			Amount:    tsFloat(row, "amount") / 10,   // 千元 -> 万元
		}
	}

	return nil
}
