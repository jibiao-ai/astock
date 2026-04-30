package handler

import (
	"encoding/json"
	"log"
	"math"
	"strconv"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
)

// GetDashboardOverview returns market overview data for the dashboard:
// - Major index quotes (上证/深证/创业板)
// - Detailed rise/fall distribution (涨停, 涨停~5%, 5%~1%, 1%~0%, 平, 0~-1%, -1%~-5%, -5%~跌停, 跌停)
// - Sentiment score with 5-day history
// - Total market turnover
func (h *Handler) GetDashboardOverview(c *gin.Context) {
	tradeDate := normTradeDate(c.DefaultQuery("trade_date", ""))

	// 1. Fetch major indices from Eastmoney
	indices := fetchMajorIndices()

	// 2. Fetch rise/fall distribution from Eastmoney
	distribution := fetchRiseFallDistribution()

	// 3. Get sentiment data (current + 5 day history)
	sentimentScore, upCount, downCount, flatCount, totalAmount := fetchSentimentFromDB(tradeDate)

	// 4. Get 5-day sentiment history
	sentimentHistory := fetchSentimentHistory(5)

	// 5. Get limit stats (涨停/跌停/炸板/封板比)
	var upLimitCount, downLimitCount, brokenCount int64
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'U'", tradeDate).Count(&upLimitCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'D'", tradeDate).Count(&downLimitCount)
	repository.DB.Model(&TsLimitList{}).Where("trade_date = ? AND `limit` = 'Z'", tradeDate).Count(&brokenCount)

	// Get highest board
	highestBoard := 0
	var steps []TsLimitStep
	repository.DB.Where("trade_date = ?", tradeDate).Order("CAST(nums AS INTEGER) DESC").Limit(1).Find(&steps)
	if len(steps) > 0 {
		highestBoard, _ = strconv.Atoi(steps[0].Nums)
	}
	if highestBoard == 0 {
		var maxItem TsLimitList
		if err := repository.DB.Where("trade_date = ? AND `limit` = 'U'", tradeDate).
			Order("limit_times DESC").First(&maxItem).Error; err == nil {
			highestBoard = maxItem.LimitTimes
		}
	}

	// Seal ratio: 封板比 = limit_up / (limit_up + broken)
	sealRatio := "---"
	if upLimitCount+brokenCount > 0 {
		sealRatio = strconv.FormatInt(upLimitCount, 10) + ":" + strconv.FormatInt(brokenCount, 10)
	}

	// Broken rate
	brokenRate := 0.0
	if upLimitCount+brokenCount > 0 {
		brokenRate = float64(brokenCount) / float64(upLimitCount+brokenCount) * 100
	}

	response.Success(c, gin.H{
		"trade_date": formatTradeDateForDisplay(tradeDate),
		"indices":    indices,
		"distribution": distribution,
		"up_count":   upCount,
		"down_count": downCount,
		"flat_count": flatCount,
		"total_amount": totalAmount,
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
	})
}

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

		indices = append(indices, gin.H{
			"code":       code,
			"name":       name,
			"price":      price,
			"change":     change,
			"change_pct": changePct,
			"amount":     math.Round(amount/100000000*100) / 100, // 亿元
		})
	}

	return indices
}

// fetchRiseFallDistribution fetches the detailed distribution of rises and falls
// Returns: 涨停, 涨停~5%, 5%~1%, 1%~0%, 平盘, 0~-1%, -1%~-5%, -5%~跌停, 跌停
func fetchRiseFallDistribution() []gin.H {
	// Eastmoney provides rise/fall distribution via market overview
	url := "https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=5000&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23,m:0+t:81+s:2048&fields=f3"

	data, err := fetchEastmoneyAPIWithRetry(url, 2)
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
	if !ok {
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
