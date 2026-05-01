package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// StockDecision stores AI analysis results for individual stocks
type StockDecision struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	Code          string    `gorm:"size:20;index:idx_sd_code_date" json:"code"`
	Name          string    `gorm:"size:100" json:"name"`
	Price         float64   `json:"price"`
	ChangePct     float64   `json:"change_pct"`
	Insights      string    `gorm:"type:longtext" json:"insights"`       // AI分析文本
	Suggestion    string    `gorm:"size:20" json:"suggestion"`           // 买入/卖出/观望/加仓
	Trend         string    `gorm:"size:20" json:"trend"`                // 上涨/下跌/震荡/反弹
	Sentiment     int       `json:"sentiment"`                           // 0-100 情绪分
	BuyPrice1     float64   `json:"buy_price_1"`                         // 理想买入价
	BuyPrice2     float64   `json:"buy_price_2"`                         // 二次买入价
	StopLoss      float64   `json:"stop_loss"`                           // 止损位
	TakeProfit    float64   `json:"take_profit"`                         // 止盈目标
	Reason        string    `gorm:"type:text" json:"reason"`             // 涨停原因/关键事件
	TradeDate     string    `gorm:"size:20;index:idx_sd_code_date" json:"trade_date"`
	AnalyzedAt    time.Time `json:"analyzed_at"`
	CreatedAt     time.Time `json:"created_at"`
}

// MarketReview stores daily market review
type MarketReview struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TradeDate     string    `gorm:"size:20;uniqueIndex" json:"trade_date"`
	Summary       string    `gorm:"type:longtext" json:"summary"`         // 大盘总结
	IndexSH       float64   `json:"index_sh"`                             // 上证
	IndexSZ       float64   `json:"index_sz"`                             // 深证
	IndexCYB      float64   `json:"index_cyb"`                            // 创业板
	IndexSHPct    float64   `json:"index_sh_pct"`
	IndexSZPct    float64   `json:"index_sz_pct"`
	IndexCYBPct   float64   `json:"index_cyb_pct"`
	UpCount       int       `json:"up_count"`
	DownCount     int       `json:"down_count"`
	LimitUp       int       `json:"limit_up"`
	HighestBoard  int       `json:"highest_board"`
	Suggestion    string    `gorm:"size:20" json:"suggestion"`            // 加仓/减仓/观望
	MarketTrend   string    `gorm:"size:20" json:"market_trend"`          // 多头/空头/震荡
	HotSectors    string    `gorm:"type:text" json:"hot_sectors"`         // 热点板块 JSON
	CreatedAt     time.Time `json:"created_at"`
}

// PushConfig stores push notification settings
type PushConfig struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Channel     string    `gorm:"size:50;uniqueIndex" json:"channel"` // wechat_work, feishu, email
	Enabled     bool      `gorm:"default:false" json:"enabled"`
	WebhookURL  string    `gorm:"size:500" json:"webhook_url"`
	Extra       string    `gorm:"type:text" json:"extra"`  // JSON: email_to, email_from, smtp_host, etc.
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func init() {
	// Will be migrated in AutoMigrateDashboardModels
}

// AutoMigrateDecisionModels migrates decision-related models
func AutoMigrateDecisionModels(db interface{ AutoMigrate(dst ...interface{}) error }) {
	db.AutoMigrate(
		&StockDecision{},
		&MarketReview{},
		&PushConfig{},
	)
	log.Println("[Decision] Stock decision models migrated")
}

// ==================== API Handlers ====================

