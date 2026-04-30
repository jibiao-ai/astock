package handler

import (
	"log"
	"math"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// ==================== DB Models for Dashboard Data ====================

// TsDragonTiger stores 龙虎榜每日明细 (top_list)
type TsDragonTiger struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TradeDate    string    `gorm:"size:10;index:idx_ts_dt_date" json:"trade_date"`
	TsCode       string    `gorm:"size:20;index:idx_ts_dt_code" json:"ts_code"`
	Name         string    `gorm:"size:50" json:"name"`
	Close        float64   `json:"close"`
	PctChange    float64   `json:"pct_change"`
	TurnoverRate float64   `json:"turnover_rate"`
	Amount       float64   `json:"amount"`
	LSell        float64   `json:"l_sell"`
	LBuy         float64   `json:"l_buy"`
	LAmount      float64   `json:"l_amount"`
	NetAmount    float64   `json:"net_amount"`
	NetRate      float64   `json:"net_rate"`
	AmountRate   float64   `json:"amount_rate"`
	FloatValues  float64   `json:"float_values"`
	Reason       string    `gorm:"size:500" json:"reason"`
	CreatedAt    time.Time `json:"created_at"`
}

// TsDragonTigerInst stores 龙虎榜机构明细 (top_inst)
type TsDragonTigerInst struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TradeDate string    `gorm:"size:10;index:idx_ts_dti_date" json:"trade_date"`
	TsCode    string    `gorm:"size:20;index:idx_ts_dti_code" json:"ts_code"`
	Exalter   string    `gorm:"size:200" json:"exalter"`
	Side      string    `gorm:"size:10" json:"side"`
	Buy       float64   `json:"buy"`
	BuyRate   float64   `json:"buy_rate"`
	Sell      float64   `json:"sell"`
	SellRate  float64   `json:"sell_rate"`
	NetBuy    float64   `json:"net_buy"`
	Reason    string    `gorm:"size:500" json:"reason"`
	CreatedAt time.Time `json:"created_at"`
}

// TsLimitList stores 涨跌停和炸板 (limit_list_d / limit_list_ths)
type TsLimitList struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TradeDate     string    `gorm:"size:10;index:idx_ts_ll_date" json:"trade_date"`
	TsCode        string    `gorm:"size:20;index:idx_ts_ll_code" json:"ts_code"`
	Industry      string    `gorm:"size:100" json:"industry"`
	Name          string    `gorm:"size:50" json:"name"`
	Close         float64   `json:"close"`
	PctChg        float64   `json:"pct_chg"`
	Amount        float64   `json:"amount"`
	LimitAmount   float64   `json:"limit_amount"`
	FloatMv       float64   `json:"float_mv"`
	TotalMv       float64   `json:"total_mv"`
	TurnoverRatio float64   `json:"turnover_ratio"`
	FdAmount      float64   `json:"fd_amount"`
	FirstTime     string    `gorm:"size:20" json:"first_time"`
	LastTime      string    `gorm:"size:20" json:"last_time"`
	OpenTimes     int       `json:"open_times"`
	UpStat        string    `gorm:"size:20" json:"up_stat"`
	LimitTimes    int       `json:"limit_times"`
	Limit         string    `gorm:"size:5;index:idx_ts_ll_limit" json:"limit"` // U/D/Z
	// New fields from limit_list_ths (同花顺涨跌停榜单)
	Tag           string    `gorm:"size:200" json:"tag"`            // 涨停标签（概念/题材）
	Status        string    `gorm:"size:50" json:"status"`          // 涨停状态（N连板、一字板、换手板、T字板）
	LuDesc        string    `gorm:"size:500" json:"lu_desc"`        // 涨停原因
	LimitType     string    `gorm:"size:20" json:"limit_type"`      // 板单类别（涨停池、跌停池、炸板池、连扳池）
	LimitOrder    float64   `json:"limit_order"`                    // 封单量(元)
	Turnover      float64   `json:"turnover"`                       // 成交额(元)
	RiseRate      float64   `json:"rise_rate"`                      // 涨速(%)
	DataSource    string    `gorm:"size:10" json:"data_source"`     // 数据来源: ths/tushare
	CreatedAt     time.Time `json:"created_at"`
}

// TsLimitStep stores 连板天梯 (limit_step)
type TsLimitStep struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	TradeDate string    `gorm:"size:10;index:idx_ts_ls_date" json:"trade_date"`
	TsCode    string    `gorm:"size:20" json:"ts_code"`
	Name      string    `gorm:"size:50" json:"name"`
	Nums      string    `gorm:"size:10" json:"nums"`
	CreatedAt time.Time `json:"created_at"`
}

// TsStkAuction stores 集合竞价 (stk_auction)
type TsStkAuction struct {
	ID           uint      `gorm:"primaryKey" json:"id"`
	TradeDate    string    `gorm:"size:10;index:idx_ts_sa_date" json:"trade_date"`
	TsCode       string    `gorm:"size:20;index:idx_ts_sa_code" json:"ts_code"`
	Name         string    `gorm:"size:50" json:"name"`
	Vol          float64   `json:"vol"`
	Price        float64   `json:"price"`
	Amount       float64   `json:"amount"`
	PreClose     float64   `json:"pre_close"`
	TurnoverRate float64   `json:"turnover_rate"`
	VolumeRatio  float64   `json:"volume_ratio"`
	FloatShare   float64   `json:"float_share"`
	CreatedAt    time.Time `json:"created_at"`
}

// TsMoneyflow stores 个股资金流向 (moneyflow) – top net flow
type TsMoneyflow struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	TradeDate     string    `gorm:"size:10;index:idx_ts_mf_date" json:"trade_date"`
	TsCode        string    `gorm:"size:20;index:idx_ts_mf_code" json:"ts_code"`
	Name          string    `gorm:"size:50" json:"name"`
	BuySmAmount   float64   `json:"buy_sm_amount"`
	SellSmAmount  float64   `json:"sell_sm_amount"`
	BuyMdAmount   float64   `json:"buy_md_amount"`
	SellMdAmount  float64   `json:"sell_md_amount"`
	BuyLgAmount   float64   `json:"buy_lg_amount"`
	SellLgAmount  float64   `json:"sell_lg_amount"`
	BuyElgAmount  float64   `json:"buy_elg_amount"`
	SellElgAmount float64   `json:"sell_elg_amount"`
	NetMfAmount   float64   `json:"net_mf_amount"`
	CreatedAt     time.Time `json:"created_at"`
}

// TsMoneyflowInd stores 行业/概念资金流向 (moneyflow_cnt_ths)
type TsMoneyflowInd struct {
	ID             uint      `gorm:"primaryKey" json:"id"`
	TradeDate      string    `gorm:"size:10;index:idx_ts_mfi_date" json:"trade_date"`
	TsCode         string    `gorm:"size:20" json:"ts_code"`
	Name           string    `gorm:"size:100" json:"name"`
	LeadStock      string    `gorm:"size:50" json:"lead_stock"`
	ClosePrice     float64   `json:"close_price"`
	PctChange      float64   `json:"pct_change"`
	IndustryIndex  float64   `json:"industry_index"`
	CompanyNum     int       `json:"company_num"`
	PctChangeStock float64   `json:"pct_change_stock"`
	NetBuyAmount   float64   `json:"net_buy_amount"`
	NetSellAmount  float64   `json:"net_sell_amount"`
	NetAmount      float64   `json:"net_amount"`
	CreatedAt      time.Time `json:"created_at"`
}

// TsHotMoneyList stores 游资名录 (hm_list) - maps trader names to associated seats
type TsHotMoneyList struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Name      string    `gorm:"size:100;index:idx_ts_hm_name" json:"name"`
	Desc      string    `gorm:"size:2000" json:"desc"`
	Orgs      string    `gorm:"size:5000" json:"orgs"` // comma-separated org/seat names
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// In-memory cache for hot money seat -> trader name mapping
var (
	hotMoneyMu       sync.RWMutex
	hotMoneySeatMap  map[string]string // seat keyword -> trader name
	hotMoneyLoaded   bool
	hotMoneyLoadTime time.Time
)

// AutoMigrateDashboardModels migrates all dashboard-related Tushare models
func AutoMigrateDashboardModels(db *gorm.DB) {
	db.AutoMigrate(
		&TsDragonTiger{},
		&TsDragonTigerInst{},
		&TsLimitList{},
		&TsLimitStep{},
		&TsStkAuction{},
		&TsMoneyflow{},
		&TsMoneyflowInd{},
		&TsHotMoneyList{},
	)
	log.Println("[Dashboard] Tushare dashboard models migrated")

	// Pre-load hot money list in background
	go ensureHotMoneyList()
}

