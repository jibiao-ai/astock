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

	"github.com/gin-gonic/gin"
	"quantmind/pkg/response"
)

// FetchMarketData - manually trigger market data fetch from Eastmoney
func (h *Handler) FetchMarketData(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))
	go fetchAllMarketData(date)
	response.Success(c, gin.H{"message": "正在获取市场数据", "date": date})
}

// fetchAllMarketData fetches sector heat, limit-up, dragon-tiger, sentiment from Eastmoney
func fetchAllMarketData(date string) {
	log.Printf("[MarketFetch] Starting data fetch for %s", date)
	fetchSectorHeatFromEastmoney(date)
	fetchLimitUpFromEastmoney(date)
	fetchDragonTigerFromEastmoney(date)
	buildMarketSentiment(date)
	log.Printf("[MarketFetch] Completed data fetch for %s", date)
}

// fetchSectorHeatFromEastmoney fetches sector data from East Money API
func fetchSectorHeatFromEastmoney(date string) {
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3&fields=f2,f3,f12,f14,f62,f184,f66,f69,f72,f75,f78,f81,f84,f87,f204,f205"
	
	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
	req.Header.Set("Referer", "https://data.eastmoney.com")
	
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[MarketFetch] Sector heat fetch error: %v", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("[MarketFetch] Sector heat parse error: %v", err)
		return
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return
	}
	diffArr, ok := data["diff"].([]interface{})
	if !ok {
		return
	}

	// Delete old data for this date
	repository.DB.Where("trade_date = ?", date).Delete(&model.SectorHeat{})

	for _, item := range diffArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		sector := model.SectorHeat{
			Name:      safeString(d, "f14"),
			Code:      safeString(d, "f12"),
			ChangePct: safeFloat(d, "f3"),
			NetFlow:   safeFloat(d, "f62") / 100000000, // Convert to 亿
			FlowIn:    safeFloat(d, "f66") / 100000000,
			FlowOut:   safeFloat(d, "f72") / 100000000,
			LeadStock: safeString(d, "f204"),
			Amount:    safeFloat(d, "f2"),
			TradeDate: date,
		}
		repository.DB.Create(&sector)
	}
	log.Printf("[MarketFetch] Saved %d sector records", len(diffArr))
}

// fetchLimitUpFromEastmoney fetches limit-up board data
func fetchLimitUpFromEastmoney(date string) {
	// Eastmoney limit-up API
	url := "https://push2ex.eastmoney.com/getTopicZTPool?ut=7eea3edcaed734bea9cb3f&dpt=wz.ztzt&Ession=" + date + "&fields=f1,f2,f3,f4,f6,f8,f12,f14,f15,f17,f22,f136,f224,f225"
	
	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	req.Header.Set("Referer", "https://quote.eastmoney.com")
	
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[MarketFetch] Limit-up fetch error: %v", err)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return
	}

	data, ok := result["data"].(map[string]interface{})
	if !ok {
		return
	}
	pool, ok := data["pool"].([]interface{})
	if !ok {
		return
	}

	// Delete old data for this date
	repository.DB.Where("trade_date = ?", date).Delete(&model.LimitUpBoard{})

	for _, item := range pool {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		board := model.LimitUpBoard{
			Code:       safeString(d, "f12"),
			Name:       safeString(d, "f14"),
			Price:      safeFloat(d, "f2") / 1000,
			ChangePct:  safeFloat(d, "f3") / 1000,
			LimitType:  "limit_up",
			BoardCount: safeInt(d, "f136"),
			FundAmount: safeFloat(d, "f6") / 100000000,
			Concept:    safeString(d, "f225"),
			TradeDate:  date,
		}
		if board.BoardCount == 0 {
			board.BoardCount = 1
		}
		repository.DB.Create(&board)
	}
	log.Printf("[MarketFetch] Saved %d limit-up records", len(pool))
}