// AnalyzeStock handles POST /api/decision/analyze
func (h *Handler) AnalyzeStock(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		var body struct {
			Code string `json:"code"`
		}
		if err := c.BindJSON(&body); err == nil {
			code = body.Code
		}
	}
	if code == "" {
		response.Error(c, 400, "股票代码不能为空")
		return
	}

	// Normalize code
	code = strings.TrimSpace(code)

	// 1. Get stock quote
	quote := fetchStockQuoteForDecision(code)
	if quote == nil {
		response.Error(c, 404, "获取股票数据失败，请检查代码")
		return
	}

	// 2. Call AI for analysis
	analysis := callAIForStockAnalysis(code, quote)

	// 3. Save to DB
	tradeDate := time.Now().Format("2006-01-02")
	decision := StockDecision{
		Code:       code,
		Name:       quote.Name,
		Price:      quote.Price,
		ChangePct:  quote.ChangePct,
		Insights:   analysis.Insights,
		Suggestion: analysis.Suggestion,
		Trend:      analysis.Trend,
		Sentiment:  analysis.Sentiment,
		BuyPrice1:  analysis.BuyPrice1,
		BuyPrice2:  analysis.BuyPrice2,
		StopLoss:   analysis.StopLoss,
		TakeProfit: analysis.TakeProfit,
		Reason:     analysis.Reason,
		TradeDate:  tradeDate,
		AnalyzedAt: time.Now(),
	}

	// Upsert
	var existing StockDecision
	if err := repository.DB.Where("code = ? AND trade_date = ?", code, tradeDate).
		Order("analyzed_at DESC").First(&existing).Error; err == nil {
		repository.DB.Model(&existing).Updates(map[string]interface{}{
			"price":       decision.Price,
			"change_pct":  decision.ChangePct,
			"insights":    decision.Insights,
			"suggestion":  decision.Suggestion,
			"trend":       decision.Trend,
			"sentiment":   decision.Sentiment,
			"buy_price_1": decision.BuyPrice1,
			"buy_price_2": decision.BuyPrice2,
			"stop_loss":   decision.StopLoss,
			"take_profit": decision.TakeProfit,
			"reason":      decision.Reason,
			"analyzed_at": decision.AnalyzedAt,
		})
		decision.ID = existing.ID
	} else {
		repository.DB.Create(&decision)
	}

	response.Success(c, decision)
}

// GetStockDecisionHistory handles GET /api/decision/history
func (h *Handler) GetStockDecisionHistory(c *gin.Context) {
	code := c.Query("code")
	limit := 20

	decisions := make([]StockDecision, 0)
	query := repository.DB.Order("analyzed_at DESC").Limit(limit)
	if code != "" {
		query = query.Where("code = ?", code)
	}
	query.Find(&decisions)

	response.Success(c, decisions)
}

// GetMarketReviewAPI handles GET /api/decision/market-review
func (h *Handler) GetMarketReviewAPI(c *gin.Context) {
	tradeDate := c.DefaultQuery("trade_date", "")

	var review MarketReview
	query := repository.DB.Order("trade_date DESC")
	if tradeDate != "" {
		query = query.Where("trade_date = ?", tradeDate)
	}

	if err := query.First(&review).Error; err != nil {
		// Generate fresh market review
		review = generateMarketReview()
		if review.TradeDate != "" {
			repository.DB.Create(&review)
		}
	}

	response.Success(c, review)
}

// RunMarketReview handles POST /api/decision/market-review
func (h *Handler) RunMarketReview(c *gin.Context) {
	review := generateMarketReview()
	if review.TradeDate != "" {
		var existing MarketReview
		if err := repository.DB.Where("trade_date = ?", review.TradeDate).First(&existing).Error; err == nil {
			repository.DB.Model(&existing).Updates(map[string]interface{}{
				"summary":       review.Summary,
				"index_sh":      review.IndexSH,
				"index_sz":      review.IndexSZ,
				"index_cyb":     review.IndexCYB,
				"index_sh_pct":  review.IndexSHPct,
				"index_sz_pct":  review.IndexSZPct,
				"index_cyb_pct": review.IndexCYBPct,
				"up_count":      review.UpCount,
				"down_count":    review.DownCount,
				"limit_up":      review.LimitUp,
				"highest_board": review.HighestBoard,
				"suggestion":    review.Suggestion,
				"market_trend":  review.MarketTrend,
				"hot_sectors":   review.HotSectors,
			})
			review.ID = existing.ID
		} else {
			repository.DB.Create(&review)
		}
	}
	response.Success(c, review)
}

// GetPushConfigs handles GET /api/decision/push-configs
func (h *Handler) GetPushConfigs(c *gin.Context) {
	configs := make([]PushConfig, 0)
	repository.DB.Find(&configs)

	// Ensure default channels exist
	channels := []string{"wechat_work", "feishu", "email"}
	for _, ch := range channels {
		found := false
		for _, cfg := range configs {
			if cfg.Channel == ch {
				found = true
				break
			}
		}
		if !found {
			newCfg := PushConfig{Channel: ch, Enabled: false}
			repository.DB.Create(&newCfg)
			configs = append(configs, newCfg)
		}
	}

	response.Success(c, configs)
}