// ensureHotMoneyList loads the hot money list from DB or fetches from Tushare API
func ensureHotMoneyList() {
	hotMoneyMu.RLock()
	// Refresh every 24 hours
	if hotMoneyLoaded && time.Since(hotMoneyLoadTime) < 24*time.Hour {
		hotMoneyMu.RUnlock()
		return
	}
	hotMoneyMu.RUnlock()

	// Check DB first
	var dbItems []TsHotMoneyList
	repository.DB.Find(&dbItems)

	if len(dbItems) == 0 {
		// Fetch from Tushare hm_list API
		log.Println("[HotMoneyList] No cached data, fetching from Tushare hm_list API...")
		fetchAndSaveHotMoneyList()
		repository.DB.Find(&dbItems)
	}

	if len(dbItems) == 0 {
		log.Println("[HotMoneyList] No hot money list data available, using hardcoded fallback")
		buildHotMoneySeatMapFromFallback()
		return
	}

	// Build seat->name mapping with multiple key strategies for better matching
	seatMap := make(map[string]string)
	for _, item := range dbItems {
		if item.Orgs == "" || item.Orgs == "[]" {
			continue
		}
		// Orgs can be in JSON array format ["org1", "org2"] or comma/、separated
		orgs := parseOrgsField(item.Orgs)
		for _, org := range orgs {
			org = strings.TrimSpace(org)
			if org == "" {
				continue
			}
			// Store full org name as key (exact match)
			seatMap[org] = item.Name

			// Also extract short key (remove common suffixes for fuzzy matching)
			shortKey := extractSeatShortKey(org)
			if shortKey != "" && shortKey != org {
				seatMap[shortKey] = item.Name
			}

			// Also extract location-based key for cross-broker matching
			locKey := extractSeatLocationKey(org)
			if locKey != "" && len([]rune(locKey)) >= 4 {
				// Only store location key if it's specific enough
				// Use format "broker+location" as secondary key
				broker := extractBrokerName(org)
				if broker != "" {
					seatMap[broker+locKey] = item.Name
				}
			}
		}
	}

	hotMoneyMu.Lock()
	hotMoneySeatMap = seatMap
	hotMoneyLoaded = true
	hotMoneyLoadTime = time.Now()
	hotMoneyMu.Unlock()

	// Also merge hardcoded fallback seats (lower priority, won't overwrite API data)
	fallback := getHotMoneySeatsMap()
	hotMoneyMu.Lock()
	for seat, name := range fallback {
		if _, exists := hotMoneySeatMap[seat]; !exists {
			hotMoneySeatMap[seat] = name
		}
	}
	finalCount := len(hotMoneySeatMap)
	hotMoneyMu.Unlock()
	log.Printf("[HotMoneyList] Loaded %d seat mappings from %d API traders + hardcoded fallback (total: %d)", len(seatMap), len(dbItems), finalCount)
}

// extractSeatShortKey extracts a shorter matchable key from a full seat name
// e.g. "华泰证券股份有限公司上海武定路证券营业部" -> "华泰证券上海武定路"
func extractSeatShortKey(org string) string {
	// Remove common suffixes in order (longer first)
	suffixes := []string{
		"证券营业部", "营业部", "分公司",
		"证券有限责任公司", "股份有限公司",
		"有限责任公司", "有限公司",
		"第一证券", "第二证券",
	}
	result := org
	for _, suffix := range suffixes {
		result = strings.ReplaceAll(result, suffix, "")
	}
	result = strings.TrimSpace(result)
	if result == "" || result == org {
		return ""
	}
	return result
}

// extractSeatLocationKey extracts just the securities company + location from a seat name
// e.g. "华泰证券股份有限公司上海武定路证券营业部" -> "上海武定路"
// This helps match when the broker name changes but the location stays the same
func extractSeatLocationKey(org string) string {
	// Remove company name prefix patterns
	prefixes := []string{
		"股份有限公司", "有限责任公司", "有限公司",
		"证券", "证券股份",
	}
	// First, extract the part after the company name
	result := org
	for _, prefix := range prefixes {
		idx := strings.Index(result, prefix)
		if idx > 0 {
			result = result[idx+len(prefix):]
			break
		}
	}
	// Remove trailing suffixes
	trailingSuffixes := []string{"证券营业部", "营业部", "分公司"}
	for _, s := range trailingSuffixes {
		result = strings.TrimSuffix(result, s)
	}
	result = strings.TrimSpace(result)
	if result == "" || result == org || len([]rune(result)) < 3 {
		return ""
	}
	return result
}

// extractBrokerName extracts the securities company short name from a full seat name
// e.g. "华泰证券股份有限公司上海武定路证券营业部" -> "华泰"
func extractBrokerName(org string) string {
	// Find "证券" and take what's before it (the broker brand)
	idx := strings.Index(org, "证券")
	if idx > 0 && idx <= 12 { // broker names are typically 2-4 Chinese chars
		return org[:idx]
	}
	return ""
}

// parseOrgsField parses the orgs field which can be in JSON array format or comma/、separated
func parseOrgsField(orgsStr string) []string {
	orgsStr = strings.TrimSpace(orgsStr)
	if orgsStr == "" || orgsStr == "[]" {
		return nil
	}

	// Try JSON array format: ["org1", "org2"]
	if strings.HasPrefix(orgsStr, "[") && strings.HasSuffix(orgsStr, "]") {
		// Remove brackets
		inner := orgsStr[1 : len(orgsStr)-1]
		if inner == "" {
			return nil
		}
		// Split by ", " pattern (JSON array elements)
		parts := strings.Split(inner, "\", \"")
		result := make([]string, 0, len(parts))
		for _, p := range parts {
			p = strings.Trim(p, "\" ")
			p = strings.TrimSpace(p)
			if p != "" {
				result = append(result, p)
			}
		}
		if len(result) > 0 {
			return result
		}
	}

	// Try 、separated (Chinese enumeration comma)
	if strings.Contains(orgsStr, "、") {
		return strings.Split(orgsStr, "、")
	}

	// Try comma separated
	if strings.Contains(orgsStr, ",") {
		return strings.Split(orgsStr, ",")
	}

	// Single org
	return []string{orgsStr}
}

// matchHotMoneyTraderName finds the trader name for a given seat/exalter name
// Uses multi-level matching: exact > short key > location key > fuzzy contains
func matchHotMoneyTraderName(exalter string) string {
	hotMoneyMu.RLock()
	seatMap := hotMoneySeatMap
	hotMoneyMu.RUnlock()

	if seatMap == nil || exalter == "" {
		return ""
	}

	// Special cases - direct keyword match for well-known seats
	if exalter == "机构专用" || strings.HasPrefix(exalter, "机构专用") {
		return "机构"
	}
	if exalter == "沪股通专用" {
		return "沪股通"
	}
	if exalter == "深股通专用" {
		return "深股通"
	}

	// 1. Exact match first (highest priority)
	if name, ok := seatMap[exalter]; ok {
		return name
	}

	// 2. Try normalized short key match (strip common suffixes)
	shortKey := extractSeatShortKey(exalter)
	if shortKey != "" {
		if name, ok := seatMap[shortKey]; ok {
			return name
		}
	}

	// 3. Try location-based key match
	locKey := extractSeatLocationKey(exalter)
	if locKey != "" {
		// Check if any known key contains this location
		for key, name := range seatMap {
			keyLen := len([]rune(key))
			if keyLen >= 4 && keyLen <= 30 {
				if strings.Contains(key, locKey) || strings.Contains(locKey, key) {
					return name
				}
			}
		}
	}

	// 4. Fuzzy matching - try partial contains between shortKey and known keys
	if shortKey != "" {
		shortKeyRunes := len([]rune(shortKey))
		for key, name := range seatMap {
			keyLen := len([]rune(key))
			if keyLen >= 4 && keyLen <= 25 && shortKeyRunes >= 4 {
				if strings.Contains(shortKey, key) || strings.Contains(key, shortKey) {
					return name
				}
			}
		}
	}

	// 5. Last resort: try to match any distinctive substring (city + road patterns)
	// e.g., if exalter contains "益田路" and a known key also contains "益田路"
	for key, name := range seatMap {
		keyLen := len([]rune(key))
		if keyLen >= 6 && keyLen <= 20 {
			// Extract the location part from the known key
			keyLoc := extractSeatLocationKey(key)
			if keyLoc != "" && len([]rune(keyLoc)) >= 4 {
				if strings.Contains(exalter, keyLoc) {
					return name
				}
			}
		}
	}

	return ""
}

