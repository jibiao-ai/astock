package handler

import (
	"log"
	"strings"
	"time"

	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ==================== Models for Broadcast Data ====================

// TsStockBasic stores 股票基础信息
type TsStockBasic struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TsCode     string    `gorm:"size:20;uniqueIndex:idx_tsb_code" json:"ts_code"`
	Symbol     string    `gorm:"size:10" json:"symbol"`
	Name       string    `gorm:"size:50;index:idx_tsb_name" json:"name"`
	Area       string    `gorm:"size:20" json:"area"`
	Industry   string    `gorm:"size:50" json:"industry"`
	Market     string    `gorm:"size:20" json:"market"`
	ListDate   string    `gorm:"size:10" json:"list_date"`
	ListStatus string    `gorm:"size:5" json:"list_status"`
	IsHs       string    `gorm:"size:5" json:"is_hs"`
	ActName    string    `gorm:"size:100" json:"act_name"`
	CnSpell    string    `gorm:"size:50" json:"cnspell"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// TsStockST stores ST股票列表
type TsStockST struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TsCode    string    `gorm:"size:20;index:idx_tsst_code" json:"ts_code"`
	Name      string    `gorm:"size:50" json:"name"`
	TradeDate string    `gorm:"size:10;index:idx_tsst_date" json:"trade_date"`
	Type      string    `gorm:"size:10" json:"type"`
	TypeName  string    `gorm:"size:50" json:"type_name"`
	CreatedAt time.Time `json:"created_at"`
}

// TsStockHSGT stores 沪深港通股票
type TsStockHSGT struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TsCode    string    `gorm:"size:20;index:idx_tshsgt_code" json:"ts_code"`
	TradeDate string    `gorm:"size:10;index:idx_tshsgt_date" json:"trade_date"`
	Type      string    `gorm:"size:10" json:"type"`
	Name      string    `gorm:"size:50" json:"name"`
	TypeName  string    `gorm:"size:50" json:"type_name"`
	CreatedAt time.Time `json:"created_at"`
}

// TsStkPremarket stores 盘前股本
type TsStkPremarket struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TradeDate  string    `gorm:"size:10;index:idx_tspm_date" json:"trade_date"`
	TsCode     string    `gorm:"size:20;index:idx_tspm_code" json:"ts_code"`
	TotalShare float64   `json:"total_share"`
	FloatShare float64   `json:"float_share"`
	PreClose   float64   `json:"pre_close"`
	UpLimit    float64   `json:"up_limit"`
	DownLimit  float64   `json:"down_limit"`
	CreatedAt  time.Time `json:"created_at"`
}

// TsFinaIncome stores 利润表摘要
type TsFinaIncome struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TsCode       string    `gorm:"size:20;index:idx_tsfi_code" json:"ts_code"`
	AnnDate      string    `gorm:"size:10;index:idx_tsfi_ann" json:"ann_date"`
	EndDate      string    `gorm:"size:10" json:"end_date"`
	ReportType   string    `gorm:"size:5" json:"report_type"`
	BasicEps     float64   `json:"basic_eps"`
	TotalRevenue float64   `json:"total_revenue"`
	Revenue      float64   `json:"revenue"`
	OperateProfit float64  `json:"operate_profit"`
	TotalProfit  float64   `json:"total_profit"`
	NIncome      float64   `json:"n_income"`
	NIncomeAttrP float64   `json:"n_income_attr_p"`
	CreatedAt    time.Time `json:"created_at"`
}

// TsFinaBalance stores 资产负债表摘要
type TsFinaBalance struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TsCode        string    `gorm:"size:20;index:idx_tsfb_code" json:"ts_code"`
	AnnDate       string    `gorm:"size:10;index:idx_tsfb_ann" json:"ann_date"`
	EndDate       string    `gorm:"size:10" json:"end_date"`
	ReportType    string    `gorm:"size:5" json:"report_type"`
	TotalAssets   float64   `json:"total_assets"`
	TotalLiab     float64   `json:"total_liab"`
	TotalHldrEqy  float64   `json:"total_hldr_eqy"`
	MoneyCap      float64   `json:"money_cap"`
	AccountsRecv  float64   `json:"accounts_receiv"`
	Inventories   float64   `json:"inventories"`
	CreatedAt     time.Time `json:"created_at"`
}

// TsFinaCashflow stores 现金流量表摘要
type TsFinaCashflow struct {
	ID              uint      `gorm:"primaryKey" json:"id"`
	TsCode          string    `gorm:"size:20;index:idx_tsfc_code" json:"ts_code"`
	AnnDate         string    `gorm:"size:10;index:idx_tsfc_ann" json:"ann_date"`
	EndDate         string    `gorm:"size:10" json:"end_date"`
	ReportType      string    `gorm:"size:5" json:"report_type"`
	NCashflowAct    float64   `json:"n_cashflow_act"`
	NCashflowInvAct float64   `json:"n_cashflow_inv_act"`
	NCashFlowsFncAct float64  `json:"n_cash_flows_fnc_act"`
	FreeCashflow    float64   `json:"free_cashflow"`
	CreatedAt       time.Time `json:"created_at"`
}

// TsFinaForecast stores 业绩预告
type TsFinaForecast struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TsCode       string    `gorm:"size:20;index:idx_tsff_code" json:"ts_code"`
	AnnDate      string    `gorm:"size:10;index:idx_tsff_ann" json:"ann_date"`
	EndDate      string    `gorm:"size:10" json:"end_date"`
	Type         string    `gorm:"size:20" json:"type"`
	PChangeMin   float64   `json:"p_change_min"`
	PChangeMax   float64   `json:"p_change_max"`
	NetProfitMin float64   `json:"net_profit_min"`
	NetProfitMax float64   `json:"net_profit_max"`
	Summary      string    `gorm:"size:2000" json:"summary"`
	CreatedAt    time.Time `json:"created_at"`
}

// TsFinaExpress stores 业绩快报
type TsFinaExpress struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TsCode      string    `gorm:"size:20;index:idx_tsfe_code" json:"ts_code"`
	AnnDate     string    `gorm:"size:10;index:idx_tsfe_ann" json:"ann_date"`
	EndDate     string    `gorm:"size:10" json:"end_date"`
	Revenue     float64   `json:"revenue"`
	OperateProfit float64 `json:"operate_profit"`
	NIncome     float64   `json:"n_income"`
	TotalAssets float64   `json:"total_assets"`
	DilutedEps  float64   `json:"diluted_eps"`
	DilutedRoe  float64   `json:"diluted_roe"`
	YoySales    float64   `json:"yoy_sales"`
	YoyDeduNp   float64   `json:"yoy_dedu_np"`
	PerfSummary string    `gorm:"size:2000" json:"perf_summary"`
	CreatedAt   time.Time `json:"created_at"`
}

// TsFinaAudit stores 财务审计意见
type TsFinaAudit struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	TsCode      string    `gorm:"size:20;index:idx_tsfa_code" json:"ts_code"`
	AnnDate     string    `gorm:"size:10;index:idx_tsfa_ann" json:"ann_date"`
	EndDate     string    `gorm:"size:10" json:"end_date"`
	AuditResult string    `gorm:"size:100" json:"audit_result"`
	AuditAgency string    `gorm:"size:200" json:"audit_agency"`
	AuditSign   string    `gorm:"size:200" json:"audit_sign"`
	CreatedAt   time.Time `json:"created_at"`
}

// TsFinaMainbz stores 主营业务构成
type TsFinaMainbz struct {
	ID       uint      `gorm:"primaryKey" json:"id"`
	TsCode   string    `gorm:"size:20;index:idx_tsfm_code" json:"ts_code"`
	EndDate  string    `gorm:"size:10;index:idx_tsfm_end" json:"end_date"`
	BzItem   string    `gorm:"size:200" json:"bz_item"`
	BzSales  float64   `json:"bz_sales"`
	BzProfit float64   `json:"bz_profit"`
	BzCost   float64   `json:"bz_cost"`
	CreatedAt time.Time `json:"created_at"`
}

// TsFinaIndicator stores 财务指标摘要
type TsFinaIndicator struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	TsCode         string    `gorm:"size:20;index:idx_tsfind_code" json:"ts_code"`
	AnnDate        string    `gorm:"size:10;index:idx_tsfind_ann" json:"ann_date"`
	EndDate        string    `gorm:"size:10" json:"end_date"`
	Eps            float64   `json:"eps"`
	Roe            float64   `json:"roe"`
	RoeWaa         float64   `json:"roe_waa"`
	GrossProfitMargin float64 `json:"grossprofit_margin"`
	NetProfitMargin float64  `json:"netprofit_margin"`
	DebtToAssets   float64   `json:"debt_to_assets"`
	CurrentRatio   float64   `json:"current_ratio"`
	NetprofitYoy   float64   `json:"netprofit_yoy"`
	OrYoy          float64   `json:"or_yoy"`
	Bps            float64   `json:"bps"`
	CreatedAt      time.Time `json:"created_at"`
}

// AutoMigrateBroadcastModels migrates broadcast-related models
func AutoMigrateBroadcastModels(db *gorm.DB) {
	db.AutoMigrate(
		&TsStockBasic{},
		&TsStockST{},
		&TsStockHSGT{},
		&TsStkPremarket{},
		&TsFinaIncome{},
		&TsFinaBalance{},
		&TsFinaCashflow{},
		&TsFinaForecast{},
		&TsFinaExpress{},
		&TsFinaAudit{},
		&TsFinaMainbz{},
		&TsFinaIndicator{},
	)
	log.Println("[Broadcast] Broadcast models migrated")

	// Pre-load stock basic list in background
	go ensureStockBasicList()
}

// ensureStockBasicList loads stock basic info
func ensureStockBasicList() {
	var count int64
	repository.DB.Model(&TsStockBasic{}).Count(&count)
	if count > 100 {
		return // Already have data
	}
	log.Println("[Broadcast] Loading stock_basic list...")
	fetchAndSaveStockBasic()
}

func fetchAndSaveStockBasic() {
	resp, err := callTushareAPI("stock_basic", map[string]string{
		"list_status": "L",
	}, "ts_code,symbol,name,area,industry,market,list_date,list_status,is_hs,act_name,cnspell")
	if err != nil {
		log.Printf("[Broadcast] stock_basic API error: %v", err)
		return
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return
	}

	items := make([]TsStockBasic, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsStockBasic{
			TsCode:     tsString(row, "ts_code"),
			Symbol:     tsString(row, "symbol"),
			Name:       tsString(row, "name"),
			Area:       tsString(row, "area"),
			Industry:   tsString(row, "industry"),
			Market:     tsString(row, "market"),
			ListDate:   tsString(row, "list_date"),
			ListStatus: tsString(row, "list_status"),
			IsHs:       tsString(row, "is_hs"),
			ActName:    tsString(row, "act_name"),
			CnSpell:    tsString(row, "cnspell"),
		})
	}

	tx := repository.DB.Begin()
	tx.Where("1 = 1").Delete(&TsStockBasic{})
	if err := tx.CreateInBatches(&items, 200).Error; err != nil {
		tx.Rollback()
		log.Printf("[Broadcast] stock_basic insert error: %v", err)
		return
	}
	tx.Commit()
	log.Printf("[Broadcast] Saved %d stock_basic records", len(items))
}

// ==================== Handler: GetBroadcastMarket ====================
// Returns market broadcast data: ST stocks, HSGT stocks, premarket data
func (h *Handler) GetBroadcastMarket(c *gin.Context) {
	category := c.DefaultQuery("category", "overview")
	keyword := c.DefaultQuery("keyword", "")
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))

	switch category {
	case "st":
		h.getBroadcastST(c, tradeDate, keyword)
	case "hsgt":
		h.getBroadcastHSGT(c, tradeDate, keyword)
	case "premarket":
		h.getBroadcastPremarket(c, tradeDate, keyword)
	case "company":
		h.getBroadcastCompany(c, keyword)
	default:
		h.getBroadcastOverview(c, tradeDate, keyword)
	}
}

func (h *Handler) getBroadcastOverview(c *gin.Context, tradeDate string, keyword string) {
	// Return summary: ST count, HSGT count, total stocks, recent IPOs
	var totalStocks int64
	repository.DB.Model(&TsStockBasic{}).Where("list_status = ?", "L").Count(&totalStocks)

	// ST count from DB
	var stCount int64
	repository.DB.Model(&TsStockST{}).Where("trade_date = ?", tradeDate).Count(&stCount)

	// If no ST data, try to fetch
	if stCount == 0 {
		fetchAndSaveStockST(tradeDate)
		repository.DB.Model(&TsStockST{}).Where("trade_date = ?", tradeDate).Count(&stCount)
	}

	// HSGT count
	var hsgtCount int64
	repository.DB.Model(&TsStockHSGT{}).Where("trade_date = ?", tradeDate).Count(&hsgtCount)

	// Recent IPO (listed in last 30 days)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("20060102")
	var ipoCount int64
	repository.DB.Model(&TsStockBasic{}).Where("list_date >= ? AND list_status = ?", thirtyDaysAgo, "L").Count(&ipoCount)

	var recentIPOs []TsStockBasic
	repository.DB.Where("list_date >= ? AND list_status = ?", thirtyDaysAgo, "L").
		Order("list_date DESC").Limit(20).Find(&recentIPOs)

	ipoList := []gin.H{}
	for _, ipo := range recentIPOs {
		ipoList = append(ipoList, gin.H{
			"code":      tsCodeToCode(ipo.TsCode),
			"name":      ipo.Name,
			"industry":  ipo.Industry,
			"area":      ipo.Area,
			"list_date": formatTradeDateForDisplay(ipo.ListDate),
			"market":    ipo.Market,
		})
	}

	response.Success(c, gin.H{
		"trade_date":   formatTradeDateForDisplay(tradeDate),
		"total_stocks": totalStocks,
		"st_count":     stCount,
		"hsgt_count":   hsgtCount,
		"ipo_count":    ipoCount,
		"recent_ipos":  ipoList,
	})
}

func (h *Handler) getBroadcastST(c *gin.Context, tradeDate string, keyword string) {
	var count int64
	repository.DB.Model(&TsStockST{}).Where("trade_date = ?", tradeDate).Count(&count)
	if count == 0 {
		fetchAndSaveStockST(tradeDate)
	}

	query := repository.DB.Where("trade_date = ?", tradeDate)
	if keyword != "" {
		query = query.Where("name LIKE ? OR ts_code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var items []TsStockST
	query.Order("ts_code ASC").Limit(200).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code":      tsCodeToCode(item.TsCode),
			"name":      item.Name,
			"type":      item.Type,
			"type_name": item.TypeName,
		})
	}

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"category":   "st",
		"items":      results,
		"total":      len(results),
	})
}

func (h *Handler) getBroadcastHSGT(c *gin.Context, tradeDate string, keyword string) {
	var count int64
	repository.DB.Model(&TsStockHSGT{}).Where("trade_date = ?", tradeDate).Count(&count)
	if count == 0 {
		fetchAndSaveStockHSGT(tradeDate)
	}

	query := repository.DB.Where("trade_date = ?", tradeDate)
	if keyword != "" {
		query = query.Where("name LIKE ? OR ts_code LIKE ?", "%"+keyword+"%", "%"+keyword+"%")
	}

	var items []TsStockHSGT
	query.Order("type ASC, ts_code ASC").Limit(500).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code":      tsCodeToCode(item.TsCode),
			"name":      item.Name,
			"type":      item.Type,
			"type_name": item.TypeName,
		})
	}

	// Group by type
	typeGroups := map[string]int{}
	for _, item := range items {
		typeGroups[item.TypeName]++
	}

	response.Success(c, gin.H{
		"trade_date":  formatTradeDateForDisplay(tradeDate),
		"category":    "hsgt",
		"items":       results,
		"total":       len(results),
		"type_groups": typeGroups,
	})
}

func (h *Handler) getBroadcastPremarket(c *gin.Context, tradeDate string, keyword string) {
	var count int64
	repository.DB.Model(&TsStkPremarket{}).Where("trade_date = ?", tradeDate).Count(&count)
	if count == 0 {
		fetchAndSavePremarket(tradeDate)
	}

	query := repository.DB.Where("trade_date = ?", tradeDate)
	if keyword != "" {
		query = query.Where("ts_code LIKE ?", "%"+keyword+"%")
	}

	var items []TsStkPremarket
	query.Order("total_share DESC").Limit(100).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code":        tsCodeToCode(item.TsCode),
			"total_share": item.TotalShare,
			"float_share": item.FloatShare,
			"pre_close":   item.PreClose,
			"up_limit":    item.UpLimit,
			"down_limit":  item.DownLimit,
		})
	}

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"category":   "premarket",
		"items":      results,
		"total":      count,
	})
}

func (h *Handler) getBroadcastCompany(c *gin.Context, keyword string) {
	if keyword == "" {
		response.Success(c, gin.H{
			"category": "company",
			"items":    []gin.H{},
			"total":    0,
			"message":  "请输入股票代码或名称搜索",
		})
		return
	}

	var items []TsStockBasic
	repository.DB.Where("name LIKE ? OR ts_code LIKE ? OR symbol LIKE ? OR cnspell LIKE ?",
		"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+strings.ToLower(keyword)+"%").
		Limit(50).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code":     tsCodeToCode(item.TsCode),
			"name":     item.Name,
			"area":     item.Area,
			"industry": item.Industry,
			"market":   item.Market,
			"list_date": formatTradeDateForDisplay(item.ListDate),
			"is_hs":    item.IsHs,
			"act_name": item.ActName,
		})
	}

	response.Success(c, gin.H{
		"category": "company",
		"items":    results,
		"total":    len(results),
	})
}

// ==================== Handler: GetBroadcastFinance ====================
// Returns financial broadcast data: income, balance, cashflow, forecast, express, audit, mainbz, indicator
func (h *Handler) GetBroadcastFinance(c *gin.Context) {
	category := c.DefaultQuery("category", "forecast")
	keyword := c.DefaultQuery("keyword", "")
	tsCode := c.DefaultQuery("ts_code", "")

	// If keyword provided but no ts_code, try to resolve
	if tsCode == "" && keyword != "" {
		var stock TsStockBasic
		if err := repository.DB.Where("name = ? OR symbol = ? OR ts_code LIKE ?",
			keyword, keyword, "%"+keyword+"%").First(&stock).Error; err == nil {
			tsCode = stock.TsCode
		}
	}

	switch category {
	case "income":
		h.getBroadcastIncome(c, tsCode)
	case "balance":
		h.getBroadcastBalance(c, tsCode)
	case "cashflow":
		h.getBroadcastCashflow(c, tsCode)
	case "forecast":
		h.getBroadcastForecast(c, keyword)
	case "express":
		h.getBroadcastExpress(c, keyword)
	case "audit":
		h.getBroadcastAudit(c, tsCode)
	case "mainbz":
		h.getBroadcastMainbz(c, tsCode)
	case "indicator":
		h.getBroadcastIndicator(c, tsCode)
	default:
		h.getBroadcastForecast(c, keyword)
	}
}

func (h *Handler) getBroadcastForecast(c *gin.Context, keyword string) {
	// Get recent forecasts (last 30 days announcements)
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("20060102")

	var count int64
	repository.DB.Model(&TsFinaForecast{}).Where("ann_date >= ?", thirtyDaysAgo).Count(&count)
	if count == 0 {
		fetchAndSaveRecentForecasts()
	}

	query := repository.DB.Where("ann_date >= ?", thirtyDaysAgo)
	if keyword != "" {
		query = query.Where("ts_code LIKE ?", "%"+keyword+"%")
	}

	var items []TsFinaForecast
	query.Order("ann_date DESC").Limit(100).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		name := getStockName(item.TsCode)
		results = append(results, gin.H{
			"code":           tsCodeToCode(item.TsCode),
			"name":           name,
			"ann_date":       formatTradeDateForDisplay(item.AnnDate),
			"end_date":       formatTradeDateForDisplay(item.EndDate),
			"type":           item.Type,
			"p_change_min":   item.PChangeMin,
			"p_change_max":   item.PChangeMax,
			"net_profit_min": item.NetProfitMin,
			"net_profit_max": item.NetProfitMax,
			"summary":        item.Summary,
		})
	}

	response.Success(c, gin.H{
		"category": "forecast",
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastExpress(c *gin.Context, keyword string) {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("20060102")

	var count int64
	repository.DB.Model(&TsFinaExpress{}).Where("ann_date >= ?", thirtyDaysAgo).Count(&count)
	if count == 0 {
		fetchAndSaveRecentExpress()
	}

	query := repository.DB.Where("ann_date >= ?", thirtyDaysAgo)
	if keyword != "" {
		query = query.Where("ts_code LIKE ?", "%"+keyword+"%")
	}

	var items []TsFinaExpress
	query.Order("ann_date DESC").Limit(100).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		name := getStockName(item.TsCode)
		results = append(results, gin.H{
			"code":         tsCodeToCode(item.TsCode),
			"name":         name,
			"ann_date":     formatTradeDateForDisplay(item.AnnDate),
			"end_date":     formatTradeDateForDisplay(item.EndDate),
			"revenue":      item.Revenue,
			"n_income":     item.NIncome,
			"diluted_eps":  item.DilutedEps,
			"diluted_roe":  item.DilutedRoe,
			"yoy_sales":    item.YoySales,
			"yoy_dedu_np":  item.YoyDeduNp,
			"perf_summary": item.PerfSummary,
		})
	}

	response.Success(c, gin.H{
		"category": "express",
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastIncome(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "income", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaIncome{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveIncome(tsCode)
	}

	var items []TsFinaIncome
	repository.DB.Where("ts_code = ? AND report_type = ?", tsCode, "1").
		Order("end_date DESC").Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":       formatTradeDateForDisplay(item.EndDate),
			"ann_date":       formatTradeDateForDisplay(item.AnnDate),
			"basic_eps":      item.BasicEps,
			"total_revenue":  item.TotalRevenue,
			"revenue":        item.Revenue,
			"operate_profit": item.OperateProfit,
			"total_profit":   item.TotalProfit,
			"n_income":       item.NIncome,
			"n_income_attr_p": item.NIncomeAttrP,
		})
	}

	response.Success(c, gin.H{
		"category": "income",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastBalance(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "balance", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaBalance{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveBalance(tsCode)
	}

	var items []TsFinaBalance
	repository.DB.Where("ts_code = ? AND report_type = ?", tsCode, "1").
		Order("end_date DESC").Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":      formatTradeDateForDisplay(item.EndDate),
			"total_assets":  item.TotalAssets,
			"total_liab":    item.TotalLiab,
			"total_equity":  item.TotalHldrEqy,
			"money_cap":     item.MoneyCap,
			"accounts_recv": item.AccountsRecv,
			"inventories":   item.Inventories,
		})
	}

	response.Success(c, gin.H{
		"category": "balance",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastCashflow(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "cashflow", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaCashflow{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveCashflow(tsCode)
	}

	var items []TsFinaCashflow
	repository.DB.Where("ts_code = ? AND report_type = ?", tsCode, "1").
		Order("end_date DESC").Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":          formatTradeDateForDisplay(item.EndDate),
			"n_cashflow_act":    item.NCashflowAct,
			"n_cashflow_inv":    item.NCashflowInvAct,
			"n_cashflow_fnc":    item.NCashFlowsFncAct,
			"free_cashflow":     item.FreeCashflow,
		})
	}

	response.Success(c, gin.H{
		"category": "cashflow",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastAudit(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "audit", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaAudit{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveAudit(tsCode)
	}

	var items []TsFinaAudit
	repository.DB.Where("ts_code = ?", tsCode).Order("end_date DESC").Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":     formatTradeDateForDisplay(item.EndDate),
			"ann_date":     formatTradeDateForDisplay(item.AnnDate),
			"audit_result": item.AuditResult,
			"audit_agency": item.AuditAgency,
			"audit_sign":   item.AuditSign,
		})
	}

	response.Success(c, gin.H{
		"category": "audit",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastMainbz(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "mainbz", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaMainbz{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveMainbz(tsCode)
	}

	var items []TsFinaMainbz
	repository.DB.Where("ts_code = ?", tsCode).Order("end_date DESC, bz_sales DESC").Limit(50).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":  formatTradeDateForDisplay(item.EndDate),
			"bz_item":   item.BzItem,
			"bz_sales":  item.BzSales,
			"bz_profit": item.BzProfit,
			"bz_cost":   item.BzCost,
		})
	}

	response.Success(c, gin.H{
		"category": "mainbz",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

func (h *Handler) getBroadcastIndicator(c *gin.Context, tsCode string) {
	if tsCode == "" {
		response.Success(c, gin.H{"category": "indicator", "items": []gin.H{}, "message": "请输入股票代码"})
		return
	}

	var count int64
	repository.DB.Model(&TsFinaIndicator{}).Where("ts_code = ?", tsCode).Count(&count)
	if count == 0 {
		fetchAndSaveIndicator(tsCode)
	}

	var items []TsFinaIndicator
	repository.DB.Where("ts_code = ?", tsCode).Order("end_date DESC").Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"end_date":          formatTradeDateForDisplay(item.EndDate),
			"eps":               item.Eps,
			"roe":               item.Roe,
			"roe_waa":           item.RoeWaa,
			"grossprofit_margin": item.GrossProfitMargin,
			"netprofit_margin":  item.NetProfitMargin,
			"debt_to_assets":    item.DebtToAssets,
			"current_ratio":     item.CurrentRatio,
			"netprofit_yoy":     item.NetprofitYoy,
			"or_yoy":            item.OrYoy,
			"bps":               item.Bps,
		})
	}

	response.Success(c, gin.H{
		"category": "indicator",
		"ts_code":  tsCode,
		"name":     getStockName(tsCode),
		"items":    results,
		"total":    len(results),
	})
}

// ==================== Data Fetching Functions ====================

func getStockName(tsCode string) string {
	var stock TsStockBasic
	if err := repository.DB.Where("ts_code = ?", tsCode).First(&stock).Error; err == nil {
		return stock.Name
	}
	return ""
}

func fetchAndSaveStockST(tradeDate string) {
	resp, err := callTushareAPI("stock_st", map[string]string{
		"trade_date": tradeDate,
	}, "ts_code,name,trade_date,type,type_name")
	if err != nil {
		log.Printf("[Broadcast] stock_st error: %v", err)
		return
	}
	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return
	}

	items := make([]TsStockST, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsStockST{
			TsCode:    tsString(row, "ts_code"),
			Name:      tsString(row, "name"),
			TradeDate: tsString(row, "trade_date"),
			Type:      tsString(row, "type"),
			TypeName:  tsString(row, "type_name"),
		})
	}

	tx := repository.DB.Begin()
	tx.Where("trade_date = ?", tradeDate).Delete(&TsStockST{})
	tx.CreateInBatches(&items, 100)
	tx.Commit()
	log.Printf("[Broadcast] Saved %d ST stocks for %s", len(items), tradeDate)
}

func fetchAndSaveStockHSGT(tradeDate string) {
	types := []string{"HK_SZ", "HK_SH", "SZ_HK", "SH_HK"}
	allItems := make([]TsStockHSGT, 0, 1000)

	for _, t := range types {
		time.Sleep(300 * time.Millisecond)
		resp, err := callTushareAPI("stock_hsgt", map[string]string{
			"trade_date": tradeDate,
			"type":       t,
		}, "ts_code,trade_date,type,name,type_name")
		if err != nil {
			log.Printf("[Broadcast] stock_hsgt %s error: %v", t, err)
			continue
		}
		rows := tushareDataToMap(resp)
		for _, row := range rows {
			allItems = append(allItems, TsStockHSGT{
				TsCode:    tsString(row, "ts_code"),
				TradeDate: tsString(row, "trade_date"),
				Type:      tsString(row, "type"),
				Name:      tsString(row, "name"),
				TypeName:  tsString(row, "type_name"),
			})
		}
	}

	if len(allItems) > 0 {
		tx := repository.DB.Begin()
		tx.Where("trade_date = ?", tradeDate).Delete(&TsStockHSGT{})
		tx.CreateInBatches(&allItems, 200)
		tx.Commit()
		log.Printf("[Broadcast] Saved %d HSGT stocks for %s", len(allItems), tradeDate)
	}
}

func fetchAndSavePremarket(tradeDate string) {
	resp, err := callTushareAPI("stk_premarket", map[string]string{
		"trade_date": tradeDate,
	}, "trade_date,ts_code,total_share,float_share,pre_close,up_limit,down_limit")
	if err != nil {
		log.Printf("[Broadcast] stk_premarket error: %v", err)
		return
	}
	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return
	}

	items := make([]TsStkPremarket, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsStkPremarket{
			TradeDate:  tsString(row, "trade_date"),
			TsCode:     tsString(row, "ts_code"),
			TotalShare: tsFloat(row, "total_share"),
			FloatShare: tsFloat(row, "float_share"),
			PreClose:   tsFloat(row, "pre_close"),
			UpLimit:    tsFloat(row, "up_limit"),
			DownLimit:  tsFloat(row, "down_limit"),
		})
	}

	tx := repository.DB.Begin()
	tx.Where("trade_date = ?", tradeDate).Delete(&TsStkPremarket{})
	tx.CreateInBatches(&items, 200)
	tx.Commit()
	log.Printf("[Broadcast] Saved %d premarket records for %s", len(items), tradeDate)
}

func fetchAndSaveRecentForecasts() {
	// Fetch forecast_vip with recent announcements
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("20060102")
	today := time.Now().Format("20060102")

	resp, err := callTushareAPI("forecast_vip", map[string]string{
		"start_date": thirtyDaysAgo,
		"end_date":   today,
	}, "ts_code,ann_date,end_date,type,p_change_min,p_change_max,net_profit_min,net_profit_max,summary")
	if err != nil {
		log.Printf("[Broadcast] forecast_vip error: %v", err)
		return
	}
	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return
	}

	items := make([]TsFinaForecast, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaForecast{
			TsCode:       tsString(row, "ts_code"),
			AnnDate:      tsString(row, "ann_date"),
			EndDate:      tsString(row, "end_date"),
			Type:         tsString(row, "type"),
			PChangeMin:   tsFloat(row, "p_change_min"),
			PChangeMax:   tsFloat(row, "p_change_max"),
			NetProfitMin: tsFloat(row, "net_profit_min"),
			NetProfitMax: tsFloat(row, "net_profit_max"),
			Summary:      tsString(row, "summary"),
		})
	}

	tx := repository.DB.Begin()
	tx.Where("ann_date >= ?", thirtyDaysAgo).Delete(&TsFinaForecast{})
	tx.CreateInBatches(&items, 100)
	tx.Commit()
	log.Printf("[Broadcast] Saved %d forecast records", len(items))
}

func fetchAndSaveRecentExpress() {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30).Format("20060102")
	today := time.Now().Format("20060102")

	resp, err := callTushareAPI("express_vip", map[string]string{
		"start_date": thirtyDaysAgo,
		"end_date":   today,
	}, "ts_code,ann_date,end_date,revenue,operate_profit,n_income,total_assets,diluted_eps,diluted_roe,yoy_sales,yoy_dedu_np,perf_summary")
	if err != nil {
		log.Printf("[Broadcast] express_vip error: %v", err)
		return
	}
	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		return
	}

	items := make([]TsFinaExpress, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaExpress{
			TsCode:       tsString(row, "ts_code"),
			AnnDate:      tsString(row, "ann_date"),
			EndDate:      tsString(row, "end_date"),
			Revenue:      tsFloat(row, "revenue"),
			OperateProfit: tsFloat(row, "operate_profit"),
			NIncome:      tsFloat(row, "n_income"),
			TotalAssets:  tsFloat(row, "total_assets"),
			DilutedEps:   tsFloat(row, "diluted_eps"),
			DilutedRoe:   tsFloat(row, "diluted_roe"),
			YoySales:     tsFloat(row, "yoy_sales"),
			YoyDeduNp:    tsFloat(row, "yoy_dedu_np"),
			PerfSummary:  tsString(row, "perf_summary"),
		})
	}

	tx := repository.DB.Begin()
	tx.Where("ann_date >= ?", thirtyDaysAgo).Delete(&TsFinaExpress{})
	tx.CreateInBatches(&items, 100)
	tx.Commit()
	log.Printf("[Broadcast] Saved %d express records", len(items))
}

func fetchAndSaveIncome(tsCode string) {
	resp, err := callTushareAPI("income", map[string]string{
		"ts_code": tsCode,
	}, "ts_code,ann_date,end_date,report_type,basic_eps,total_revenue,revenue,operate_profit,total_profit,n_income,n_income_attr_p")
	if err != nil {
		log.Printf("[Broadcast] income error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaIncome, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaIncome{
			TsCode:        tsString(row, "ts_code"),
			AnnDate:       tsString(row, "ann_date"),
			EndDate:       tsString(row, "end_date"),
			ReportType:    tsString(row, "report_type"),
			BasicEps:      tsFloat(row, "basic_eps"),
			TotalRevenue:  tsFloat(row, "total_revenue"),
			Revenue:       tsFloat(row, "revenue"),
			OperateProfit: tsFloat(row, "operate_profit"),
			TotalProfit:   tsFloat(row, "total_profit"),
			NIncome:       tsFloat(row, "n_income"),
			NIncomeAttrP:  tsFloat(row, "n_income_attr_p"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaIncome{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

func fetchAndSaveBalance(tsCode string) {
	resp, err := callTushareAPI("balancesheet", map[string]string{
		"ts_code": tsCode,
	}, "ts_code,ann_date,end_date,report_type,total_assets,total_liab,total_hldr_eqy_inc_min_int,money_cap,accounts_receiv,inventories")
	if err != nil {
		log.Printf("[Broadcast] balancesheet error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaBalance, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaBalance{
			TsCode:       tsString(row, "ts_code"),
			AnnDate:      tsString(row, "ann_date"),
			EndDate:      tsString(row, "end_date"),
			ReportType:   tsString(row, "report_type"),
			TotalAssets:  tsFloat(row, "total_assets"),
			TotalLiab:    tsFloat(row, "total_liab"),
			TotalHldrEqy: tsFloat(row, "total_hldr_eqy_inc_min_int"),
			MoneyCap:     tsFloat(row, "money_cap"),
			AccountsRecv: tsFloat(row, "accounts_receiv"),
			Inventories:  tsFloat(row, "inventories"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaBalance{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

func fetchAndSaveCashflow(tsCode string) {
	resp, err := callTushareAPI("cashflow", map[string]string{
		"ts_code": tsCode,
	}, "ts_code,ann_date,end_date,report_type,n_cashflow_act,n_cashflow_inv_act,n_cash_flows_fnc_act,free_cashflow")
	if err != nil {
		log.Printf("[Broadcast] cashflow error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaCashflow, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaCashflow{
			TsCode:           tsString(row, "ts_code"),
			AnnDate:          tsString(row, "ann_date"),
			EndDate:          tsString(row, "end_date"),
			ReportType:       tsString(row, "report_type"),
			NCashflowAct:     tsFloat(row, "n_cashflow_act"),
			NCashflowInvAct:  tsFloat(row, "n_cashflow_inv_act"),
			NCashFlowsFncAct: tsFloat(row, "n_cash_flows_fnc_act"),
			FreeCashflow:     tsFloat(row, "free_cashflow"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaCashflow{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

func fetchAndSaveAudit(tsCode string) {
	resp, err := callTushareAPI("fina_audit", map[string]string{
		"ts_code": tsCode,
	}, "ts_code,ann_date,end_date,audit_result,audit_agency,audit_sign")
	if err != nil {
		log.Printf("[Broadcast] fina_audit error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaAudit, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaAudit{
			TsCode:      tsString(row, "ts_code"),
			AnnDate:     tsString(row, "ann_date"),
			EndDate:     tsString(row, "end_date"),
			AuditResult: tsString(row, "audit_result"),
			AuditAgency: tsString(row, "audit_agency"),
			AuditSign:   tsString(row, "audit_sign"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaAudit{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

func fetchAndSaveMainbz(tsCode string) {
	resp, err := callTushareAPI("fina_mainbz", map[string]string{
		"ts_code": tsCode,
		"type":    "P",
	}, "ts_code,end_date,bz_item,bz_sales,bz_profit,bz_cost")
	if err != nil {
		log.Printf("[Broadcast] fina_mainbz error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaMainbz, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaMainbz{
			TsCode:  tsString(row, "ts_code"),
			EndDate: tsString(row, "end_date"),
			BzItem:  tsString(row, "bz_item"),
			BzSales: tsFloat(row, "bz_sales"),
			BzProfit: tsFloat(row, "bz_profit"),
			BzCost:  tsFloat(row, "bz_cost"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaMainbz{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

func fetchAndSaveIndicator(tsCode string) {
	resp, err := callTushareAPI("fina_indicator", map[string]string{
		"ts_code": tsCode,
	}, "ts_code,ann_date,end_date,eps,roe,roe_waa,grossprofit_margin,netprofit_margin,debt_to_assets,current_ratio,netprofit_yoy,or_yoy,bps")
	if err != nil {
		log.Printf("[Broadcast] fina_indicator error for %s: %v", tsCode, err)
		return
	}
	rows := tushareDataToMap(resp)
	items := make([]TsFinaIndicator, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsFinaIndicator{
			TsCode:            tsString(row, "ts_code"),
			AnnDate:           tsString(row, "ann_date"),
			EndDate:           tsString(row, "end_date"),
			Eps:               tsFloat(row, "eps"),
			Roe:               tsFloat(row, "roe"),
			RoeWaa:            tsFloat(row, "roe_waa"),
			GrossProfitMargin: tsFloat(row, "grossprofit_margin"),
			NetProfitMargin:   tsFloat(row, "netprofit_margin"),
			DebtToAssets:      tsFloat(row, "debt_to_assets"),
			CurrentRatio:      tsFloat(row, "current_ratio"),
			NetprofitYoy:     tsFloat(row, "netprofit_yoy"),
			OrYoy:            tsFloat(row, "or_yoy"),
			Bps:              tsFloat(row, "bps"),
		})
	}
	if len(items) > 0 {
		repository.DB.Where("ts_code = ?", tsCode).Delete(&TsFinaIndicator{})
		repository.DB.CreateInBatches(&items, 100)
	}
}

// ==================== Handler: GetBroadcastSearch ====================
// Quick stock search for broadcast pages
func (h *Handler) GetBroadcastSearch(c *gin.Context) {
	keyword := c.DefaultQuery("keyword", "")
	if keyword == "" {
		response.Success(c, gin.H{"items": []gin.H{}, "total": 0})
		return
	}

	var items []TsStockBasic
	repository.DB.Where("name LIKE ? OR ts_code LIKE ? OR symbol LIKE ? OR cnspell LIKE ?",
		"%"+keyword+"%", "%"+keyword+"%", "%"+keyword+"%", "%"+strings.ToLower(keyword)+"%").
		Limit(20).Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"ts_code":  item.TsCode,
			"code":     tsCodeToCode(item.TsCode),
			"name":     item.Name,
			"industry": item.Industry,
			"market":   item.Market,
		})
	}

	response.Success(c, gin.H{"items": results, "total": len(results)})
}