// UpdatePushConfig handles PUT /api/decision/push-configs/:channel
func (h *Handler) UpdatePushConfig(c *gin.Context) {
	channel := c.Param("channel")
	var body struct {
		Enabled    bool   `json:"enabled"`
		WebhookURL string `json:"webhook_url"`
		Extra      string `json:"extra"`
	}
	if err := c.BindJSON(&body); err != nil {
		response.Error(c, 400, "参数错误")
		return
	}

	var config PushConfig
	if err := repository.DB.Where("channel = ?", channel).First(&config).Error; err != nil {
		config = PushConfig{Channel: channel}
		repository.DB.Create(&config)
	}

	repository.DB.Model(&config).Updates(map[string]interface{}{
		"enabled":     body.Enabled,
		"webhook_url": body.WebhookURL,
		"extra":       body.Extra,
	})

	// Reload to return fresh data
	repository.DB.Where("channel = ?", channel).First(&config)
	response.Success(c, config)
}

// TestPushNotification handles POST /api/decision/push-test/:channel
func (h *Handler) TestPushNotification(c *gin.Context) {
	channel := c.Param("channel")

	var config PushConfig
	if err := repository.DB.Where("channel = ?", channel).First(&config).Error; err != nil {
		response.Error(c, 404, "推送渠道未配置")
		return
	}

	err := sendTestNotification(config)
	if err != nil {
		response.Error(c, 500, fmt.Sprintf("推送测试失败: %v", err))
		return
	}

	response.Success(c, gin.H{"message": "测试推送已发送"})
}

// ==================== AI Analysis Logic ====================

type stockQuoteInfo struct {
	Code      string
	Name      string
	Price     float64
	ChangePct float64
	PreClose  float64
	High      float64
	Low       float64
	Volume    float64
	Amount    float64
}

type aiAnalysisResult struct {
	Insights   string
	Suggestion string
	Trend      string
	Sentiment  int
	BuyPrice1  float64
	BuyPrice2  float64
	StopLoss   float64
	TakeProfit float64
	Reason     string
}

func fetchStockQuoteForDecision(code string) *stockQuoteInfo {
	// Use existing Eastmoney/Sina quote API
	// Normalize: 600xxx -> sh600xxx, 000xxx -> sz000xxx
	pureCode := code
	secid := ""
	if strings.HasPrefix(code, "6") || strings.HasPrefix(code, "5") {
		secid = "1." + code
	} else if strings.HasPrefix(code, "0") || strings.HasPrefix(code, "3") {
		secid = "0." + code
	} else if strings.HasPrefix(code, "sh") || strings.HasPrefix(code, "sz") {
		// Already has prefix
		if strings.HasPrefix(code, "sh") {
			secid = "1." + code[2:]
			pureCode = code[2:]
		} else {
			secid = "0." + code[2:]
			pureCode = code[2:]
		}
	} else {
		secid = "1." + code // default to SH
	}

	// Method 1: push2.eastmoney.com - primary
	quote := fetchQuoteFromPush2(secid, pureCode)
	if quote != nil {
		return quote
	}

	// Method 2: Try the other market prefix (SH<->SZ)
	altSecid := ""
	if strings.HasPrefix(secid, "1.") {
		altSecid = "0." + pureCode
	} else {
		altSecid = "1." + pureCode
	}
	quote = fetchQuoteFromPush2(altSecid, pureCode)
	if quote != nil {
		return quote
	}

	// Method 3: push2his.eastmoney.com (alternative endpoint)
	quote = fetchQuoteFromPush2His(secid, pureCode)
	if quote != nil {
		return quote
	}

	log.Printf("[Decision] All quote fetch methods failed for code=%s", code)
	return nil
}