// fetchAndSaveHotMoneyList fetches hm_list from Tushare and saves to DB
func fetchAndSaveHotMoneyList() {
	resp, err := callTushareAPI("hm_list", map[string]string{}, "name,desc,orgs")
	if err != nil {
		log.Printf("[HotMoneyList] hm_list API error: %v", err)
		return
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Println("[HotMoneyList] hm_list returned no data")
		return
	}

	items := make([]TsHotMoneyList, 0, len(rows))
	for _, row := range rows {
		name := tsString(row, "name")
		if name == "" {
			continue
		}
		items = append(items, TsHotMoneyList{
			Name: name,
			Desc: tsString(row, "desc"),
			Orgs: tsString(row, "orgs"),
		})
	}

	if len(items) == 0 {
		return
	}

	// Replace all existing data
	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[HotMoneyList] begin tx error: %v", tx.Error)
		return
	}
	tx.Where("1 = 1").Delete(&TsHotMoneyList{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[HotMoneyList] batch insert error: %v", err)
		return
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[HotMoneyList] commit error: %v", err)
		return
	}
	log.Printf("[HotMoneyList] Saved %d hot money traders from Tushare hm_list", len(items))
}

// buildHotMoneySeatMapFromFallback builds seat map from the hardcoded eastmoney fallback
func buildHotMoneySeatMapFromFallback() {
	// Use the existing hardcoded map as fallback
	fallback := getHotMoneySeatsMap()
	seatMap := make(map[string]string)
	for seat, name := range fallback {
		seatMap[seat] = name
	}

	hotMoneyMu.Lock()
	hotMoneySeatMap = seatMap
	hotMoneyLoaded = true
	hotMoneyLoadTime = time.Now()
	hotMoneyMu.Unlock()
	log.Printf("[HotMoneyList] Loaded %d seat mappings from hardcoded fallback", len(seatMap))
}

// ==================== Helper: trade date utilities ====================

// Rate limit tracking with thread-safety
var (
	rateLimitMu               sync.RWMutex
	limitListRateLimitedUntil time.Time
	limitStepRateLimitedUntil time.Time
)

// isLimitListRateLimited returns true if we know the API is currently rate-limited
func isLimitListRateLimited() bool {
	rateLimitMu.RLock()
	defer rateLimitMu.RUnlock()
	return time.Now().Before(limitListRateLimitedUntil)
}

// markLimitListRateLimited marks the limit_list_d API as rate-limited for 60 minutes (API limit is 1/hour)
func markLimitListRateLimited() {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()
	limitListRateLimitedUntil = time.Now().Add(60 * time.Minute)
	log.Printf("[LimitList] API rate-limited (1/hour), will skip API calls for 60 minutes")
}

// isLimitStepRateLimited returns true if limit_step API is rate-limited
func isLimitStepRateLimited() bool {
	rateLimitMu.RLock()
	defer rateLimitMu.RUnlock()
	return time.Now().Before(limitStepRateLimitedUntil)
}

// markLimitStepRateLimited marks limit_step API as rate-limited
func markLimitStepRateLimited() {
	rateLimitMu.Lock()
	defer rateLimitMu.Unlock()
	limitStepRateLimitedUntil = time.Now().Add(60 * time.Minute)
	log.Printf("[LimitStep] API rate-limited, will skip for 60 minutes")
}

// isRateLimitError checks if an error is a Tushare rate-limit error
func isRateLimitError(err error) bool {
	if err == nil {
		return false
	}
	errMsg := err.Error()
	return strings.Contains(errMsg, "40203") || strings.Contains(errMsg, "频率超限") || strings.Contains(errMsg, "40201")
}

// batchCreateInTx performs a batch insert within a transaction for reliability
// Returns the number of records successfully inserted
func batchCreateInTx(items interface{}, batchSize int) (int, error) {
	tx := repository.DB.Begin()
	if tx.Error != nil {
		return 0, tx.Error
	}
	result := tx.CreateInBatches(items, batchSize)
	if result.Error != nil {
		tx.Rollback()
		return 0, result.Error
	}
	if err := tx.Commit().Error; err != nil {
		return 0, err
	}
	return int(result.RowsAffected), nil
}

// findLatestTradeDateStr returns the most recent weekday in YYYYMMDD format
func findLatestTradeDateStr() string {
	now := time.Now()
	for i := 0; i < 10; i++ {
		d := now.AddDate(0, 0, -i)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		return d.Format("20060102")
	}
	return now.Format("20060102")
}

// findTradeDateWithData tries recent trading days and returns the first one that has data
// It checks the DB for existing data, then falls back to API to find data
func findTradeDateWithData(tradeDate string, tableName string) string {
	if tradeDate != "" {
		return tradeDate
	}
	// Try the most recent weekdays
	now := time.Now()
	for i := 0; i < 10; i++ {
		d := now.AddDate(0, 0, -i)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		candidate := d.Format("20060102")
		var count int64
		switch tableName {
		case "dragon_tiger":
			repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", candidate).Count(&count)
		case "limit_list":
			repository.DB.Model(&TsLimitList{}).Where("trade_date = ?", candidate).Count(&count)
		case "limit_step":
			repository.DB.Model(&TsLimitStep{}).Where("trade_date = ?", candidate).Count(&count)
		case "auction":
			repository.DB.Model(&TsStkAuction{}).Where("trade_date = ?", candidate).Count(&count)
		case "moneyflow":
			repository.DB.Model(&TsMoneyflow{}).Where("trade_date = ?", candidate).Count(&count)
		}
		if count > 0 {
			return candidate
		}
	}
	return findLatestTradeDateStr()
}

func formatTradeDateForDisplay(d string) string {
	if len(d) == 8 {
		return d[:4] + "-" + d[4:6] + "-" + d[6:]
	}
	return d
}

func normTradeDate(d string) string {
	d = strings.ReplaceAll(d, "-", "")
	if len(d) == 8 {
		return d
	}
	return findLatestTradeDateStr()
}

// findLatestLimitListDate returns the most recent trade_date in ts_limit_lists DB
// This is used as fallback when the API is rate-limited
func findLatestLimitListDate() string {
	var item TsLimitList
	if err := repository.DB.Order("trade_date DESC").First(&item).Error; err == nil {
		return item.TradeDate
	}
	return ""
}

// ensureLimitListData guarantees limit_list data is available for a trade date.
// Priority: limit_list_ths (同花顺, richer fields, higher rate limit) > limit_list_d (Tushare classic)
// Returns the effective trade_date (may differ if data was found on a different date).
func ensureLimitListData(tradeDate string, refresh bool) string {
	var count int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count > 0 && !refresh {
		return tradeDate // Already have data for this date
	}

	// Priority 1: Try limit_list_ths (同花顺) - higher rate limit (500/min), richer data
	if fetchAndSaveLimitListThs(tradeDate) {
		return tradeDate
	}

	// Priority 2: Fall back to limit_list_d (classic Tushare) if THS failed
	if !isLimitListRateLimited() {
		if fetchAndSaveLimitList(tradeDate) {
			return tradeDate
		}
	} else {
		log.Printf("[LimitList] Skipping limit_list_d API call (rate-limited), checking DB cache...")
	}

	// API failed (likely rate-limited) - fall back to DB data
	if count > 0 {
		return tradeDate // Still have existing data
	}

	// Check DB for any recent date's data
	if latestDate := findLatestLimitListDate(); latestDate != "" {
		log.Printf("[LimitList] Using cached data from %s", latestDate)
		return latestDate
	}

	// Last resort: try previous trading days
	now := time.Now()
	for i := 1; i <= 3; i++ {
		d := now.AddDate(0, 0, -i)
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		candidate := d.Format("20060102")
		if candidate != tradeDate {
			repository.DB.Model(&TsLimitList{}).Where("trade_date = ?", candidate).Count(&count)
			if count > 0 {
				return candidate
			}
			// Try THS first, then classic
			if fetchAndSaveLimitListThs(candidate) {
				return candidate
			}
			if !isLimitListRateLimited() && fetchAndSaveLimitList(candidate) {
				return candidate
			}
		}
	}
	return tradeDate
}

// ==================== 1. 龙虎榜游资 (top_list + top_inst) ====================

