package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"quantmind/internal/middleware"
	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type Handler struct{}

func New() *Handler { return &Handler{} }

// ==================== Auth ====================

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	var user model.User
	if err := repository.DB.Where("username = ?", req.Username).First(&user).Error; err != nil {
		response.Unauthorized(c, "用户不存在")
		return
	}

	if !user.IsActive {
		response.Unauthorized(c, "账户已禁用")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		response.Unauthorized(c, "密码错误")
		return
	}

	token, err := middleware.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		response.InternalError(c, "生成令牌失败")
		return
	}

	// Audit login
	repository.DB.Create(&model.AuditLog{
		UserID: user.ID, Username: user.Username,
		Module: "login", Action: "login", Target: "auth",
		Detail: "用户登录成功", IP: c.ClientIP(), Status: "success",
	})

	response.Success(c, gin.H{
		"token": token,
		"user": gin.H{
			"id": user.ID, "username": user.Username,
			"display_name": user.DisplayName, "role": user.Role,
			"email": user.Email, "avatar": user.Avatar,
		},
	})
}

func (h *Handler) GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var user model.User
	repository.DB.First(&user, userID)
	response.Success(c, user)
}

// ==================== Dashboard ====================

func (h *Handler) GetDashboard(c *gin.Context) {
	var agentCount, userCount, conversationCount, quoteCount int64
	var auditCount, signalCount int64
	repository.DB.Model(&model.Agent{}).Count(&agentCount)
	repository.DB.Model(&model.User{}).Count(&userCount)
	repository.DB.Model(&model.Conversation{}).Count(&conversationCount)
	repository.DB.Model(&model.StockQuote{}).Count(&quoteCount)
	repository.DB.Model(&model.AuditLog{}).Count(&auditCount)
	repository.DB.Model(&model.StrategySignal{}).Count(&signalCount)

	// Get today's market overview
	today := time.Now().Format("2006-01-02")
	var sentiment model.MarketSentiment
	repository.DB.Where("trade_date = ?", today).First(&sentiment)

	response.Success(c, gin.H{
		"stats": gin.H{
			"agents":        agentCount,
			"users":         userCount,
			"conversations": conversationCount,
			"stock_quotes":  quoteCount,
			"audit_logs":    auditCount,
			"strategy_signals": signalCount,
		},
		"market_sentiment": sentiment,
	})
}

// ==================== Market Sentiment & Data ====================

func (h *Handler) GetMarketSentiment(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	days, _ := strconv.Atoi(c.DefaultQuery("days", "7"))

	var sentiments []model.MarketSentiment
	repository.DB.Where("trade_date <= ?", date).Order("trade_date desc").Limit(days).Find(&sentiments)

	response.Success(c, sentiments)
}

func (h *Handler) GetSectorHeat(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "30"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 200 {
		pageSize = 30
	}

	today := time.Now().Format("2006-01-02")

	// Try fetching real-time data first
	allSectors := fetchAllSectorOrConcept("sector")

	if len(allSectors) > 0 {
		// Persist to DB
		go persistSectorHeatData(allSectors, "sector", today)
	} else {
		// Fallback: read from DB
		var dbRecords []model.SectorHeat
		repository.DB.Where("trade_date = ? AND category = ?", today, "sector").Order("change_pct desc").Find(&dbRecords)
		for _, r := range dbRecords {
			allSectors = append(allSectors, gin.H{
				"name": r.Name, "code": r.Code, "change_pct": r.ChangePct,
				"net_flow": r.NetFlow, "flow_in": r.FlowIn, "flow_out": r.FlowOut,
				"lead_stock": r.LeadStock, "price": r.Amount, "net_pct": r.NetPct,
			})
		}
	}

	// Paginate
	total := len(allSectors)
	start := (page - 1) * pageSize
	end := start + pageSize
	if start > total {
		start = total
	}
	if end > total {
		end = total
	}
	paged := allSectors[start:end]

	response.Success(c, gin.H{
		"items":       paged,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (total + pageSize - 1) / pageSize,
	})
}

func (h *Handler) GetLimitUpBoard(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	limitType := c.DefaultQuery("type", "")
	query := repository.DB.Where("trade_date = ?", date)
	if limitType != "" {
		query = query.Where("limit_type = ?", limitType)
	}
	var boards []model.LimitUpBoard
	query.Order("board_count desc, fund_amount desc").Find(&boards)
	response.Success(c, boards)
}