func fetchQuoteFromPush2(secid, code string) *stockQuoteInfo {
	url := fmt.Sprintf("https://push2.eastmoney.com/api/qt/stock/get?secid=%s&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170", secid)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("[Decision] push2 quote fetch error: %v", err)
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		log.Printf("[Decision] push2 parse error: %v", err)
		return nil
	}

	data, ok := raw["data"].(map[string]interface{})
	if !ok || data == nil {
		log.Printf("[Decision] push2 no data for secid=%s", secid)
		return nil
	}

	// Handle the case where f43 might be "-" (non-trading or suspended stock)
	price := safeFloat(data, "f43")
	if price == 0 {
		log.Printf("[Decision] push2 price=0 for secid=%s (possible holiday or suspended)", secid)
		return nil
	}

	// Eastmoney returns price fields in cents (divided by 100)
	price = price / 100
	preClose := safeFloat(data, "f60") / 100
	high := safeFloat(data, "f44") / 100
	low := safeFloat(data, "f45") / 100
	volume := safeFloat(data, "f47")
	amount := safeFloat(data, "f48")
	changePct := safeFloat(data, "f170") / 100
	name := safeString(data, "f58")
	stockCode := safeString(data, "f57")
	if stockCode == "" {
		stockCode = code
	}

	if name == "" {
		log.Printf("[Decision] push2 no name for secid=%s", secid)
		return nil
	}

	log.Printf("[Decision] Quote OK: %s(%s) price=%.2f pct=%.2f%%", name, stockCode, price, changePct)
	return &stockQuoteInfo{
		Code:      stockCode,
		Name:      name,
		Price:     price,
		ChangePct: changePct,
		PreClose:  preClose,
		High:      high,
		Low:       low,
		Volume:    volume,
		Amount:    amount,
	}
}

func fetchQuoteFromPush2His(secid, code string) *stockQuoteInfo {
	// Use push2his for historical/alternative quote
	url := fmt.Sprintf("https://push2his.eastmoney.com/api/qt/stock/get?secid=%s&fields=f43,f44,f45,f46,f47,f48,f57,f58,f60,f170", secid)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil
	}

	data, ok := raw["data"].(map[string]interface{})
	if !ok || data == nil {
		return nil
	}

	price := safeFloat(data, "f43")
	if price == 0 {
		return nil
	}
	price = price / 100
	name := safeString(data, "f58")
	if name == "" {
		return nil
	}

	preClose := safeFloat(data, "f60") / 100
	high := safeFloat(data, "f44") / 100
	low := safeFloat(data, "f45") / 100
	volume := safeFloat(data, "f47")
	amount := safeFloat(data, "f48")
	changePct := safeFloat(data, "f170") / 100
	stockCode := safeString(data, "f57")
	if stockCode == "" {
		stockCode = code
	}

	return &stockQuoteInfo{
		Code:      stockCode,
		Name:      name,
		Price:     price,
		ChangePct: changePct,
		PreClose:  preClose,
		High:      high,
		Low:       low,
		Volume:    volume,
		Amount:    amount,
	}
}