// fetchDragonTigerFromEastmoney fetches dragon-tiger (龙虎榜) data
func fetchDragonTigerFromEastmoney(date string) {
	dateParam := strings.ReplaceAll(date, "-", "")
	url := fmt.Sprintf("https://datacenter-web.eastmoney.com/api/data/v1/get?sortColumns=SECURITY_CODE&sortTypes=1&pageSize=20&pageNumber=1&reportName=RPT_DAILYBILLBOARD_DETAILSNEW&columns=ALL&filter=(TRADE_DATE='%s')", date)
	
	client := &http.Client{Timeout: 15 * time.Second}
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("User-Agent", "Mozilla/5.0")
	req.Header.Set("Referer", "https://data.eastmoney.com/stock/tradedetail.html")
	
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("[MarketFetch] Dragon-tiger fetch error: %v (date: %s)", err, dateParam)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return
	}

	resultData, ok := result["result"].(map[string]interface{})
	if !ok {
		return
	}
	dataArr, ok := resultData["data"].([]interface{})
	if !ok {
		return
	}

	// Delete old data for this date
	repository.DB.Where("trade_date = ?", date).Delete(&model.DragonTiger{})

	for _, item := range dataArr {
		d, ok := item.(map[string]interface{})
		if !ok {
			continue
		}
		dt := model.DragonTiger{
			Code:      safeString(d, "SECURITY_CODE"),
			Name:      safeString(d, "SECURITY_NAME_ABBR"),
			Reason:    safeString(d, "EXPLANATION"),
			BuyTotal:  safeFloat(d, "BUY_TOTAL_AMT"),
			SellTotal: safeFloat(d, "SELL_TOTAL_AMT"),
			NetAmount: safeFloat(d, "BUY_TOTAL_AMT") - safeFloat(d, "SELL_TOTAL_AMT"),
			TradeDate: date,
		}
		repository.DB.Create(&dt)
	}
	log.Printf("[MarketFetch] Saved %d dragon-tiger records", len(dataArr))
}

// buildMarketSentiment builds sentiment from existing data
func buildMarketSentiment(date string) {
	var limitUpCount int64
	repository.DB.Model(&model.LimitUpBoard{}).Where("trade_date = ? AND limit_type = ?", date, "limit_up").Count(&limitUpCount)

	var brokenCount int64
	repository.DB.Model(&model.LimitUpBoard{}).Where("trade_date = ? AND limit_type = ?", date, "broken").Count(&brokenCount)

	// Get highest board
	var maxBoard model.LimitUpBoard
	repository.DB.Where("trade_date = ? AND limit_type = ?", date, "limit_up").Order("board_count desc").First(&maxBoard)

	// Get total sector flow
	var totalAmount float64
	var sectors []model.SectorHeat
	repository.DB.Where("trade_date = ?", date).Find(&sectors)
	for _, s := range sectors {
		totalAmount += math.Abs(s.NetFlow)
	}

	// Calculate sentiment score (0-100) based on limit-up count and other metrics
	score := float64(limitUpCount) * 0.8
	if score > 85 {
		score = 85
	}
	score += float64(maxBoard.BoardCount) * 2
	if brokenCount > 0 {
		score -= float64(brokenCount) * 0.3
	}
	if score < 10 {
		score = 10
	}
	if score > 100 {
		score = 100
	}

	// Estimate up/down counts
	upCount := int(limitUpCount) * 20
	if upCount > 3500 {
		upCount = 3500
	}
	downCount := 5200 - upCount
	if downCount < 500 {
		downCount = 500
	}

	sentiment := model.MarketSentiment{
		Score:          score,
		LimitUpCount:   int(limitUpCount),
		LimitDownCount: int(brokenCount / 2),
		BrokenCount:    int(brokenCount),
		HighestBoard:   maxBoard.BoardCount,
		TotalAmount:    totalAmount * 100 / 10000, // Convert to 万亿-scale for DB consistency
		UpCount:        upCount,
		DownCount:      downCount,
		FlatCount:      300,
		TradeDate:      date,
	}

	// Upsert
	var existing model.MarketSentiment
	if err := repository.DB.Where("trade_date = ?", date).First(&existing).Error; err == nil {
		repository.DB.Model(&existing).Updates(sentiment)
	} else {
		repository.DB.Create(&sentiment)
	}
	log.Printf("[MarketFetch] Sentiment for %s: score=%.1f, limitUp=%d, broken=%d", date, score, limitUpCount, brokenCount)
}