func (h *Handler) GetDragonTiger(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	var data []model.DragonTiger
	repository.DB.Where("trade_date = ?", date).Order("net_amount desc").Find(&data)
	response.Success(c, data)
}

func (h *Handler) GetBoardLadder(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	var boards []model.LimitUpBoard
	repository.DB.Where("trade_date = ? AND limit_type = ?", date, "limit_up").
		Order("board_count desc").Find(&boards)

	// Build ladder structure
	ladder := make(map[int][]model.LimitUpBoard)
	maxBoard := 0
	for _, b := range boards {
		ladder[b.BoardCount] = append(ladder[b.BoardCount], b)
		if b.BoardCount > maxBoard {
			maxBoard = b.BoardCount
		}
	}
	response.Success(c, gin.H{"ladder": ladder, "max_board": maxBoard})
}

// ==================== Real-time Market Data ====================

func (h *Handler) GetStockQuote(c *gin.Context) {
	code := c.Query("code")
	source := c.DefaultQuery("source", "tushare")
	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	// Try to get from database first (cached)
	var quote model.StockQuote
	today := time.Now().Format("2006-01-02")
	err := repository.DB.Where("code = ? AND trade_date = ?", code, today).
		Order("created_at desc").First(&quote).Error

	if err == nil {
		response.Success(c, quote)
		return
	}

	// Try Tushare first
	tushareQuote := fetchSingleStockQuoteTushare(code)
	if tushareQuote != nil && tushareQuote.Price > 0 {
		tushareQuote.Source = "tushare"
		tushareQuote.TradeDate = today
		repository.DB.Create(tushareQuote)
		response.Success(c, tushareQuote)
		return
	}

	// Fallback to external source
	quoteData, fetchErr := fetchQuoteFromSource(code, source)
	if fetchErr != nil {
		response.InternalError(c, "获取行情数据失败: "+fetchErr.Error())
		return
	}

	// Save to database
	quoteData.Source = source
	quoteData.TradeDate = today
	repository.DB.Create(&quoteData)

	response.Success(c, quoteData)
}

func (h *Handler) GetKLine(c *gin.Context) {
	code := c.Query("code")
	period := c.DefaultQuery("period", "day")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "120"))

	if code == "" {
		response.BadRequest(c, "请提供股票代码")
		return
	}

	var klines []model.KLineData
	repository.DB.Where("code = ? AND period = ?", code, period).
		Order("trade_date desc").Limit(limit).Find(&klines)

	response.Success(c, klines)
}

func (h *Handler) GetSectorList(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	var sectors []model.SectorHeat
	repository.DB.Where("trade_date = ?", date).Order("net_flow desc").Find(&sectors)
	response.Success(c, sectors)
}