func callAIForStockAnalysis(code string, quote *stockQuoteInfo) aiAnalysisResult {
	// Get AI provider config
	aiBaseURL, aiKey, aiModel := getDecisionAIConfig()

	if aiBaseURL == "" || aiKey == "" {
		// Return a template-based analysis if AI not configured
		return generateTemplateAnalysis(quote)
	}

	prompt := fmt.Sprintf(`你是一位专业的A股分析师。请分析以下股票并给出交易建议。

股票信息：
- 名称: %s
- 代码: %s  
- 当前价: %.2f
- 涨跌幅: %.2f%%
- 昨收价: %.2f
- 最高价: %.2f
- 最低价: %.2f

请以JSON格式返回分析结果（不要包含markdown标记）:
{
  "insights": "50-150字的分析要点，包含技术面和消息面",
  "suggestion": "买入/卖出/观望/加仓 (四选一)",
  "trend": "上涨/下跌/震荡/反弹 (四选一)",
  "sentiment": 0-100的情绪分数,
  "buy_price_1": 理想买入价(数字),
  "buy_price_2": 二次买入价(数字),
  "stop_loss": 止损价(数字),
  "take_profit": 止盈目标价(数字),
  "reason": "20字以内的关键分析理由"
}`, quote.Name, code, quote.Price, quote.ChangePct, quote.PreClose, quote.High, quote.Low)

	result := callLLMAPI(aiBaseURL, aiKey, aiModel, prompt)
	if result == "" {
		return generateTemplateAnalysis(quote)
	}

	// Parse AI response
	var parsed struct {
		Insights   string  `json:"insights"`
		Suggestion string  `json:"suggestion"`
		Trend      string  `json:"trend"`
		Sentiment  int     `json:"sentiment"`
		BuyPrice1  float64 `json:"buy_price_1"`
		BuyPrice2  float64 `json:"buy_price_2"`
		StopLoss   float64 `json:"stop_loss"`
		TakeProfit float64 `json:"take_profit"`
		Reason     string  `json:"reason"`
	}

	// Clean response - remove markdown code blocks if present
	cleaned := strings.TrimSpace(result)
	cleaned = strings.TrimPrefix(cleaned, "```json")
	cleaned = strings.TrimPrefix(cleaned, "```")
	cleaned = strings.TrimSuffix(cleaned, "```")
	cleaned = strings.TrimSpace(cleaned)

	if err := json.Unmarshal([]byte(cleaned), &parsed); err != nil {
		log.Printf("[Decision] AI response parse error: %v, raw: %s", err, result[:min(200, len(result))])
		return generateTemplateAnalysis(quote)
	}

	return aiAnalysisResult{
		Insights:   parsed.Insights,
		Suggestion: parsed.Suggestion,
		Trend:      parsed.Trend,
		Sentiment:  parsed.Sentiment,
		BuyPrice1:  parsed.BuyPrice1,
		BuyPrice2:  parsed.BuyPrice2,
		StopLoss:   parsed.StopLoss,
		TakeProfit: parsed.TakeProfit,
		Reason:     parsed.Reason,
	}
}

func generateTemplateAnalysis(quote *stockQuoteInfo) aiAnalysisResult {
	// Heuristic-based template analysis when AI is not configured
	suggestion := "观望"
	trend := "震荡"
	sentiment := 50

	if quote.ChangePct > 5 {
		suggestion = "观望"
		trend = "上涨"
		sentiment = 75
	} else if quote.ChangePct > 2 {
		suggestion = "观望"
		trend = "上涨"
		sentiment = 65
	} else if quote.ChangePct < -5 {
		suggestion = "观望"
		trend = "下跌"
		sentiment = 25
	} else if quote.ChangePct < -2 {
		suggestion = "观望"
		trend = "下跌"
		sentiment = 35
	}

	// Calculate strategy points
	buyPrice1 := quote.Price * 0.97
	buyPrice2 := quote.Price * 0.95
	stopLoss := quote.Price * 0.92
	takeProfit := quote.Price * 1.08

	insights := fmt.Sprintf("%s（%s）当前价%.2f元，涨跌幅%.2f%%。技术面分析：股价处于%s趋势，建议%s。请配置AI模型后获取更精准的分析结果。",
		quote.Name, quote.Code, quote.Price, quote.ChangePct, trend, suggestion)

	return aiAnalysisResult{
		Insights:   insights,
		Suggestion: suggestion,
		Trend:      trend,
		Sentiment:  sentiment,
		BuyPrice1:  buyPrice1,
		BuyPrice2:  buyPrice2,
		StopLoss:   stopLoss,
		TakeProfit: takeProfit,
		Reason:     "模板分析，请配置AI模型",
	}
}

// Built-in Deepseek V4 model configuration (hardcoded fallback)
const (
	builtinAIBaseURL = "https://api.deepseek.com"
	builtinAIAPIKey  = "sk-333cd19a71b448139bbccc06ccdd651a"
	builtinAIModel   = "deepseek-v4-pro"
)