func (h *Handler) GetTsDragonTiger(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	sortBy := c.DefaultQuery("sort", "net") // net, buy, sell
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	// Check DB first
	var count int64
	repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count == 0 || refresh {
		// Try to fetch from Tushare, if no data try previous days
		fetched := false
		candidates := []string{tradeDate}
		if count == 0 {
			// Also try previous trading days
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
			// Try to find existing data in DB for any recent date
			var latestRecord TsDragonTiger
			if err := repository.DB.Order("trade_date DESC").First(&latestRecord).Error; err == nil {
				tradeDate = latestRecord.TradeDate
				repository.DB.Model(&TsDragonTiger{}).Where("trade_date = ?", tradeDate).Count(&count)
			}
		}
	}

	// Load ALL items for the date (not paginated) to build complete trader aggregation
	var allItems []TsDragonTiger
	repository.DB.Where("trade_date = ?", tradeDate).
		Order("net_amount DESC").
		Find(&allItems)

	// Load ALL inst data for this date
	var allInsts []TsDragonTigerInst
	repository.DB.Where("trade_date = ?", tradeDate).Find(&allInsts)

	instMap := map[string][]TsDragonTigerInst{}
	for _, inst := range allInsts {
		instMap[inst.TsCode] = append(instMap[inst.TsCode], inst)
	}

	// Ensure hot money list is loaded for trader name matching
	ensureHotMoneyList()

	// Build response with trader-grouped format for frontend compatibility
	// Group by hot money trader name (游资名称) using hm_list data
	type traderInfo struct {
		Name       string
		TotalBuy   float64
		TotalSell  float64
		TotalNet   float64
		TradeCount int
		IsKnown    bool // Whether matched to a known trader name
		Trades     []gin.H
	}
	traderMap := map[string]*traderInfo{}
	traderOrder := []string{}

	// Build a name->stock map for enriching trade info
	stockNameMap := map[string]string{}
	for _, item := range allItems {
		stockNameMap[item.TsCode] = item.Name
	}

	for _, item := range allItems {
		code := tsCodeToCode(item.TsCode)
		insts := instMap[item.TsCode]

		for _, inst := range insts {
			seatName := inst.Exalter
			if seatName == "" {
				seatName = "其他"
			}

			// Match seat name to known hot money trader name
			traderName := matchHotMoneyTraderName(seatName)
			isKnown := traderName != ""
			if traderName == "" {
				// For unmatched seats, try to create a readable short name
				traderName = simplifyUnmatchedSeat(seatName)
			}

			if _, ok := traderMap[traderName]; !ok {
				traderMap[traderName] = &traderInfo{
					Name:    traderName,
					IsKnown: isKnown,
					Trades:  []gin.H{},
				}
				traderOrder = append(traderOrder, traderName)
			}

			trader := traderMap[traderName]
			if isKnown && !trader.IsKnown {
				trader.IsKnown = true // Upgrade if any match is known
			}
			trader.Trades = append(trader.Trades, gin.H{
				"code":     code,
				"name":     item.Name,
				"seat":     seatName,
				"buy_amt":  inst.Buy,
				"sell_amt": inst.Sell,
				"net_amt":  inst.NetBuy,
				"reason":   inst.Reason,
				"side":     inst.Side,
			})
			trader.TotalBuy += inst.Buy
			trader.TotalSell += inst.Sell
			trader.TotalNet += inst.NetBuy
			trader.TradeCount++
		}
	}

	// Sort traders: known traders first (by sort criteria), then unknown ones
	sort.Slice(traderOrder, func(i, j int) bool {
		ti := traderMap[traderOrder[i]]
		tj := traderMap[traderOrder[j]]
		// Known traders always come first
		if ti.IsKnown != tj.IsKnown {
			return ti.IsKnown
		}
		// Within same category, sort by the selected criteria
		switch sortBy {
		case "buy":
			return ti.TotalBuy > tj.TotalBuy
		case "sell":
			return ti.TotalSell > tj.TotalSell
		default: // "net"
			return math.Abs(ti.TotalNet) > math.Abs(tj.TotalNet)
		}
	})

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
			"trades":      t.Trades,
		})
	}

	// Also build flat items list (paginated)
	offset := (page - 1) * pageSize
	end := offset + pageSize
	if end > len(allItems) {
		end = len(allItems)
	}
	pagedItems := allItems
	if offset < len(allItems) {
		pagedItems = allItems[offset:end]
	} else {
		pagedItems = nil
	}

	results := []gin.H{}
	for _, item := range pagedItems {
		code := tsCodeToCode(item.TsCode)
		insts := instMap[item.TsCode]
		instList := []gin.H{}
		for _, inst := range insts {
			instList = append(instList, gin.H{
				"exalter": inst.Exalter, "side": inst.Side,
				"buy": inst.Buy, "sell": inst.Sell, "net_buy": inst.NetBuy,
				"reason": inst.Reason,
			})
		}
		results = append(results, gin.H{
			"code": code, "name": item.Name, "close": item.Close,
			"pct_change": item.PctChange, "turnover_rate": item.TurnoverRate,
			"amount": item.Amount, "l_sell": item.LSell, "l_buy": item.LBuy,
			"l_amount": item.LAmount, "net_amount": item.NetAmount,
			"net_rate": item.NetRate, "amount_rate": item.AmountRate,
			"float_values": item.FloatValues, "reason": item.Reason,
			"institutions": instList,
		})
	}

	totalTraders := len(traders)
	// Count known traders
	knownCount := 0
	for _, t := range traders {
		if t["is_known"] == true {
			knownCount++
		}
	}

	response.Success(c, gin.H{
		"trade_date":    formatTradeDateForDisplay(tradeDate),
		"items":         results,
		"traders":       traders,
		"total":         count,
		"total_traders": totalTraders,
		"known_traders": knownCount,
		"sort":          sortBy,
		"page":          page,
		"page_size":     pageSize,
		"total_pages":   (int(count) + pageSize - 1) / pageSize,
	})
}

// simplifyUnmatchedSeat creates a readable short name for an unmatched seat
// e.g. "华泰证券股份有限公司深圳深南大道基金大厦证券营业部" -> "华泰-深圳深南大道"
func simplifyUnmatchedSeat(seat string) string {
	broker := extractBrokerName(seat)
	loc := extractSeatLocationKey(seat)
	if broker != "" && loc != "" {
		return broker + "-" + loc
	}
	if broker != "" {
		short := extractSeatShortKey(seat)
		if short != "" {
			return short
		}
	}
	// Truncate long seat names
	runes := []rune(seat)
	if len(runes) > 20 {
		return string(runes[:20]) + "..."
	}
	return seat
}

func fetchAndSaveDragonTiger(tradeDate string) bool {
	// Fetch top_list
	resp, err := callTushareAPI("top_list", map[string]string{
		"trade_date": tradeDate,
	}, "trade_date,ts_code,name,close,pct_change,turnover_rate,amount,l_sell,l_buy,l_amount,net_amount,net_rate,amount_rate,float_values,reason")
	if err != nil {
		log.Printf("[TsDragonTiger] top_list error for %s: %v", tradeDate, err)
		if isRateLimitError(err) {
			return false
		}
		return false
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Printf("[TsDragonTiger] No top_list data for %s", tradeDate)
		return false
	}

	// Build batch items
	items := make([]TsDragonTiger, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsDragonTiger{
			TradeDate:    tradeDate,
			TsCode:       tsString(row, "ts_code"),
			Name:         tsString(row, "name"),
			Close:        tsFloat(row, "close"),
			PctChange:    tsFloat(row, "pct_change"),
			TurnoverRate: tsFloat(row, "turnover_rate"),
			Amount:       tsFloat(row, "amount"),
			LSell:        tsFloat(row, "l_sell"),
			LBuy:         tsFloat(row, "l_buy"),
			LAmount:      tsFloat(row, "l_amount"),
			NetAmount:    tsFloat(row, "net_amount"),
			NetRate:      tsFloat(row, "net_rate"),
			AmountRate:   tsFloat(row, "amount_rate"),
			FloatValues:  tsFloat(row, "float_values"),
			Reason:       tsString(row, "reason"),
		})
	}

	// Delete old + batch insert in transaction
	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsDragonTiger] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsDragonTiger{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsDragonTiger] batch insert error for %s: %v", tradeDate, err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsDragonTiger] commit error for %s: %v", tradeDate, err)
		return false
	}
	log.Printf("[TsDragonTiger] Saved %d top_list records for %s", len(items), tradeDate)

	// Fetch top_inst (rate limit: wait between API calls)
	time.Sleep(1100 * time.Millisecond)
	respInst, err := callTushareAPI("top_inst", map[string]string{
		"trade_date": tradeDate,
	}, "trade_date,ts_code,exalter,side,buy,buy_rate,sell,sell_rate,net_buy,reason")
	if err != nil {
		log.Printf("[TsDragonTiger] top_inst error for %s: %v", tradeDate, err)
		// top_list succeeded, so still return true
		return true
	}

	instRows := tushareDataToMap(respInst)
	if len(instRows) > 0 {
		instItems := make([]TsDragonTigerInst, 0, len(instRows))
		for _, row := range instRows {
			instItems = append(instItems, TsDragonTigerInst{
				TradeDate: tradeDate,
				TsCode:    tsString(row, "ts_code"),
				Exalter:   tsString(row, "exalter"),
				Side:      tsString(row, "side"),
				Buy:       tsFloat(row, "buy"),
				BuyRate:   tsFloat(row, "buy_rate"),
				Sell:      tsFloat(row, "sell"),
				SellRate:  tsFloat(row, "sell_rate"),
				NetBuy:    tsFloat(row, "net_buy"),
				Reason:    tsString(row, "reason"),
			})
		}

		tx2 := repository.DB.Begin()
		if tx2.Error == nil {
			tx2.Where("trade_date = ?", tradeDate).Delete(&TsDragonTigerInst{})
			if err := tx2.CreateInBatches(&instItems, 100).Error; err != nil {
				tx2.Rollback()
				log.Printf("[TsDragonTiger] inst batch insert error: %v", err)
			} else {
				tx2.Commit()
				log.Printf("[TsDragonTiger] Saved %d top_inst records for %s", len(instItems), tradeDate)
			}
		}
	}
	return true
}