// fetchQuoteFromSource fetches real-time data from sina/tencent/eastmoney
func fetchQuoteFromSource(code, source string) (*model.StockQuote, error) {
	var url string
	switch source {
	case "sina":
		prefix := "sh"
		if strings.HasPrefix(code, "0") || strings.HasPrefix(code, "3") {
			prefix = "sz"
		}
		url = fmt.Sprintf("https://hq.sinajs.cn/list=%s%s", prefix, code)
	case "tencent":
		prefix := "sh"
		if strings.HasPrefix(code, "0") || strings.HasPrefix(code, "3") {
			prefix = "sz"
		}
		url = fmt.Sprintf("https://qt.gtimg.cn/q=%s%s", prefix, code)
	case "eastmoney":
		secid := "1." + code
		if strings.HasPrefix(code, "0") || strings.HasPrefix(code, "3") {
			secid = "0." + code
		}
		url = fmt.Sprintf("https://push2.eastmoney.com/api/qt/stock/get?secid=%s&fields=f43,f44,f45,f46,f47,f48,f50,f51,f52,f55,f57,f58,f60,f116,f117", secid)
	default:
		url = fmt.Sprintf("https://hq.sinajs.cn/list=sh%s", code)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Referer", "https://finance.sina.com.cn")
	req.Header.Set("User-Agent", "Mozilla/5.0")

	resp, err := client.Do(req)
	if err != nil {
		return &model.StockQuote{Code: code, Name: "数据获取中"}, nil
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	quote := parseQuoteResponse(code, source, string(body))
	return quote, nil
}

func parseQuoteResponse(code, source, body string) *model.StockQuote {
	quote := &model.StockQuote{Code: code}

	switch source {
	case "sina":
		// Parse sina format: var hq_str_sh600519="贵州茅台,1800.00,..."
		parts := strings.Split(body, "\"")
		if len(parts) >= 2 {
			fields := strings.Split(parts[1], ",")
			if len(fields) >= 32 {
				quote.Name = fields[0]
				quote.Open, _ = strconv.ParseFloat(fields[1], 64)
				quote.PreClose, _ = strconv.ParseFloat(fields[2], 64)
				quote.Price, _ = strconv.ParseFloat(fields[3], 64)
				quote.High, _ = strconv.ParseFloat(fields[4], 64)
				quote.Low, _ = strconv.ParseFloat(fields[5], 64)
				quote.Volume, _ = strconv.ParseFloat(fields[8], 64)
				quote.Amount, _ = strconv.ParseFloat(fields[9], 64)
				if quote.PreClose > 0 {
					quote.Change = quote.Price - quote.PreClose
					quote.ChangePct = (quote.Change / quote.PreClose) * 100
				}
			}
		}
	case "eastmoney":
		var result map[string]interface{}
		if json.Unmarshal([]byte(body), &result) == nil {
			if data, ok := result["data"].(map[string]interface{}); ok {
				quote.Name, _ = data["f58"].(string)
				quote.Price, _ = data["f43"].(float64)
				quote.High, _ = data["f44"].(float64)
				quote.Low, _ = data["f45"].(float64)
				quote.Open, _ = data["f46"].(float64)
				quote.Volume, _ = data["f47"].(float64)
				quote.Amount, _ = data["f48"].(float64)
				quote.PreClose, _ = data["f60"].(float64)
				// Note: Eastmoney returns prices in yuan directly, no scaling needed
				if quote.PreClose > 0 {
					quote.Change = quote.Price - quote.PreClose
					quote.ChangePct = (quote.Change / quote.PreClose) * 100
				}
			}
		}
	default:
		quote.Name = "数据解析中"
	}

	return quote
}

// ==================== AI Agents ====================

func (h *Handler) ListAgents(c *gin.Context) {
	var agents []model.Agent
	repository.DB.Where("is_active = ?", true).Find(&agents)
	response.Success(c, agents)
}

func (h *Handler) GetAgent(c *gin.Context) {
	id := c.Param("id")
	var agent model.Agent
	if err := repository.DB.First(&agent, id).Error; err != nil {
		response.BadRequest(c, "智能体不存在")
		return
	}
	// Get skills
	var skills []model.Skill
	repository.DB.Joins("JOIN agent_skills ON agent_skills.skill_id = skills.id").
		Where("agent_skills.agent_id = ?", id).Find(&skills)

	response.Success(c, gin.H{"agent": agent, "skills": skills})
}

func (h *Handler) CreateAgent(c *gin.Context) {
	var agent model.Agent
	if err := c.ShouldBindJSON(&agent); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	userID, _ := c.Get("user_id")
	agent.CreatedBy = userID.(uint)
	repository.DB.Create(&agent)
	response.Success(c, agent)
}

func (h *Handler) UpdateAgent(c *gin.Context) {
	id := c.Param("id")
	var agent model.Agent
	if err := repository.DB.First(&agent, id).Error; err != nil {
		response.BadRequest(c, "智能体不存在")
		return
	}
	if err := c.ShouldBindJSON(&agent); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	repository.DB.Save(&agent)
	response.Success(c, agent)
}

func (h *Handler) DeleteAgent(c *gin.Context) {
	id := c.Param("id")
	repository.DB.Delete(&model.Agent{}, id)
	response.Success(c, nil)
}

// ==================== Skills ====================

func (h *Handler) ListSkills(c *gin.Context) {
	var skills []model.Skill
	repository.DB.Where("is_active = ?", true).Find(&skills)
	response.Success(c, skills)
}

func (h *Handler) GetAgentSkills(c *gin.Context) {
	id := c.Param("id")
	var skills []model.Skill
	repository.DB.Joins("JOIN agent_skills ON agent_skills.skill_id = skills.id").
		Where("agent_skills.agent_id = ?", id).Find(&skills)
	response.Success(c, skills)
}

func (h *Handler) BindAgentSkill(c *gin.Context) {
	var req struct {
		AgentID uint `json:"agent_id"`
		SkillID uint `json:"skill_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	repository.DB.Create(&model.AgentSkill{AgentID: req.AgentID, SkillID: req.SkillID})
	response.Success(c, nil)
}

// ==================== Conversations & Chat ====================

func (h *Handler) ListConversations(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var convs []model.Conversation
	repository.DB.Where("user_id = ?", userID).Order("updated_at desc").Find(&convs)
	response.Success(c, convs)
}

func (h *Handler) CreateConversation(c *gin.Context) {
	var conv model.Conversation
	if err := c.ShouldBindJSON(&conv); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	userID, _ := c.Get("user_id")
	conv.UserID = userID.(uint)
	repository.DB.Create(&conv)
	response.Success(c, conv)
}

func (h *Handler) DeleteConversation(c *gin.Context) {
	id := c.Param("id")
	repository.DB.Where("conversation_id = ?", id).Delete(&model.Message{})
	repository.DB.Delete(&model.Conversation{}, id)
	response.Success(c, nil)
}

func (h *Handler) GetMessages(c *gin.Context) {
	convID := c.Param("id")
	var messages []model.Message
	repository.DB.Where("conversation_id = ?", convID).Order("created_at asc").Find(&messages)
	response.Success(c, messages)
}

func (h *Handler) SendMessage(c *gin.Context) {
	convID := c.Param("id")
	var req struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	cid, _ := strconv.ParseUint(convID, 10, 32)

	// Save user message
	userMsg := model.Message{
		ConversationID: uint(cid),
		Role:           "user",
		Content:        req.Content,
	}
	repository.DB.Create(&userMsg)

	// Get conversation and agent
	var conv model.Conversation
	repository.DB.First(&conv, cid)

	var agent model.Agent
	repository.DB.First(&agent, conv.AgentID)

	// Get agent skills for context
	var skills []model.Skill
	repository.DB.Joins("JOIN agent_skills ON agent_skills.skill_id = skills.id").
		Where("agent_skills.agent_id = ?", agent.ID).Find(&skills)

	// Get conversation history
	var history []model.Message
	repository.DB.Where("conversation_id = ?", cid).Order("created_at asc").Limit(20).Find(&history)

	// Call AI with Hermes agent pattern
	aiResponse := callAIAgent(agent, skills, history, req.Content)

	// Save AI response
	aiMsg := model.Message{
		ConversationID: uint(cid),
		Role:           "assistant",
		Content:        aiResponse,
	}
	repository.DB.Create(&aiMsg)

	response.Success(c, gin.H{
		"user_message": userMsg,
		"ai_message":   aiMsg,
	})
}

// callAIAgent uses Hermes Agent pattern to call AI
func callAIAgent(agent model.Agent, skills []model.Skill, history []model.Message, userMessage string) string {
	// Get default or agent-specific provider
	var provider model.AIProvider
	if err := repository.DB.Where("is_default = ? AND is_enabled = ?", true, true).First(&provider).Error; err != nil {
		return "未配置AI模型提供商，请在「AI模型管理」页面配置API密钥"
	}

	if provider.APIKey == "" {
		return "AI模型API密钥未配置，请在「AI模型管理」页面填写API密钥后使用"
	}

	// Build Hermes agent messages
	messages := []map[string]string{
		{"role": "system", "content": buildSystemPrompt(agent, skills)},
	}

	// Add conversation history
	for _, msg := range history {
		messages = append(messages, map[string]string{
			"role": msg.Role, "content": msg.Content,
		})
	}
	messages = append(messages, map[string]string{
		"role": "user", "content": userMessage,
	})

	// Call LLM API
	reqBody := map[string]interface{}{
		"model":       provider.Model,
		"messages":    messages,
		"temperature": agent.Temperature,
		"max_tokens":  agent.MaxTokens,
	}

	jsonBody, _ := json.Marshal(reqBody)
	url := strings.TrimSuffix(provider.BaseURL, "/") + "/chat/completions"

	client := &http.Client{Timeout: 60 * time.Second}
	req, _ := http.NewRequest("POST", url, strings.NewReader(string(jsonBody)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+provider.APIKey)

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Sprintf("AI调用失败: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return "AI响应解析失败"
	}

	// Extract response content
	if choices, ok := result["choices"].([]interface{}); ok && len(choices) > 0 {
		if choice, ok := choices[0].(map[string]interface{}); ok {
			if message, ok := choice["message"].(map[string]interface{}); ok {
				if content, ok := message["content"].(string); ok {
					return content
				}
			}
		}
	}

	return "AI响应为空，请检查模型配置"
}

func buildSystemPrompt(agent model.Agent, skills []model.Skill) string {
	prompt := agent.SystemPrompt + "\n\n"
	if len(skills) > 0 {
		prompt += "【已装备技能/工具】\n"
		for _, skill := range skills {
			prompt += fmt.Sprintf("- %s: %s\n", skill.Name, skill.Description)
			if skill.ToolDefs != "" {
				prompt += fmt.Sprintf("  工具定义: %s\n", skill.ToolDefs)
			}
		}
	}
	prompt += "\n【Hermes Agent协议】\n"
	prompt += "1. 你是一个Hermes Agent，具有自我改进能力和持久记忆\n"
	prompt += "2. 每次交互后，总结学到的经验用于改进后续回答\n"
	prompt += "3. 使用<tool_call>标签调用工具获取实时数据\n"
	prompt += "4. 所有数据必须来自外部数据源（Baostock/东财/新浪等），禁止编造\n"
	prompt += "5. 回答必须引用具体数据和分析系统\n"
	return prompt
}

// ==================== AI Providers ====================

func (h *Handler) ListAIProviders(c *gin.Context) {
	var providers []model.AIProvider
	repository.DB.Find(&providers)
	response.Success(c, providers)
}

func (h *Handler) UpdateAIProvider(c *gin.Context) {
	id := c.Param("id")
	var provider model.AIProvider
	if err := repository.DB.First(&provider, id).Error; err != nil {
		response.BadRequest(c, "提供商不存在")
		return
	}

	var req model.AIProvider
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	repository.DB.Model(&provider).Updates(map[string]interface{}{
		"api_key":    req.APIKey,
		"base_url":   req.BaseURL,
		"model":      req.Model,
		"is_default": req.IsDefault,
		"is_enabled": req.IsEnabled,
		"label":      req.Label,
	})

	// If setting as default, unset others
	if req.IsDefault {
		repository.DB.Model(&model.AIProvider{}).Where("id != ?", id).Update("is_default", false)
	}

	response.Success(c, provider)
}

func (h *Handler) TestAIProvider(c *gin.Context) {
	id := c.Param("id")
	var provider model.AIProvider
	if err := repository.DB.First(&provider, id).Error; err != nil {
		response.BadRequest(c, "提供商不存在")
		return
	}

	if provider.APIKey == "" {
		response.BadRequest(c, "请先配置API密钥")
		return
	}

	// Test connection
	reqBody := map[string]interface{}{
		"model": provider.Model,
		"messages": []map[string]string{
			{"role": "user", "content": "回复OK"},
		},
		"max_tokens": 10,
	}
	jsonBody, _ := json.Marshal(reqBody)
	url := strings.TrimSuffix(provider.BaseURL, "/") + "/chat/completions"

	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("POST", url, strings.NewReader(string(jsonBody)))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+provider.APIKey)

	resp, err := client.Do(req)
	if err != nil {
		response.InternalError(c, "连接失败: "+err.Error())
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode == 200 {
		response.Success(c, gin.H{"status": "connected", "message": "连接成功"})
	} else {
		body, _ := io.ReadAll(resp.Body)
		response.InternalError(c, fmt.Sprintf("连接失败(HTTP %d): %s", resp.StatusCode, string(body)))
	}
}

func (h *Handler) CreateAIProvider(c *gin.Context) {
	var provider model.AIProvider
	if err := c.ShouldBindJSON(&provider); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	repository.DB.Create(&provider)
	response.Success(c, provider)
}

// ==================== Strategy Signals ====================

func (h *Handler) GetStrategySignals(c *gin.Context) {
	strategy := c.DefaultQuery("strategy", "")
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))

	query := repository.DB.Where("trade_date = ?", date)
	if strategy != "" {
		query = query.Where("strategy_name = ?", strategy)
	}

	var signals []model.StrategySignal
	query.Order("score desc").Limit(limit).Find(&signals)
	response.Success(c, signals)
}

func (h *Handler) GetStrategyList(c *gin.Context) {
	strategies := []gin.H{
		{"name": "dragon_board", "label": "龙头打板", "description": "Dragon Score 11因子/130分涨停板量化评分", "icon": "Crown"},
		{"name": "strong_pullback", "label": "强势回踩", "description": "11因子/180分+龙虎榜游资确认", "icon": "ArrowDownUp"},
		{"name": "trend_core", "label": "趋势核心", "description": "趋势池融合buypoint信号+板块核心股票", "icon": "TrendingUp"},
		{"name": "event_burst", "label": "事件爆发", "description": "七步闭环+产业链4层分级选股", "icon": "Zap"},
		{"name": "concept_core", "label": "概念核心", "description": "概念生命周期跟踪+板块趋势共振", "icon": "Lightbulb"},
		{"name": "auction_pick", "label": "竞价选股", "description": "黄金公式高开3-5%+竞价占比8-12%", "icon": "Timer"},
		{"name": "group_hug", "label": "反复抱团", "description": "全市场5步漏斗+8因子画像+反包监控", "icon": "Users"},
		{"name": "pre_market", "label": "盘前精选", "description": "AI策略精选+收盘自动结算+命中率统计", "icon": "Star"},
		{"name": "micro_overnight", "label": "微盘隔夜", "description": "两级过滤+情绪门控+弹性立场WR 72%", "icon": "Moon"},
	}
	response.Success(c, strategies)
}

// ==================== Users ====================

// UserRequest is used for Create/Update user requests.
// The User model has Password json:"-" which prevents JSON binding,
// so we need a dedicated request struct that CAN bind the password field.
type UserRequest struct {
	Username    string `json:"username"`
	Password    string `json:"password"`
	DisplayName string `json:"display_name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	IsActive    *bool  `json:"is_active"` // pointer to distinguish false from absent
}

func (h *Handler) ListUsers(c *gin.Context) {
	var users []model.User
	repository.DB.Find(&users)
	response.Success(c, users)
}

func (h *Handler) CreateUser(c *gin.Context) {
	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	// Validate required fields
	if req.Username == "" {
		response.BadRequest(c, "用户名不能为空")
		return
	}
	if req.Password == "" {
		response.BadRequest(c, "密码不能为空")
		return
	}

	// Check for duplicate username
	var existing model.User
	if err := repository.DB.Where("username = ?", req.Username).First(&existing).Error; err == nil {
		response.BadRequest(c, "用户名已存在")
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		response.InternalError(c, "密码加密失败")
		return
	}

	// Default is_active to true if not specified
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	user := model.User{
		Username:    req.Username,
		Password:    string(hashedPassword),
		DisplayName: req.DisplayName,
		Email:       req.Email,
		Role:        req.Role,
		IsActive:    isActive,
	}
	if user.Role == "" {
		user.Role = "user"
	}

	if err := repository.DB.Create(&user).Error; err != nil {
		response.InternalError(c, "创建用户失败: "+err.Error())
		return
	}
	response.Success(c, user)
}

func (h *Handler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	var user model.User
	if err := repository.DB.First(&user, id).Error; err != nil {
		response.BadRequest(c, "用户不存在")
		return
	}
	var req UserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}
	updates := map[string]interface{}{
		"display_name": req.DisplayName,
		"email":        req.Email,
		"role":         req.Role,
	}
	// Only update is_active if explicitly provided
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}
	if req.Password != "" {
		hp, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			response.InternalError(c, "密码加密失败")
			return
		}
		updates["password"] = string(hp)
	}
	repository.DB.Model(&user).Updates(updates)
	// Reload user to return fresh data
	repository.DB.First(&user, id)
	response.Success(c, user)
}