func getDecisionAIConfig() (baseURL, apiKey, modelName string) {
	// Priority: Check system_configs for decision AI settings
	var configs []model.SystemConfig
	repository.DB.Where("config_key LIKE 'ai_decision_%'").Find(&configs)

	for _, cfg := range configs {
		switch cfg.ConfigKey {
		case "ai_decision_base_url":
			baseURL = cfg.ConfigValue
		case "ai_decision_api_key":
			apiKey = cfg.ConfigValue
		case "ai_decision_model":
			modelName = cfg.ConfigValue
		}
	}

	// Fallback to AI providers table
	if baseURL == "" || apiKey == "" {
		var provider model.AIProvider
		if err := repository.DB.Where("is_enabled = ? AND category = 'llm'", true).
			Order("is_default DESC").First(&provider).Error; err == nil {
			if baseURL == "" {
				baseURL = provider.BaseURL
			}
			if apiKey == "" {
				apiKey = provider.APIKey
			}
			if modelName == "" {
				modelName = provider.Model
			}
		}
	}

	// Final fallback: built-in Deepseek V4 config
	if baseURL == "" {
		baseURL = builtinAIBaseURL
	}
	if apiKey == "" {
		apiKey = builtinAIAPIKey
	}
	if modelName == "" {
		modelName = builtinAIModel
	}

	return
}