// Utility functions
func safeString(d map[string]interface{}, key string) string {
	if v, ok := d[key]; ok {
		switch val := v.(type) {
		case string:
			return val
		case float64:
			return strconv.FormatFloat(val, 'f', -1, 64)
		default:
			return fmt.Sprintf("%v", val)
		}
	}
	return ""
}

func safeFloat(d map[string]interface{}, key string) float64 {
	if v, ok := d[key]; ok && v != nil {
		switch val := v.(type) {
		case float64:
			return val
		case int:
			return float64(val)
		case int64:
			return float64(val)
		case string:
			if val == "-" || val == "--" || val == "" {
				return 0
			}
			f, _ := strconv.ParseFloat(val, 64)
			return f
		case json.Number:
			f, _ := val.Float64()
			return f
		}
	}
	return 0
}

func safeInt(d map[string]interface{}, key string) int {
	return int(safeFloat(d, key))
}

// SeedDemoMarketData seeds realistic market data for the past 7 days
func SeedDemoMarketData() {
	log.Println("[Seed] Starting demo market data seeding for past 7 days...")

	// Sector data pool - realistic A-share sectors
	sectorPool := []struct {
		Name string
		Code string
		Lead string
	}{
		{"半导体", "BK0485", "北方华创"},
		{"人工智能", "BK1122", "科大讯飞"},
		{"新能源汽车", "BK0900", "比亚迪"},
		{"军工", "BK0477", "中航沈飞"},
		{"白酒", "BK0477", "贵州茅台"},
		{"医药生物", "BK0465", "恒瑞医药"},
		{"房地产", "BK0451", "万科A"},
		{"银行", "BK0475", "招商银行"},
		{"光伏", "BK1049", "隆基绿能"},
		{"消费电子", "BK0738", "立讯精密"},
		{"传媒", "BK0456", "芒果超媒"},
		{"有色金属", "BK0478", "紫金矿业"},
		{"汽车零部件", "BK0481", "华域汽车"},
		{"计算机应用", "BK0490", "用友网络"},
		{"电力设备", "BK0891", "宁德时代"},
		{"通信", "BK0493", "中兴通讯"},
	}

	// Stock pool for limit-up and dragon-tiger
	stockPool := []struct {
		Code    string
		Name    string
		Concept string
	}{
		{"300750", "宁德时代", "新能源+锂电池"},
		{"002594", "比亚迪", "新能源汽车+整车"},
		{"688981", "中芯国际", "半导体+芯片"},
		{"002371", "北方华创", "半导体设备"},
		{"002230", "科大讯飞", "人工智能+教育"},
		{"300496", "中科创达", "智能操作系统"},
		{"688256", "寒武纪", "AI芯片"},
		{"300474", "景嘉微", "GPU+军工"},
		{"300136", "信维通信", "5G+消费电子"},
		{"002475", "立讯精密", "消费电子+苹果产业链"},
		{"300059", "东方财富", "互联网金融+券商"},
		{"600519", "贵州茅台", "白酒"},
		{"601318", "中国平安", "保险+金融科技"},
		{"600036", "招商银行", "银行"},
		{"000001", "平安银行", "银行+零售"},
		{"600900", "长江电力", "电力+水电"},
		{"002049", "紫光国微", "芯片+军工"},
		{"300124", "汇川技术", "工控+新能源"},
		{"688012", "中微公司", "半导体设备+刻蚀"},
		{"300661", "圣邦股份", "模拟芯片"},
		{"688396", "华润微", "功率半导体"},
		{"000977", "浪潮信息", "服务器+AI算力"},
		{"002236", "大华股份", "安防+AI"},
		{"600745", "闻泰科技", "半导体+手机"},
	}

	now := time.Now()
	for dayOffset := 6; dayOffset >= 0; dayOffset-- {
		d := now.AddDate(0, 0, -dayOffset)
		// Skip weekends
		if d.Weekday() == time.Saturday || d.Weekday() == time.Sunday {
			continue
		}
		dateStr := d.Format("2006-01-02")

		// Check if data already exists
		var existingCount int64
		repository.DB.Model(&model.MarketSentiment{}).Where("trade_date = ?", dateStr).Count(&existingCount)
		if existingCount > 0 {
			continue
		}

		dayHash := float64(d.YearDay()+dayOffset*7) / 100.0
		seedVal := func(base, amplitude float64) float64 {
			return base + amplitude*math.Sin(dayHash*2.5+float64(dayOffset))
		}

		// 1. Sector heat data
		for i, s := range sectorPool {
			changePct := seedVal(-1.5+float64(i%5)*0.8, 2.5)
			netFlow := seedVal(-15+float64(i%3)*10, 20)
			sector := model.SectorHeat{
				Name:      s.Name,
				Code:      s.Code,
				ChangePct: math.Round(changePct*100) / 100,
				NetFlow:   math.Round(netFlow*100) / 100,
				FlowIn:    math.Abs(netFlow) + math.Abs(seedVal(5, 10)),
				FlowOut:   math.Abs(seedVal(5, 8)),
				LeadStock: s.Lead,
				Amount:    math.Round(seedVal(100, 50)*100) / 100,
				TradeDate: dateStr,
			}
			repository.DB.Create(&sector)
		}

		// 2. Limit-up board data
		limitUpCount := int(seedVal(35, 20))
		if limitUpCount < 10 {
			limitUpCount = 10
		}
		if limitUpCount > 80 {
			limitUpCount = 80
		}
		brokenCount := int(seedVal(8, 6))
		if brokenCount < 2 {
			brokenCount = 2
		}
		highestBoard := int(seedVal(5, 3))
		if highestBoard < 2 {
			highestBoard = 2
		}
		if highestBoard > 10 {
			highestBoard = 10
		}

		// Create limit-up entries
		used := make(map[int]bool)
		for j := 0; j < min(limitUpCount, len(stockPool)); j++ {
			idx := (j + dayOffset*3) % len(stockPool)
			for used[idx] {
				idx = (idx + 1) % len(stockPool)
			}
			used[idx] = true
			s := stockPool[idx]
			boardCount := 1
			if j < 3 {
				boardCount = highestBoard - j
				if boardCount < 1 {
					boardCount = 1
				}
			} else if j < 8 {
				boardCount = 2
			}
			board := model.LimitUpBoard{
				Code:       s.Code,
				Name:       s.Name,
				Price:      math.Round(seedVal(50, 30)*100) / 100,
				ChangePct:  math.Round((9.8+seedVal(0, 0.2))*100) / 100,
				LimitType:  "limit_up",
				BoardCount: boardCount,
				FirstTime:  fmt.Sprintf("09:%02d", 30+j%15),
				LastTime:   fmt.Sprintf("14:%02d", 50+j%10),
				OpenCount:  j % 3,
				Concept:    s.Concept,
				FundAmount: math.Round(seedVal(5, 10)*100) / 100,
				TradeDate:  dateStr,
			}
			repository.DB.Create(&board)
		}

		// Create broken board entries
		for j := 0; j < min(brokenCount, 6); j++ {
			idx := (j + dayOffset*5 + 10) % len(stockPool)
			s := stockPool[idx]
			board := model.LimitUpBoard{
				Code:      s.Code,
				Name:      s.Name,
				Price:     math.Round(seedVal(40, 25)*100) / 100,
				ChangePct: math.Round(seedVal(5, 3)*100) / 100,
				LimitType: "broken",
				OpenCount: 1 + j%4,
				Concept:   s.Concept,
				TradeDate: dateStr,
			}
			repository.DB.Create(&board)
		}

		// 3. Dragon tiger data
		dtCount := int(seedVal(5, 3))
		if dtCount < 3 {
			dtCount = 3
		}
		for j := 0; j < min(dtCount, 8); j++ {
			idx := (j + dayOffset*2) % len(stockPool)
			s := stockPool[idx]
			buyTotal := seedVal(15000, 20000)
			sellTotal := seedVal(10000, 15000)
			dt := model.DragonTiger{
				Code:      s.Code,
				Name:      s.Name,
				Reason:    []string{"日涨幅偏离值达7%", "日振幅达15%", "日换手率达20%", "连续三个交易日涨幅偏离20%", "有价格涨跌幅限制的日收盘价格涨幅达到15%"}[j%5],
				BuyTotal:  math.Round(buyTotal*100) / 100,
				SellTotal: math.Round(sellTotal*100) / 100,
				NetAmount: math.Round((buyTotal-sellTotal)*100) / 100,
				TradeDate: dateStr,
			}
			repository.DB.Create(&dt)
		}

		// 4. Market sentiment
		sentimentScore := seedVal(50, 25)
		if sentimentScore < 10 {
			sentimentScore = 10
		}
		if sentimentScore > 95 {
			sentimentScore = 95
		}
		totalAmount := seedVal(9500, 3000) / 10000 // Generate in 万亿 (e.g., ~0.95万亿)
		upCount := int(seedVal(2200, 800))
		downCount := int(seedVal(1800, 700))

		sentiment := model.MarketSentiment{
			Score:          math.Round(sentimentScore*10) / 10,
			LimitUpCount:   limitUpCount,
			LimitDownCount: int(seedVal(5, 5)),
			BrokenCount:    brokenCount,
			HighestBoard:   highestBoard,
			TotalAmount:    math.Round(totalAmount*10) / 10,
			UpCount:        upCount,
			DownCount:      downCount,
			FlatCount:      5200 - upCount - downCount,
			TradeDate:      dateStr,
		}
		repository.DB.Create(&sentiment)

		// 5. Strategy signals (demo)
		strategies := []string{"dragon_board", "strong_pullback", "trend_core", "event_burst", "concept_core", "auction_pick", "group_hug", "pre_market", "micro_overnight"}
		signals := []string{"buy", "buy", "hold", "buy", "sell"}
		reasons := []string{
			"Dragon Score达%d分，封板强度S级，量比3.2",
			"回踩5日线缩量60%%，游资净买入%.1f亿，龙虎榜确认",
			"MA20/MA60同步上行，buypoint信号确认，板块核心股",
			"事件催化+产业链一级受益股，技术面验证通过",
			"概念发酵期+板块趋势共振，涨停比例>15%%",
			"竞价高开%.1f%%+占比%.1f%%+委比>60%%",
			"5步漏斗全通过+8因子评分%d，反包量能1.8倍",
			"AI精选Top%d，综合评分%.1f，近5日命中率%.0f%%",
			"二级过滤通过+情绪分%.0f，弹性仓位WR 72%%",
		}

		for j := 0; j < min(8, len(stockPool)); j++ {
			idx := (j + dayOffset*4) % len(stockPool)
			s := stockPool[idx]
			stratIdx := j % len(strategies)
			score := seedVal(75, 15)
			var reason string
			switch stratIdx {
			case 0:
				reason = fmt.Sprintf(reasons[0], int(score)+20)
			case 1:
				reason = fmt.Sprintf(reasons[1], seedVal(1.2, 0.5))
			case 2:
				reason = reasons[2]
			case 3:
				reason = reasons[3]
			case 4:
				reason = reasons[4]
			case 5:
				reason = fmt.Sprintf(reasons[5], seedVal(4, 0.8), seedVal(10, 1.5))
			case 6:
				reason = fmt.Sprintf(reasons[6], int(score))
			case 7:
				reason = fmt.Sprintf(reasons[7], j+1, score, seedVal(72, 8))
			case 8:
				reason = fmt.Sprintf(reasons[8], sentimentScore)
			}

			signal := model.StrategySignal{
				StrategyName: strategies[stratIdx],
				Code:         s.Code,
				Name:         s.Name,
				Signal:       signals[j%len(signals)],
				Score:        math.Round(score*10) / 10,
				Factors:      fmt.Sprintf(`{"tech":%.0f,"fundamental":%.0f,"fund":%.0f}`, seedVal(75, 15), seedVal(70, 12), seedVal(65, 18)),
				Reason:       reason,
				TradeDate:    dateStr,
			}
			repository.DB.Create(&signal)
		}

		log.Printf("[Seed] Seeded data for %s: sectors=%d, limitUp=%d, broken=%d, sentiment=%.1f",
			dateStr, len(sectorPool), limitUpCount, brokenCount, sentimentScore)
	}
	log.Println("[Seed] Demo market data seeding complete")
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// GetDashboardEnhanced returns dashboard data with 7-day history
func (h *Handler) GetDashboardEnhanced(c *gin.Context) {
	date := c.DefaultQuery("date", time.Now().Format("2006-01-02"))

	// Stats counts
	var agentCount, userCount, conversationCount, quoteCount, auditCount, signalCount int64
	repository.DB.Model(&model.Agent{}).Count(&agentCount)
	repository.DB.Model(&model.User{}).Count(&userCount)
	repository.DB.Model(&model.Conversation{}).Count(&conversationCount)
	repository.DB.Model(&model.StockQuote{}).Count(&quoteCount)
	repository.DB.Model(&model.AuditLog{}).Count(&auditCount)
	repository.DB.Model(&model.StrategySignal{}).Count(&signalCount)

	// Get sentiment for selected date
	var sentiment model.MarketSentiment
	repository.DB.Where("trade_date = ?", date).First(&sentiment)

	// Get 7-day sentiments
	var sentiments []model.MarketSentiment
	repository.DB.Where("trade_date <= ?", date).Order("trade_date desc").Limit(7).Find(&sentiments)
	// Reverse to chronological order
	sort.Slice(sentiments, func(i, j int) bool {
		return sentiments[i].TradeDate < sentiments[j].TradeDate
	})

	// Get sectors for the date
	var sectors []model.SectorHeat
	repository.DB.Where("trade_date = ?", date).Order("change_pct desc").Find(&sectors)

	// Get limit-ups
	var limitUps []model.LimitUpBoard
	repository.DB.Where("trade_date = ? AND limit_type = ?", date, "limit_up").Order("board_count desc, fund_amount desc").Find(&limitUps)

	// Get broken boards
	var brokens []model.LimitUpBoard
	repository.DB.Where("trade_date = ? AND limit_type = ?", date, "broken").Order("open_count desc").Find(&brokens)

	// Get dragon tigers
	var dragons []model.DragonTiger
	repository.DB.Where("trade_date = ?", date).Order("net_amount desc").Find(&dragons)

	// Build board ladder
	ladder := make(map[int]int)
	maxBoard := 0
	for _, b := range limitUps {
		ladder[b.BoardCount]++
		if b.BoardCount > maxBoard {
			maxBoard = b.BoardCount
		}
	}

	response.Success(c, gin.H{
		"stats": gin.H{
			"agents":           agentCount,
			"users":            userCount,
			"conversations":    conversationCount,
			"stock_quotes":     quoteCount,
			"audit_logs":       auditCount,
			"strategy_signals": signalCount,
		},
		"market_sentiment": sentiment,
		"sentiments":       sentiments,
		"sectors":          sectors,
		"limit_ups":        limitUps,
		"brokens":          brokens,
		"dragon_tigers":    dragons,
		"board_ladder":     gin.H{"ladder": ladder, "max_board": maxBoard},
	})
}