func (h *Handler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	repository.DB.Delete(&model.User{}, id)
	response.Success(c, nil)
}

// ==================== Audit Logs ====================

func (h *Handler) GetAuditLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	module := c.DefaultQuery("module", "")
	action := c.DefaultQuery("action", "")
	username := c.DefaultQuery("username", "")

	query := repository.DB.Model(&model.AuditLog{})
	if module != "" {
		query = query.Where("module = ?", module)
	}
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if username != "" {
		query = query.Where("username LIKE ?", "%"+username+"%")
	}

	var total int64
	query.Count(&total)

	var logs []model.AuditLog
	query.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Find(&logs)

	response.Success(c, gin.H{
		"total": total,
		"page":  page,
		"items": logs,
	})
}

// ==================== Utility: unused import fix ====================
var _ = gorm.ErrRecordNotFound

// ==================== Stock Picks (今日推荐) ====================

// CreateStockPick - Admin creates a stock recommendation
func (h *Handler) CreateStockPick(c *gin.Context) {
	var req struct {
		Code          string  `json:"code" binding:"required"`
		Name          string  `json:"name"`
		AttentionLow  float64 `json:"attention_low"`
		AttentionHigh float64 `json:"attention_high"`
		TargetLow     float64 `json:"target_low"`
		TargetHigh    float64 `json:"target_high"`
		Reason        string  `json:"reason"`
		PickDate      string  `json:"pick_date"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误: 请提供股票代码")
		return
	}

	userID, _ := c.Get("user_id")

	if req.PickDate == "" {
		req.PickDate = time.Now().Format("2006-01-02")
	}

	// Auto-fetch stock name from Eastmoney if not provided
	if req.Name == "" {
		req.Name = req.Code
	}

	pick := model.StockPick{
		Code:          req.Code,
		Name:          req.Name,
		AttentionLow:  req.AttentionLow,
		AttentionHigh: req.AttentionHigh,
		TargetLow:     req.TargetLow,
		TargetHigh:    req.TargetHigh,
		Reason:        req.Reason,
		PickDate:      req.PickDate,
		CreatedBy:     userID.(uint),
		IsActive:      true,
	}

	if err := repository.DB.Create(&pick).Error; err != nil {
		response.InternalError(c, "创建推荐失败")
		return
	}

	response.Success(c, pick)
}

// UpdateStockPick - Admin updates a stock recommendation
func (h *Handler) UpdateStockPick(c *gin.Context) {
	id := c.Param("id")
	var pick model.StockPick
	if err := repository.DB.First(&pick, id).Error; err != nil {
		response.BadRequest(c, "推荐记录不存在")
		return
	}

	var req struct {
		Code          string  `json:"code"`
		Name          string  `json:"name"`
		AttentionLow  float64 `json:"attention_low"`
		AttentionHigh float64 `json:"attention_high"`
		TargetLow     float64 `json:"target_low"`
		TargetHigh    float64 `json:"target_high"`
		Reason        string  `json:"reason"`
		PickDate      string  `json:"pick_date"`
		IsActive      *bool   `json:"is_active"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		response.BadRequest(c, "参数错误")
		return
	}

	updates := map[string]interface{}{}
	if req.Code != "" {
		updates["code"] = req.Code
	}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.AttentionLow > 0 {
		updates["attention_low"] = req.AttentionLow
	}
	if req.AttentionHigh > 0 {
		updates["attention_high"] = req.AttentionHigh
	}
	if req.TargetLow > 0 {
		updates["target_low"] = req.TargetLow
	}
	if req.TargetHigh > 0 {
		updates["target_high"] = req.TargetHigh
	}
	if req.Reason != "" {
		updates["reason"] = req.Reason
	}
	if req.PickDate != "" {
		updates["pick_date"] = req.PickDate
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	repository.DB.Model(&pick).Updates(updates)
	repository.DB.First(&pick, id)
	response.Success(c, pick)
}

// DeleteStockPick - Admin deletes a stock recommendation
func (h *Handler) DeleteStockPick(c *gin.Context) {
	id := c.Param("id")
	if err := repository.DB.Delete(&model.StockPick{}, id).Error; err != nil {
		response.InternalError(c, "删除失败")
		return
	}
	response.Success(c, nil)
}

// ListStockPicks - Admin lists all stock picks with filters
func (h *Handler) ListStockPicks(c *gin.Context) {
	date := c.DefaultQuery("date", "")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "50"))

	query := repository.DB.Model(&model.StockPick{})
	if date != "" {
		query = query.Where("pick_date = ?", date)
	}

	var total int64
	query.Count(&total)

	var picks []model.StockPick
	query.Order("pick_date DESC, created_at DESC").Offset((page - 1) * pageSize).Limit(pageSize).Find(&picks)

	response.Success(c, gin.H{
		"total": total,
		"page":  page,
		"items": picks,
	})
}

// GetTodayPicks - All authenticated users: get today's active recommendations
func (h *Handler) GetTodayPicks(c *gin.Context) {
	today := time.Now().Format("2006-01-02")
	date := c.DefaultQuery("date", today)

	var picks []model.StockPick
	repository.DB.Where("pick_date = ? AND is_active = ?", date, true).
		Order("created_at DESC").Find(&picks)

	response.Success(c, gin.H{
		"date":  date,
		"items": picks,
		"count": len(picks),
	})
}