// ==================== 2. 涨停榜 (limit_list_d, limit_type=U) ====================

func (h *Handler) GetTsLimitUpList(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"

	tradeDate = ensureLimitListData(tradeDate, refresh)

	var count int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&count)

	var items []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
		Order("limit_times DESC, pct_chg DESC").Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code": tsCodeToCode(item.TsCode), "name": item.Name,
			"industry": item.Industry, "close": item.Close, "pct_chg": item.PctChg,
			"amount": item.Amount, "limit_amount": item.LimitAmount,
			"float_mv": item.FloatMv, "total_mv": item.TotalMv,
			"turnover_ratio": item.TurnoverRatio, "fd_amount": item.FdAmount,
			"first_time": item.FirstTime, "last_time": item.LastTime,
			"open_times": item.OpenTimes, "up_stat": item.UpStat,
			"limit_times": item.LimitTimes, "limit": item.Limit,
			// THS enriched fields
			"tag":         item.Tag,
			"status":      item.Status,
			"lu_desc":     item.LuDesc,
			"rise_rate":   item.RiseRate,
			"turnover":    item.Turnover,
			"limit_order": item.LimitOrder,
			"data_source": item.DataSource,
		})
	}

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"items":      results,
		"total":      count,
	})
}

// ==================== 3. 涨跌停和炸板 (limit_list_d, all types) ====================

func (h *Handler) GetTsLimitStats(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"

	tradeDate = ensureLimitListData(tradeDate, refresh)

	// Count by type
	var upCount, downCount, brokenCount int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&upCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'D'", tradeDate).Count(&downCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'Z'", tradeDate).Count(&brokenCount)

	// Top limit-up stocks
	var upItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
		Order("limit_times DESC, fd_amount DESC").Limit(50).Find(&upItems)

	// Limit-down stocks
	var downItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'D'", tradeDate).
		Order("pct_chg ASC").Limit(50).Find(&downItems)

	// Broken (炸板) stocks
	var brokenItems []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'Z'", tradeDate).
		Order("open_times DESC").Limit(50).Find(&brokenItems)

	toList := func(items []TsLimitList) []gin.H {
		list := []gin.H{}
		for _, item := range items {
			list = append(list, gin.H{
				"code": tsCodeToCode(item.TsCode), "name": item.Name,
				"industry": item.Industry, "close": item.Close, "pct_chg": item.PctChg,
				"amount": item.Amount, "fd_amount": item.FdAmount,
				"first_time": item.FirstTime, "last_time": item.LastTime,
				"open_times": item.OpenTimes, "up_stat": item.UpStat,
				"limit_times": item.LimitTimes, "limit": item.Limit,
				"total_mv": item.TotalMv, "turnover_ratio": item.TurnoverRatio,
				// THS enriched fields
				"tag":         item.Tag,
				"status":      item.Status,
				"lu_desc":     item.LuDesc,
				"rise_rate":   item.RiseRate,
				"turnover":    item.Turnover,
				"limit_order": item.LimitOrder,
				"data_source": item.DataSource,
			})
		}
		return list
	}

	response.Success(c, gin.H{
		"trade_date":    formatTradeDateForDisplay(tradeDate),
		"limit_up":      upCount,
		"limit_down":    downCount,
		"broken":        brokenCount,
		"up_stocks":     toList(upItems),
		"down_stocks":   toList(downItems),
		"broken_stocks": toList(brokenItems),
	})
}

// fetchAndSaveLimitListThs fetches limit_list_ths (同花顺涨跌停榜单) for all types and saves to DB
// Returns true if any data was found. THS API has higher rate limit (500 calls/min) and richer fields.
// Fields: ts_code, trade_date, name, close, pct_chg, tag, status, lu_desc, turnover_rate, rise_rate,
//         turnover, limit_order, limit_amount, open_times, up_stat, first_time, last_time, limit_times
func fetchAndSaveLimitListThs(tradeDate string) bool {
	allItems := make([]TsLimitList, 0, 200)

	// limit_type mapping: 涨停池->U, 跌停池->D, 炸板池->Z
	thsTypes := []struct {
		thsType   string
		limitCode string
	}{
		{"涨停池", "U"},
		{"跌停池", "D"},
		{"炸板池", "Z"},
	}

	for i, lt := range thsTypes {
		// Small delay between calls to avoid burst
		if i > 0 {
			time.Sleep(300 * time.Millisecond)
		}

		resp, err := callTushareAPI("limit_list_ths", map[string]string{
			"trade_date": tradeDate,
			"limit_type": lt.thsType,
		}, "ts_code,trade_date,name,close,pct_chg,tag,status,lu_desc,turnover_rate,rise_rate,turnover,limit_order,limit_amount,open_times,up_stat,first_time,last_time,limit_times")
		if err != nil {
			log.Printf("[TsLimitListThs] limit_list_ths(%s) error for %s: %v", lt.thsType, tradeDate, err)
			if isRateLimitError(err) {
				log.Printf("[TsLimitListThs] Rate-limited, stopping THS fetch")
				break
			}
			continue
		}

		rows := tushareDataToMap(resp)
		for _, row := range rows {
			item := TsLimitList{
				TradeDate:     tradeDate,
				TsCode:        tsString(row, "ts_code"),
				Name:          tsString(row, "name"),
				Close:         tsFloat(row, "close"),
				PctChg:        tsFloat(row, "pct_chg"),
				Tag:           tsString(row, "tag"),
				Status:        tsString(row, "status"),
				LuDesc:        tsString(row, "lu_desc"),
				TurnoverRatio: tsFloat(row, "turnover_rate"),
				RiseRate:      tsFloat(row, "rise_rate"),
				Turnover:      tsFloat(row, "turnover"),
				LimitOrder:    tsFloat(row, "limit_order"),
				LimitAmount:   tsFloat(row, "limit_amount"),
				OpenTimes:     int(tsFloat(row, "open_times")),
				UpStat:        tsString(row, "up_stat"),
				FirstTime:     tsString(row, "first_time"),
				LastTime:      tsString(row, "last_time"),
				LimitTimes:    int(tsFloat(row, "limit_times")),
				Limit:         lt.limitCode,
				LimitType:     lt.thsType,
				DataSource:    "ths",
			}
			allItems = append(allItems, item)
		}
		if len(rows) > 0 {
			log.Printf("[TsLimitListThs] Fetched %d %s records for %s", len(rows), lt.thsType, tradeDate)
		}
	}

	if len(allItems) == 0 {
		log.Printf("[TsLimitListThs] No data fetched for %s", tradeDate)
		return false
	}

	// Atomic: delete old + batch insert in a single transaction
	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsLimitListThs] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsLimitList{})
	if err := tx.CreateInBatches(&allItems, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsLimitListThs] batch insert error for %s: %v", tradeDate, err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsLimitListThs] commit error for %s: %v", tradeDate, err)
		return false
	}
	log.Printf("[TsLimitListThs] Saved total %d records for %s (source: 同花顺)", len(allItems), tradeDate)
	return true
}