func callLLMAPI(baseURL, apiKey, model, prompt string) string {
	if baseURL == "" || apiKey == "" {
		return ""
	}

	// Ensure baseURL ends with /v1/chat/completions
	endpoint := strings.TrimRight(baseURL, "/")
	if !strings.HasSuffix(endpoint, "/chat/completions") {
		if !strings.HasSuffix(endpoint, "/v1") {
			endpoint += "/v1"
		}
		endpoint += "/chat/completions"
	}

	reqBody := map[string]interface{}{
		"model": model,
		"messages": []map[string]string{
			{"role": "system", "content": "你是专业A股分析师，严格按JSON格式输出分析结果。"},
			{"role": "user", "content": prompt},
		},
		"temperature": 0.3,
		"max_tokens":  2000,
	}

	jsonBody, _ := json.Marshal(reqBody)
	req, _ := http.NewRequest("POST", endpoint, strings.NewReader(string(jsonBody)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[Decision] AI API error: %v", err)
		return ""
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		log.Printf("[Decision] AI API status %d: %s", resp.StatusCode, string(body[:min(200, len(body))]))
		return ""
	}

	var result struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.Unmarshal(body, &result); err != nil {
		return ""
	}
	if len(result.Choices) > 0 {
		return result.Choices[0].Message.Content
	}
	return ""
}

// ==================== Market Review ====================

func generateMarketReview() MarketReview {
	tradeDate := findLatestTradeDateStr()
	displayDate := formatTradeDateForDisplay(tradeDate)

	// Get market data from Tushare daily
	snapshot := fetchTushareMarketDaily(tradeDate)

	review := MarketReview{
		TradeDate: displayDate,
	}

	if snapshot != nil {
		review.UpCount = snapshot.UpCount
		review.DownCount = snapshot.DownCount
		review.LimitUp = snapshot.LimitUpCount
	}

	// Fallback: AkShare for up/down counts if Tushare returned zeros
	if review.UpCount == 0 && review.DownCount == 0 {
		// Try Eastmoney up/down index fields first
		emUp, emDown, _ := fetchUpDownFromIndices()
		if emUp > 0 || emDown > 0 {
			review.UpCount = emUp
			review.DownCount = emDown
			log.Printf("[MarketReview] Up/Down from Eastmoney: up=%d, down=%d", emUp, emDown)
		}
	}

	// Fallback: AkShare market_overview for up/down counts
	if review.UpCount == 0 && review.DownCount == 0 {
		akOverview := fetchAkShareMarketOverview(tradeDate)
		if akOverview != nil {
			if up, ok := akOverview["up_count"].(int); ok && up > 0 {
				review.UpCount = up
			}
			if down, ok := akOverview["down_count"].(int); ok && down > 0 {
				review.DownCount = down
			}
			log.Printf("[MarketReview] Up/Down from AkShare overview: up=%d, down=%d", review.UpCount, review.DownCount)
		}
	}

	// Fallback: AkShare for limit_up/down counts
	if review.LimitUp == 0 {
		akUp, akDown, _, akHighest, _, _ := fetchAkShareMarketStats(tradeDate)
		if akUp > 0 {
			review.LimitUp = akUp
			if akHighest > review.HighestBoard {
				review.HighestBoard = akHighest
			}
			log.Printf("[MarketReview] LimitUp from AkShare: up=%d, down=%d, highest=%d", akUp, akDown, akHighest)
		}
	}

	// Get indices
	indices := fetchMajorIndicesRobust()
	for _, idx := range indices {
		code, _ := idx["code"].(string)
		price, _ := idx["price"].(float64)
		pct, _ := idx["change_pct"].(float64)
		switch code {
		case "000001":
			review.IndexSH = price
			review.IndexSHPct = pct
		case "399001":
			review.IndexSZ = price
			review.IndexSZPct = pct
		case "399006":
			review.IndexCYB = price
			review.IndexCYBPct = pct
		}
	}

	// Get sentiment from DB
	var sentiment model.MarketSentiment
	if err := repository.DB.Where("trade_date = ?", displayDate).First(&sentiment).Error; err == nil {
		review.HighestBoard = sentiment.HighestBoard
		if review.LimitUp == 0 {
			review.LimitUp = sentiment.LimitUpCount
		}
		if review.UpCount == 0 {
			review.UpCount = sentiment.UpCount
		}
		if review.DownCount == 0 {
			review.DownCount = sentiment.DownCount
		}
	}

	// Get hot sectors
	conceptHeat := fetchTushareIndustryHeat(tradeDate)
	if len(conceptHeat) == 0 {
		conceptHeat = fetchConceptHeatFromEastmoney()
	}
	if len(conceptHeat) > 5 {
		conceptHeat = conceptHeat[:5]
	}
	if conceptHeat == nil {
		conceptHeat = []gin.H{}
	}
	if hotJSON, err := json.Marshal(conceptHeat); err == nil {
		review.HotSectors = string(hotJSON)
	}

	// Generate AI summary
	aiBaseURL, aiKey, aiModel := getDecisionAIConfig()
	if aiBaseURL != "" && aiKey != "" {
		prompt := fmt.Sprintf(`请对今日A股大盘进行简短复盘总结（100字以内）。数据：
- 上证指数: %.2f (%.2f%%)
- 深证成指: %.2f (%.2f%%)
- 创业板指: %.2f (%.2f%%)
- 上涨: %d家, 下跌: %d家
- 涨停: %d只, 最高板: %d连板
请给出操作建议(加仓/减仓/观望)和市场趋势(多头/空头/震荡)`,
			review.IndexSH, review.IndexSHPct,
			review.IndexSZ, review.IndexSZPct,
			review.IndexCYB, review.IndexCYBPct,
			review.UpCount, review.DownCount,
			review.LimitUp, review.HighestBoard)

		aiResult := callLLMAPI(aiBaseURL, aiKey, aiModel, prompt)
		if aiResult != "" {
			review.Summary = aiResult
			// Try to extract suggestion and trend
			if strings.Contains(aiResult, "加仓") {
				review.Suggestion = "加仓"
			} else if strings.Contains(aiResult, "减仓") {
				review.Suggestion = "减仓"
			} else {
				review.Suggestion = "观望"
			}
			if strings.Contains(aiResult, "多头") {
				review.MarketTrend = "多头"
			} else if strings.Contains(aiResult, "空头") {
				review.MarketTrend = "空头"
			} else {
				review.MarketTrend = "震荡"
			}
		}
	}

	if review.Summary == "" {
		// Template summary
		direction := "震荡"
		if review.IndexSHPct > 1 {
			direction = "上涨"
		} else if review.IndexSHPct < -1 {
			direction = "下跌"
		}
		review.Summary = fmt.Sprintf("今日大盘%s，上证指数%.2f点(%.2f%%)，上涨%d家/下跌%d家，涨停%d只。请配置AI模型获取更详细复盘。",
			direction, review.IndexSH, review.IndexSHPct, review.UpCount, review.DownCount, review.LimitUp)
		review.Suggestion = "观望"
		review.MarketTrend = "震荡"
	}

	return review
}

// ==================== Push Notification ====================

func sendTestNotification(config PushConfig) error {
	message := fmt.Sprintf("【A股买卖决策系统】推送测试成功！\n时间: %s\n渠道: %s",
		time.Now().Format("2006-01-02 15:04:05"), config.Channel)

	switch config.Channel {
	case "wechat_work":
		return sendWeChatWorkMessage(config.WebhookURL, message)
	case "feishu":
		return sendFeishuMessage(config.WebhookURL, message)
	case "email":
		return sendEmailMessage(config, message)
	}
	return fmt.Errorf("未知推送渠道: %s", config.Channel)
}

func sendWeChatWorkMessage(webhookURL, message string) error {
	if webhookURL == "" {
		return fmt.Errorf("企业微信Webhook URL未配置")
	}
	body := map[string]interface{}{
		"msgtype": "text",
		"text": map[string]string{
			"content": message,
		},
	}
	jsonBody, _ := json.Marshal(body)
	resp, err := http.Post(webhookURL, "application/json", strings.NewReader(string(jsonBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("企业微信返回状态码: %d", resp.StatusCode)
	}
	return nil
}

func sendFeishuMessage(webhookURL, message string) error {
	if webhookURL == "" {
		return fmt.Errorf("飞书Webhook URL未配置")
	}
	body := map[string]interface{}{
		"msg_type": "text",
		"content": map[string]string{
			"text": message,
		},
	}
	jsonBody, _ := json.Marshal(body)
	resp, err := http.Post(webhookURL, "application/json", strings.NewReader(string(jsonBody)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return fmt.Errorf("飞书返回状态码: %d", resp.StatusCode)
	}
	return nil
}

func sendEmailMessage(config PushConfig, message string) error {
	// Email sending would require SMTP - just validate config exists
	if config.Extra == "" {
		return fmt.Errorf("邮箱配置信息未填写")
	}
	log.Printf("[Push] Email notification would be sent: %s", message[:min(100, len(message))])
	// TODO: Implement SMTP sending
	return nil
}

// ==================== Stock News Feed ====================

// GetStockNews handles GET /api/decision/news?code=xxx
func (h *Handler) GetStockNews(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		response.Success(c, []gin.H{})
		return
	}

	// Get stock name for search
	name := ""
	var decision StockDecision
	if err := repository.DB.Where("code = ?", code).Order("analyzed_at DESC").First(&decision).Error; err == nil {
		name = decision.Name
	}

	news := fetchStockNewsFromEastmoney(code, name)
	response.Success(c, news)
}

func fetchStockNewsFromEastmoney(code, name string) []gin.H {
	// Use Eastmoney stock comment/news API
	searchKey := code
	if name != "" {
		searchKey = name
	}

	url := fmt.Sprintf("https://searchapi.eastmoney.com/api/Info/Search?appkey=600a9aa1e5084a1ba41720e7bd0f5b0c&type=1&searchkey=%s&pageindex=1&pagesize=8", searchKey)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		log.Printf("[Decision] News fetch error: %v", err)
		return generateFallbackNews(code, name)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var raw map[string]interface{}
	if err := json.Unmarshal(body, &raw); err != nil {
		return generateFallbackNews(code, name)
	}

	var news []gin.H
	if dataList, ok := raw["Data"].([]interface{}); ok {
		for _, item := range dataList {
			if m, ok := item.(map[string]interface{}); ok {
				title := ""
				summary := ""
				source := ""
				dateStr := ""
				link := ""

				if t, ok := m["Title"].(string); ok {
					title = t
				}
				if s, ok := m["Content"].(string); ok {
					summary = s
					if len(summary) > 120 {
						summary = summary[:120] + "..."
					}
				}
				if s, ok := m["SourceName"].(string); ok {
					source = s
				}
				if d, ok := m["Date"].(string); ok {
					dateStr = d
				}
				if u, ok := m["ArticleUrl"].(string); ok {
					link = u
				}

				if title != "" {
					news = append(news, gin.H{
						"title":   title,
						"summary": summary,
						"source":  source,
						"date":    dateStr,
						"link":    link,
					})
				}
			}
		}
	}

	if len(news) == 0 {
		return generateFallbackNews(code, name)
	}

	return news
}

func generateFallbackNews(code, name string) []gin.H {
	if name == "" {
		name = code
	}
	now := time.Now().Format("2006-01-02")
	return []gin.H{
		{
			"title":   fmt.Sprintf("%s(%s) - 行业深度分析报告", name, code),
			"summary": "暂无实时资讯，请稍后刷新获取最新消息。配置AI模型后可获取更多分析。",
			"source":  "系统提示",
			"date":    now,
			"link":    fmt.Sprintf("https://quote.eastmoney.com/%s.html", code),
		},
	}
}
