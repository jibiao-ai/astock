package main

import (
	"log"

	"quantmind/internal/config"
	"quantmind/internal/handler"
	"quantmind/internal/middleware"
	"quantmind/internal/mq"
	"quantmind/internal/repository"
	"quantmind/pkg/logger"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Init
	logger.Init()
	cfg := config.Load()
	middleware.SetJWTSecret(cfg.JWTSecret)
	repository.InitDB(cfg)
	mq.InitRabbitMQ(cfg)
	defer mq.Close()

	// Seed demo market data for past 7 days
	handler.SeedDemoMarketData()

	// Gin
	if cfg.GinMode == "release" {
		gin.SetMode(gin.ReleaseMode)
	}
	r := gin.Default()

	// CORS
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	h := handler.New()

	// Public routes
	r.POST("/api/login", h.Login)

	// Authenticated routes
	auth := r.Group("/api")
	auth.Use(middleware.AuthMiddleware())
	auth.Use(middleware.AuditMiddleware())
	{
		// Profile
		auth.GET("/profile", h.GetProfile)
		auth.GET("/dashboard", h.GetDashboardEnhanced)

		// Market Data
		auth.GET("/market/sentiment", h.GetMarketSentiment)
		auth.GET("/market/sector-heat", h.GetSectorHeat)
		auth.GET("/market/limit-up", h.GetLimitUpBoard)
		auth.GET("/market/dragon-tiger", h.GetDragonTiger)
		auth.GET("/market/board-ladder", h.GetBoardLadder)
		auth.GET("/market/quote", h.GetStockQuote)
		auth.GET("/market/kline", h.GetKLine)
		auth.GET("/market/sectors", h.GetSectorList)
		auth.POST("/market/fetch", h.FetchMarketData)
		auth.GET("/market/trend", h.GetTrendChart)
		auth.GET("/market/trend5day", h.GetTrendChart5Day)
		auth.GET("/market/chip", h.GetChipDistribution)
		auth.GET("/market/fund-flow", h.GetStockFundFlow)
		auth.GET("/market/concept-heat", h.GetConceptHeat)
		auth.GET("/market/limit-details", h.GetLimitUpDownDetails)
		auth.GET("/market/sector-fund-flow", h.GetSectorFundFlow)
		auth.GET("/market/realtime-stats", h.GetRealTimeStats)
		auth.GET("/market/dragon-tiger-hotmoney", h.GetDragonTigerHotMoney)
		auth.GET("/market/hot-list", h.GetMarketHotList)
		auth.GET("/market/kline-realtime", h.GetKLineRealtime)
		auth.GET("/market/guba", h.GetGubaDiscussion)

		// Today's stock picks (all users can read)
		auth.GET("/stock-picks/today", h.GetTodayPicks)

		// Watchlist
		auth.GET("/watchlist", h.GetWatchlist)
		auth.POST("/watchlist", h.AddWatchlistItem)
		auth.DELETE("/watchlist/:code", h.RemoveWatchlistItem)
		auth.GET("/watchlist/quotes", h.GetWatchlistQuotes)

		// Agents
		auth.GET("/agents", h.ListAgents)
		auth.GET("/agents/:id", h.GetAgent)
		auth.POST("/agents", h.CreateAgent)
		auth.PUT("/agents/:id", h.UpdateAgent)
		auth.DELETE("/agents/:id", h.DeleteAgent)

		// Skills
		auth.GET("/skills", h.ListSkills)
		auth.GET("/agents/:id/skills", h.GetAgentSkills)
		auth.POST("/agent-skills", h.BindAgentSkill)

		// Conversations & Chat
		auth.GET("/conversations", h.ListConversations)
		auth.POST("/conversations", h.CreateConversation)
		auth.DELETE("/conversations/:id", h.DeleteConversation)
		auth.GET("/conversations/:id/messages", h.GetMessages)
		auth.POST("/conversations/:id/messages", h.SendMessage)

		// AI Providers
		auth.GET("/ai-providers", h.ListAIProviders)
		auth.PUT("/ai-providers/:id", h.UpdateAIProvider)
		auth.POST("/ai-providers/:id/test", h.TestAIProvider)
		auth.POST("/ai-providers", h.CreateAIProvider)

		// Strategies
		auth.GET("/strategies", h.GetStrategyList)
		auth.GET("/strategy-signals", h.GetStrategySignals)

		// Admin routes – must use `admin.` not `auth.` so AdminMiddleware is applied
		admin := auth.Group("")
		admin.Use(middleware.AdminMiddleware())
		{
			admin.GET("/users", h.ListUsers)
			admin.POST("/users", h.CreateUser)
			admin.PUT("/users/:id", h.UpdateUser)
			admin.DELETE("/users/:id", h.DeleteUser)
			admin.GET("/audit-logs", h.GetAuditLogs)

			// Stock picks management (admin only)
			admin.GET("/stock-picks", h.ListStockPicks)
			admin.POST("/stock-picks", h.CreateStockPick)
			admin.PUT("/stock-picks/:id", h.UpdateStockPick)
			admin.DELETE("/stock-picks/:id", h.DeleteStockPick)
		}
	}

	log.Printf("QuantMind Server starting on port %s", cfg.ServerPort)
	r.Run(":" + cfg.ServerPort)
}