// fetchAndSaveLimitList fetches limit_list_d for all types (U/D/Z) and saves to DB
// Returns true if any data was found
func fetchAndSaveLimitList(tradeDate string) bool {
	if isLimitListRateLimited() {
		log.Printf("[TsLimitList] Skipping fetch for %s - API rate-limited", tradeDate)
		return false
	}

	allItems := make([]TsLimitList, 0, 200)

	for i, limitType := range []string{"U", "D", "Z"} {
		// Tushare rate limit: 1 call/second per interface
		if i > 0 {
			time.Sleep(1200 * time.Millisecond)
		}
		resp, err := callTushareAPI("limit_list_d", map[string]string{
			"trade_date": tradeDate,
			"limit_type": limitType,
		}, "trade_date,ts_code,industry,name,close,pct_chg,amount,limit_amount,float_mv,total_mv,turnover_ratio,fd_amount,first_time,last_time,open_times,up_stat,limit_times,limit")
		if err != nil {
			log.Printf("[TsLimitList] limit_list_d(%s) error for %s: %v", limitType, tradeDate, err)
			if isRateLimitError(err) {
				markLimitListRateLimited()
				break // Don't try other types
			}
			continue
		}

		rows := tushareDataToMap(resp)
		for _, row := range rows {
			item := TsLimitList{
				TradeDate:     tradeDate,
				TsCode:        tsString(row, "ts_code"),
				Industry:      tsString(row, "industry"),
				Name:          tsString(row, "name"),
				Close:         tsFloat(row, "close"),
				PctChg:        tsFloat(row, "pct_chg"),
				Amount:        tsFloat(row, "amount"),
				LimitAmount:   tsFloat(row, "limit_amount"),
				FloatMv:       tsFloat(row, "float_mv"),
				TotalMv:       tsFloat(row, "total_mv"),
				TurnoverRatio: tsFloat(row, "turnover_ratio"),
				FdAmount:      tsFloat(row, "fd_amount"),
				FirstTime:     tsString(row, "first_time"),
				LastTime:      tsString(row, "last_time"),
				OpenTimes:     int(tsFloat(row, "open_times")),
				UpStat:        tsString(row, "up_stat"),
				LimitTimes:    int(tsFloat(row, "limit_times")),
				Limit:         tsString(row, "limit"),
				DataSource:    "tushare",
			}
			if item.Limit == "" {
				item.Limit = limitType
			}
			allItems = append(allItems, item)
		}
		if len(rows) > 0 {
			log.Printf("[TsLimitList] Fetched %d %s records for %s", len(rows), limitType, tradeDate)
		}
	}

	if len(allItems) == 0 {
		log.Printf("[TsLimitList] No data fetched for %s", tradeDate)
		return false
	}

	// Atomic: delete old + batch insert in a single transaction
	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsLimitList] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsLimitList{})
	if err := tx.CreateInBatches(&allItems, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsLimitList] batch insert error for %s: %v", tradeDate, err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsLimitList] commit error for %s: %v", tradeDate, err)
		return false
	}
	log.Printf("[TsLimitList] Saved total %d records for %s", len(allItems), tradeDate)
	return true
}

// ==================== 4. 连板天梯 (limit_step) ====================

func (h *Handler) GetTsLimitStep(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))

	var count int64
	repository.DB.Model(&TsLimitStep{}).Where("trade_date = ?", tradeDate).Count(&count)

	// Try to fetch from limit_step API only if explicitly refreshing
	refresh := c.DefaultQuery("refresh", "false") == "true"
	if refresh {
		fetchAndSaveLimitStep(tradeDate)
		repository.DB.Model(&TsLimitStep{}).Where("trade_date = ?", tradeDate).Count(&count)
	}

	var items []TsLimitStep
	repository.DB.Where("trade_date = ?", tradeDate).
		Order("CAST(nums AS INTEGER) DESC").Find(&items)

	// Group by nums level
	ladder := map[int][]gin.H{}
	maxNums := 0
	for _, item := range items {
		n, _ := strconv.Atoi(item.Nums)
		if n > maxNums {
			maxNums = n
		}
		ladder[n] = append(ladder[n], gin.H{
			"code": tsCodeToCode(item.TsCode), "name": item.Name, "nums": n,
		})
	}

	// Fallback: if limit_step has no data, build ladder from limit_list_d's limit_times
	if len(items) == 0 {
		// Ensure limit_list data is available (smart fallback handles rate-limiting)
		tradeDate = ensureLimitListData(tradeDate, false)

		var limitUpItems []TsLimitList
		repository.DB.Where("trade_date = ? AND `limit` = 'U' AND limit_times >= 2", tradeDate).
			Order("limit_times DESC").Find(&limitUpItems)
		for _, item := range limitUpItems {
			n := item.LimitTimes
			if n < 2 {
				continue
			}
			if n > maxNums {
				maxNums = n
			}
			ladder[n] = append(ladder[n], gin.H{
				"code": tsCodeToCode(item.TsCode), "name": item.Name, "nums": n,
			})
		}
		if len(limitUpItems) > 0 {
			count = int64(len(limitUpItems))
			log.Printf("[TsLimitStep] Fallback: built ladder from limit_list_d limit_times, %d stocks", len(limitUpItems))
		}
	}

	// Build ladder list sorted desc
	ladderList := []gin.H{}
	for n := maxNums; n >= 2; n-- {
		if stocks, ok := ladder[n]; ok {
			ladderList = append(ladderList, gin.H{
				"level":  n,
				"count":  len(stocks),
				"stocks": stocks,
			})
		}
	}

	// Build ladder count map for frontend compatibility
	ladderCountMap := map[int]int{}
	for n, stocks := range ladder {
		ladderCountMap[n] = len(stocks)
	}

	response.Success(c, gin.H{
		"trade_date":    formatTradeDateForDisplay(tradeDate),
		"ladder":        ladderList,
		"ladder_map":    ladderCountMap,
		"total":         count,
		"highest_board": maxNums,
	})
}

func fetchAndSaveLimitStep(tradeDate string) bool {
	if isLimitStepRateLimited() {
		log.Printf("[TsLimitStep] Skipping fetch for %s - API rate-limited", tradeDate)
		return false
	}

	resp, err := callTushareAPI("limit_step", map[string]string{
		"trade_date": tradeDate,
	}, "ts_code,name,trade_date,nums")
	if err != nil {
		log.Printf("[TsLimitStep] error for %s: %v", tradeDate, err)
		if isRateLimitError(err) {
			markLimitStepRateLimited()
		}
		return false
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Printf("[TsLimitStep] No data for %s", tradeDate)
		return false
	}

	items := make([]TsLimitStep, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsLimitStep{
			TradeDate: tradeDate,
			TsCode:    tsString(row, "ts_code"),
			Name:      tsString(row, "name"),
			Nums:      tsString(row, "nums"),
		})
	}

	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsLimitStep] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsLimitStep{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsLimitStep] batch insert error: %v", err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsLimitStep] commit error: %v", err)
		return false
	}
	log.Printf("[TsLimitStep] Saved %d records for %s", len(items), tradeDate)
	return true
}

// ==================== 5. 集合竞价 (stk_auction) ====================

func (h *Handler) GetTsStkAuction(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "30"))
	sortBy := c.DefaultQuery("sort", "amount") // amount, vol, turnover_rate
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 30
	}

	var count int64
	repository.DB.Model(&TsStkAuction{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count == 0 || refresh {
		fetchAndSaveStkAuction(tradeDate)
		repository.DB.Model(&TsStkAuction{}).Where("trade_date = ?", tradeDate).Count(&count)

		if count == 0 {
			// Try previous trading days
			now := time.Now()
			for i := 1; i <= 5; i++ {
				d := now.AddDate(0, 0, -i)
				if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
					continue
				}
				candidate := d.Format("20060102")
				if candidate != tradeDate {
					// Check DB first
					var candidateCount int64
					repository.DB.Model(&TsStkAuction{}).Where("trade_date = ?", candidate).Count(&candidateCount)
					if candidateCount > 0 {
						tradeDate = candidate
						count = candidateCount
						break
					}
					if fetchAndSaveStkAuction(candidate) {
						repository.DB.Model(&TsStkAuction{}).Where("trade_date = ?", candidate).Count(&count)
						if count > 0 {
							tradeDate = candidate
							break
						}
					}
				}
			}
		}
	}

	orderBy := "amount DESC"
	switch sortBy {
	case "vol":
		orderBy = "vol DESC"
	case "turnover_rate":
		orderBy = "turnover_rate DESC"
	case "volume_ratio":
		orderBy = "volume_ratio DESC"
	}

	var items []TsStkAuction
	repository.DB.Where("trade_date = ?", tradeDate).
		Order(orderBy).
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&items)

	results := []gin.H{}
	for _, item := range items {
		pctChg := 0.0
		if item.PreClose > 0 {
			pctChg = math.Round((item.Price-item.PreClose)/item.PreClose*10000) / 100
		}
		results = append(results, gin.H{
			"code": tsCodeToCode(item.TsCode), "name": item.Name,
			"vol": item.Vol, "price": item.Price, "amount": item.Amount,
			"pre_close": item.PreClose, "pct_chg": pctChg,
			"turnover_rate": item.TurnoverRate, "volume_ratio": item.VolumeRatio,
			"float_share": item.FloatShare,
		})
	}

	response.Success(c, gin.H{
		"trade_date":  formatTradeDateForDisplay(tradeDate),
		"items":       results,
		"total":       count,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (int(count) + pageSize - 1) / pageSize,
	})
}

func fetchAndSaveStkAuction(tradeDate string) bool {
	resp, err := callTushareAPI("stk_auction", map[string]string{
		"trade_date": tradeDate,
	}, "ts_code,trade_date,vol,price,amount,pre_close,turnover_rate,volume_ratio,float_share")
	if err != nil {
		log.Printf("[TsStkAuction] error for %s: %v", tradeDate, err)
		return false
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Printf("[TsStkAuction] No data for %s", tradeDate)
		return false
	}

	// Get stock names for the batch
	tsCodes := []string{}
	for _, row := range rows {
		tsCodes = append(tsCodes, tsString(row, "ts_code"))
	}
	nameMap := fetchTushareStockNames(tsCodes)

	items := make([]TsStkAuction, 0, len(rows))
	for _, row := range rows {
		tsCode := tsString(row, "ts_code")
		// Skip ETF/bonds – only keep stock codes
		if !strings.HasSuffix(tsCode, ".SH") && !strings.HasSuffix(tsCode, ".SZ") {
			continue
		}
		// Skip if code starts with 1/5 (ETF) or 12/11 (bonds)
		code := tsCodeToCode(tsCode)
		if strings.HasPrefix(code, "1") || strings.HasPrefix(code, "5") {
			continue
		}

		name := nameMap[tsCode]
		if name == "" {
			name = code
		}

		items = append(items, TsStkAuction{
			TradeDate:    tradeDate,
			TsCode:       tsCode,
			Name:         name,
			Vol:          tsFloat(row, "vol"),
			Price:        tsFloat(row, "price"),
			Amount:       tsFloat(row, "amount"),
			PreClose:     tsFloat(row, "pre_close"),
			TurnoverRate: tsFloat(row, "turnover_rate"),
			VolumeRatio:  tsFloat(row, "volume_ratio"),
			FloatShare:   tsFloat(row, "float_share"),
		})
	}

	if len(items) == 0 {
		return false
	}

	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsStkAuction] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsStkAuction{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsStkAuction] batch insert error: %v", err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsStkAuction] commit error: %v", err)
		return false
	}
	log.Printf("[TsStkAuction] Saved %d stock records for %s", len(items), tradeDate)
	return true
}

// ==================== 6. 资金流向 (moneyflow + moneyflow_cnt_ths) ====================

func (h *Handler) GetTsMoneyflow(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"
	category := c.DefaultQuery("category", "stock") // stock or concept
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "30"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 30
	}

	if category == "concept" {
		h.getTsMoneyflowConcept(c, tradeDate, refresh, page, pageSize)
		return
	}

	// Stock-level moneyflow
	var count int64
	repository.DB.Model(&TsMoneyflow{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count == 0 || refresh {
		fetchAndSaveMoneyflow(tradeDate)
		repository.DB.Model(&TsMoneyflow{}).Where("trade_date = ?", tradeDate).Count(&count)

		if count == 0 {
			// Try previous trading days
			now := time.Now()
			for i := 1; i <= 5; i++ {
				d := now.AddDate(0, 0, -i)
				if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
					continue
				}
				candidate := d.Format("20060102")
				if candidate != tradeDate {
					// Check DB first
					var candidateCount int64
					repository.DB.Model(&TsMoneyflow{}).Where("trade_date = ?", candidate).Count(&candidateCount)
					if candidateCount > 0 {
						tradeDate = candidate
						count = candidateCount
						break
					}
					if fetchAndSaveMoneyflow(candidate) {
						repository.DB.Model(&TsMoneyflow{}).Where("trade_date = ?", candidate).Count(&count)
						if count > 0 {
							tradeDate = candidate
							break
						}
					}
				}
			}
		}
	}

	var items []TsMoneyflow
	repository.DB.Where("trade_date = ?", tradeDate).
		Order("net_mf_amount DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&items)

	results := []gin.H{}
	for _, item := range items {
		mainIn := item.BuyLgAmount + item.BuyElgAmount
		mainOut := item.SellLgAmount + item.SellElgAmount
		mainNet := mainIn - mainOut
		retailIn := item.BuySmAmount + item.BuyMdAmount
		retailOut := item.SellSmAmount + item.SellMdAmount
		retailNet := retailIn - retailOut

		results = append(results, gin.H{
			"code": tsCodeToCode(item.TsCode), "name": item.Name,
			"net_mf_amount":  item.NetMfAmount,
			"main_in":        math.Round(mainIn*100) / 100,
			"main_out":       math.Round(mainOut*100) / 100,
			"main_net":       math.Round(mainNet*100) / 100,
			"retail_in":      math.Round(retailIn*100) / 100,
			"retail_out":     math.Round(retailOut*100) / 100,
			"retail_net":     math.Round(retailNet*100) / 100,
			"buy_elg_amount": item.BuyElgAmount,
			"sell_elg_amount": item.SellElgAmount,
		})
	}

	response.Success(c, gin.H{
		"trade_date":  formatTradeDateForDisplay(tradeDate),
		"category":    "stock",
		"items":       results,
		"total":       count,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (int(count) + pageSize - 1) / pageSize,
	})
}

func (h *Handler) getTsMoneyflowConcept(c *gin.Context, tradeDate string, refresh bool, page, pageSize int) {
	var count int64
	repository.DB.Model(&TsMoneyflowInd{}).Where("trade_date = ?", tradeDate).Count(&count)

	if count == 0 || refresh {
		fetchAndSaveMoneyflowInd(tradeDate)
		repository.DB.Model(&TsMoneyflowInd{}).Where("trade_date = ?", tradeDate).Count(&count)

		if count == 0 {
			now := time.Now()
			for i := 1; i <= 5; i++ {
				d := now.AddDate(0, 0, -i)
				if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
					continue
				}
				candidate := d.Format("20060102")
				if candidate != tradeDate {
					var candidateCount int64
					repository.DB.Model(&TsMoneyflowInd{}).Where("trade_date = ?", candidate).Count(&candidateCount)
					if candidateCount > 0 {
						tradeDate = candidate
						count = candidateCount
						break
					}
					if fetchAndSaveMoneyflowInd(candidate) {
						repository.DB.Model(&TsMoneyflowInd{}).Where("trade_date = ?", candidate).Count(&count)
						if count > 0 {
							tradeDate = candidate
							break
						}
					}
				}
			}
		}
	}

	var items []TsMoneyflowInd
	repository.DB.Where("trade_date = ?", tradeDate).
		Order("net_amount DESC").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Find(&items)

	results := []gin.H{}
	for _, item := range items {
		results = append(results, gin.H{
			"code": item.TsCode, "name": item.Name,
			"lead_stock":      item.LeadStock,
			"pct_change":      item.PctChange,
			"company_num":     item.CompanyNum,
			"net_buy_amount":  item.NetBuyAmount,
			"net_sell_amount": item.NetSellAmount,
			"net_amount":      item.NetAmount,
		})
	}

	response.Success(c, gin.H{
		"trade_date":  formatTradeDateForDisplay(tradeDate),
		"category":    "concept",
		"items":       results,
		"total":       count,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (int(count) + pageSize - 1) / pageSize,
	})
}

func fetchAndSaveMoneyflow(tradeDate string) bool {
	resp, err := callTushareAPI("moneyflow", map[string]string{
		"trade_date": tradeDate,
	}, "ts_code,trade_date,buy_sm_amount,sell_sm_amount,buy_md_amount,sell_md_amount,buy_lg_amount,sell_lg_amount,buy_elg_amount,sell_elg_amount,net_mf_amount")
	if err != nil {
		log.Printf("[TsMoneyflow] error for %s: %v", tradeDate, err)
		return false
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Printf("[TsMoneyflow] No data for %s", tradeDate)
		return false
	}

	// Get stock names
	tsCodes := []string{}
	for _, row := range rows {
		tsCodes = append(tsCodes, tsString(row, "ts_code"))
	}
	nameMap := fetchTushareStockNames(tsCodes)

	items := make([]TsMoneyflow, 0, len(rows))
	for _, row := range rows {
		tsCode := tsString(row, "ts_code")
		name := nameMap[tsCode]
		if name == "" {
			name = tsCodeToCode(tsCode)
		}

		items = append(items, TsMoneyflow{
			TradeDate:     tradeDate,
			TsCode:        tsCode,
			Name:          name,
			BuySmAmount:   tsFloat(row, "buy_sm_amount"),
			SellSmAmount:  tsFloat(row, "sell_sm_amount"),
			BuyMdAmount:   tsFloat(row, "buy_md_amount"),
			SellMdAmount:  tsFloat(row, "sell_md_amount"),
			BuyLgAmount:   tsFloat(row, "buy_lg_amount"),
			SellLgAmount:  tsFloat(row, "sell_lg_amount"),
			BuyElgAmount:  tsFloat(row, "buy_elg_amount"),
			SellElgAmount: tsFloat(row, "sell_elg_amount"),
			NetMfAmount:   tsFloat(row, "net_mf_amount"),
		})
	}

	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsMoneyflow] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsMoneyflow{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsMoneyflow] batch insert error: %v", err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsMoneyflow] commit error: %v", err)
		return false
	}
	log.Printf("[TsMoneyflow] Saved %d stock records for %s", len(items), tradeDate)
	return true
}

func fetchAndSaveMoneyflowInd(tradeDate string) bool {
	resp, err := callTushareAPI("moneyflow_cnt_ths", map[string]string{
		"trade_date": tradeDate,
	}, "trade_date,ts_code,name,lead_stock,close_price,pct_change,industry_index,company_num,pct_change_stock,net_buy_amount,net_sell_amount,net_amount")
	if err != nil {
		log.Printf("[TsMoneyflowInd] error for %s: %v", tradeDate, err)
		return false
	}

	rows := tushareDataToMap(resp)
	if len(rows) == 0 {
		log.Printf("[TsMoneyflowInd] No data for %s", tradeDate)
		return false
	}

	items := make([]TsMoneyflowInd, 0, len(rows))
	for _, row := range rows {
		items = append(items, TsMoneyflowInd{
			TradeDate:      tradeDate,
			TsCode:         tsString(row, "ts_code"),
			Name:           tsString(row, "name"),
			LeadStock:      tsString(row, "lead_stock"),
			ClosePrice:     tsFloat(row, "close_price"),
			PctChange:      tsFloat(row, "pct_change"),
			IndustryIndex:  tsFloat(row, "industry_index"),
			CompanyNum:     int(tsFloat(row, "company_num")),
			PctChangeStock: tsFloat(row, "pct_change_stock"),
			NetBuyAmount:   tsFloat(row, "net_buy_amount"),
			NetSellAmount:  tsFloat(row, "net_sell_amount"),
			NetAmount:      tsFloat(row, "net_amount"),
		})
	}

	tx := repository.DB.Begin()
	if tx.Error != nil {
		log.Printf("[TsMoneyflowInd] begin tx error: %v", tx.Error)
		return false
	}
	tx.Where("trade_date = ?", tradeDate).Delete(&TsMoneyflowInd{})
	if err := tx.CreateInBatches(&items, 100).Error; err != nil {
		tx.Rollback()
		log.Printf("[TsMoneyflowInd] batch insert error: %v", err)
		return false
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[TsMoneyflowInd] commit error: %v", err)
		return false
	}
	log.Printf("[TsMoneyflowInd] Saved %d concept records for %s", len(rows), tradeDate)
	return true
}

// ==================== 7. Tushare实时统计 (合并所有数据) ====================

// GetTsRealTimeStats returns a combined real-time statistics from all Tushare DB data
// This replaces the old GetRealTimeStats that depended on Eastmoney
func (h *Handler) GetTsRealTimeStats(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))
	refresh := c.DefaultQuery("refresh", "false") == "true"

	log.Printf("[TsRealTimeStats] Fetching Tushare stats for %s (refresh=%v)", tradeDate, refresh)

	// 1. Ensure limit_list_d data exists (uses smart fallback)
	tradeDate = ensureLimitListData(tradeDate, refresh)

	// 2. Try to load limit_step data (only if refresh is requested, API may not have access)
	if refresh {
		fetchAndSaveLimitStep(tradeDate)
	}

	// Count limit types
	var upCount, downCount, brokenCount int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&upCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'D'", tradeDate).Count(&downCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'Z'", tradeDate).Count(&brokenCount)

	// Get highest board from limit_step
	highestBoard := 0
	var steps []TsLimitStep
	repository.DB.Where("trade_date = ?", tradeDate).Order("CAST(nums AS INTEGER) DESC").Limit(1).Find(&steps)
	if len(steps) > 0 {
		highestBoard, _ = strconv.Atoi(steps[0].Nums)
	}

	// Build board ladder from limit_step
	ladderMap := map[int]int{}
	var allSteps []TsLimitStep
	repository.DB.Where("trade_date = ?", tradeDate).Find(&allSteps)
	for _, s := range allSteps {
		n, _ := strconv.Atoi(s.Nums)
		ladderMap[n]++
	}

	// Fallback: if limit_step has no data, build ladder from limit_list_d's limit_times
	if highestBoard == 0 {
		var maxLimitTimes TsLimitList
		if err := repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
			Order("limit_times DESC").First(&maxLimitTimes).Error; err == nil {
			highestBoard = maxLimitTimes.LimitTimes
		}

		var ladderItems []TsLimitList
		repository.DB.Where("trade_date = ? AND `limit` = 'U' AND limit_times >= 2", tradeDate).Find(&ladderItems)
		for _, item := range ladderItems {
			ladderMap[item.LimitTimes]++
		}
	}

	// Get limit-up stocks with board info for display
	var limitUpStocks []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
		Order("limit_times DESC, pct_chg DESC").Limit(50).Find(&limitUpStocks)

	limitUps := []gin.H{}
	for _, s := range limitUpStocks {
		boardCount := s.LimitTimes
		if boardCount <= 0 {
			boardCount = 1
		}
		limitUps = append(limitUps, gin.H{
			"code":        tsCodeToCode(s.TsCode),
			"name":        s.Name,
			"change_pct":  s.PctChg,
			"board_count": boardCount,
			"concept":     s.Industry,
			"price":       s.Close,
			"open_times":  s.OpenTimes,
			"first_time":  s.FirstTime,
			"last_time":   s.LastTime,
		})
	}

	// Get broken stocks for display
	var brokenStocks []TsLimitList
	repository.DB.Where("trade_date = ? AND `limit` = 'Z'", tradeDate).
		Order("open_times DESC").Limit(50).Find(&brokenStocks)

	brokens := []gin.H{}
	for _, s := range brokenStocks {
		brokens = append(brokens, gin.H{
			"code":       tsCodeToCode(s.TsCode),
			"name":       s.Name,
			"change_pct": s.PctChg,
			"concept":    s.Industry,
			"price":      s.Close,
			"open_times": s.OpenTimes,
		})
	}

	// Calculate sentiment score
	sentimentScore := float64(upCount) * 0.8
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

	// Try to get up/down/flat counts from existing Eastmoney function (fallback)
	upStockCount := 0
	downStockCount := 0
	flatStockCount := 0
	totalAmount := 0.0

	// Use Eastmoney for real-time up/down/flat counts (they don't exist in Tushare)
	upStockCount, downStockCount, flatStockCount = fetchMarketUpDownCounts()
	totalAmount = fetchMarketTotalAmount()

	// Persist to MarketSentiment in background
	go func() {
		today := formatTradeDateForDisplay(tradeDate)
		sentiment := model.MarketSentiment{
			Score:          math.Round(sentimentScore*10) / 10,
			LimitUpCount:   int(upCount),
			LimitDownCount: int(downCount),
			BrokenCount:    int(brokenCount),
			HighestBoard:   highestBoard,
			TotalAmount:    totalAmount,
			UpCount:        upStockCount,
			DownCount:      downStockCount,
			FlatCount:      flatStockCount,
			TradeDate:      today,
		}
		if err := repository.DB.Where("trade_date = ?", today).First(&model.MarketSentiment{}).Error; err != nil {
			repository.DB.Create(&sentiment)
		} else {
			repository.DB.Where("trade_date = ?", today).Updates(&sentiment)
		}
	}()

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"market_sentiment": gin.H{
			"limit_up_count":   upCount,
			"limit_down_count": downCount,
			"broken_count":     brokenCount,
			"highest_board":    highestBoard,
			"total_amount":     totalAmount,
			"score":            math.Round(sentimentScore*10) / 10,
			"up_count":         upStockCount,
			"down_count":       downStockCount,
			"flat_count":       flatStockCount,
		},
		"limit_ups":    limitUps,
		"brokens":      brokens,
		"board_ladder": gin.H{"ladder": ladderMap, "max_board": highestBoard},
	})
}
