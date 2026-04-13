<p align="center">
  <img src="frontend/public/logo.svg" width="80" height="80" alt="QuantMind Logo" />
</p>

<h1 align="center">QuantMind</h1>

<p align="center">
  <strong>A股 AI 量化炒股平台</strong><br/>
  <sub>Intelligent A-Stock Quantitative Trading Platform Powered by Hermes Agent</sub>
</p>

<p align="center">
  <a href="https://go.dev"><img src="https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go" alt="Go"></a>
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React"></a>
  <a href="https://www.mysql.com"><img src="https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql&logoColor=white" alt="MySQL"></a>
  <a href="https://www.rabbitmq.com"><img src="https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=flat-square&logo=rabbitmq&logoColor=white" alt="RabbitMQ"></a>
  <a href="https://www.docker.com"><img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white" alt="Docker"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"></a>
</p>

---

## Overview

QuantMind is a full-stack AI-powered quantitative trading platform for China's A-share stock market. It combines real-time market data from multiple sources, nine quantitative strategies, four AI agents built on the Hermes Agent architecture, and a clean modern UI — all deployable with a single `docker-compose up`.

**Design Principles**

- All parameters are configured through the UI — no manual backend editing
- Every metric, label, and threshold comes from real external data sources
- Strategy thresholds are derived from documented technical analysis standards
- AI responses must cite specific data sources and analysis systems

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Market Data Sources](#market-data-sources)
- [AI Agents](#ai-agents)
- [Quantitative Strategies](#quantitative-strategies)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [License](#license)

---

## Features

### Dashboard

A full-screen data dashboard with 7-day history and day-by-day navigation:

| Module | Description |
|--------|-------------|
| Sector Heat Map | Color-coded tiles showing sector performance |
| Limit-Up Board | Stocks at daily price limit with seal strength |
| Board Ladder | Multi-day consecutive limit-up visualization |
| Broken Board | Stocks that failed to hold daily limit |
| Dragon & Tiger List | Institutional buy/sell/net data |
| Sentiment Index | 0–100 market emotion score |
| Fund Flow | Net capital inflow by sector (bar chart) |
| Turnover Trend | 5-day total market turnover |
| Up/Down Distribution | Pie chart of advancing vs declining stocks |

### Real-Time Quotes (4 Channels)

| Source | Endpoint | Data |
|--------|----------|------|
| Sina Finance | hq.sinajs.cn | Live quotes, historical K-line |
| Tencent Finance | qt.gtimg.cn | Live quotes, sector data |
| Eastmoney | push2.eastmoney.com | Quotes, fund flow, Dragon & Tiger |
| TDX | Reserved | Level-2 data |

### AI Chat (4 Agents)

Four specialized agents with Markdown rendering and conversation history. See [AI Agents](#ai-agents) for details.

### 9 Quant Strategies

Each strategy has documented scoring factors, threshold rules, and data sources. See [Quantitative Strategies](#quantitative-strategies) for details.

### AI Model Management

Page-based configuration for 12 pre-loaded providers — fill in your API key directly in the UI:

> OpenAI / DeepSeek / Qwen (Tongyi) / GLM (Zhipu) / Kimi (Moonshot) / Baichuan / MiniMax / Doubao (Volcengine) / SiliconFlow / Anthropic Claude / Google Gemini / MiaoXiang API

### Audit Logging

Full-chain audit trail: login events, agent invocations, data access, strategy execution, and admin operations — with filtering by module, user, and time range.

---

## Architecture

```
                        Browser
                          |
                    Nginx (Port 80)
                   /              \
            Static (React)     /api/* -> Backend
                                  |
                         Go + Gin (:8080)
                     /      |      \
                JWT Auth   CORS   Audit MW
                     |
          +----------+----------+----------+----------+
          |          |          |          |          |
        Auth      Agent     Market    Strategy    Admin
          |          |          |          |          |
       +--+--+       |    +----+----+     |          |
     MySQL  RabbitMQ |    Sina      |  Baostock     |
     :3306   :5672   |    Tencent   |  Eastmoney    |
                     |    Eastmoney |               |
                     |              |               |
                     +------ Hermes Agent ----------+
                            (LLM API calls)
```

---

## Tech Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Go | 1.22 | Server language |
| Gin | 1.10 | HTTP framework |
| GORM | 1.25 | ORM (MySQL + SQLite) |
| MySQL | 8.0 | Production database |
| SQLite | - | Development database |
| RabbitMQ | 3.13 | Message queue (4 queues) |
| JWT (golang-jwt) | 5.x | Authentication |
| bcrypt | - | Password hashing |
| Logrus | 1.9 | Structured logging |

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI framework |
| Vite | 5.4 | Build tool |
| Tailwind CSS | 3.4 | Utility-first CSS |
| Zustand | 4.5 | State management |
| Recharts | 2.12 | Charts (area, bar, pie, line) |
| React Router | 6.26 | Client-side routing |
| Axios | 1.7 | HTTP client |
| Lucide React | 0.436 | Icon library |
| react-hot-toast | 2.4 | Notifications |
| react-markdown | - | Markdown rendering in chat |

### Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization (multi-stage builds) |
| Docker Compose | Service orchestration (4 services) |
| Nginx | Reverse proxy + SPA fallback |

---

## Getting Started

### Prerequisites

- **Docker + Docker Compose** (recommended), or
- **Go 1.22+** and **Node.js 18+** for development mode

### Option 1: Docker Compose (Production)

```bash
git clone https://github.com/jibiao-ai/astock.git
cd astock

# Copy and edit environment variables
cp .env.example .env
# Edit .env — at minimum set your AI_API_KEY

# Start all services
docker-compose up -d

# Open http://localhost in your browser
```

> **China users**: The backend Dockerfile includes `GOPROXY=https://goproxy.cn,direct` for fast module downloads.

### Option 2: Development Mode

```bash
# Terminal 1 — Backend (uses SQLite, no MySQL required)
cd backend
export DB_DRIVER=sqlite
go run ./cmd/server
# API available at http://localhost:8080

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
# UI available at http://localhost:3000 (proxies /api to :8080)
```

### Default Login

| Field | Value |
|-------|-------|
| Username | `admin` |
| Password | `Admin@2026!` |
| Role | Administrator |

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80 | Web UI (Nginx) |
| Backend | 8080 | REST API (Gin) |
| MySQL | 3306 | Database |
| RabbitMQ | 5672 | Message queue |
| RabbitMQ UI | 15672 | Management console |

---

## Project Structure

```
quantmind/
├── backend/                          # Go backend
│   ├── cmd/server/main.go           # Entry point, route definitions
│   ├── internal/
│   │   ├── config/config.go         # Environment config loader
│   │   ├── handler/
│   │   │   ├── handlers.go          # All API handlers (30+ endpoints)
│   │   │   └── marketfetch.go       # Eastmoney API integration + data seeding
│   │   ├── middleware/auth.go       # JWT / RBAC / Audit middleware
│   │   ├── model/models.go         # GORM models (17 tables)
│   │   ├── mq/rabbitmq.go          # RabbitMQ client (4 queues)
│   │   └── repository/db.go        # DB init + seed data
│   ├── pkg/
│   │   ├── logger/logger.go        # Logrus-based logger
│   │   └── response/response.go    # Unified API response helpers
│   ├── Dockerfile                   # Multi-stage build (with GOPROXY)
│   ├── go.mod
│   └── go.sum
│
├── frontend/                         # React frontend
│   ├── public/
│   │   ├── logo.svg                 # QuantMind brand logo (512x512)
│   │   └── favicon.svg              # Browser favicon (32x32)
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainLayout.jsx       # App shell with sidebar + content
│   │   │   └── Sidebar.jsx          # Navigation sidebar with logo
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx        # Login with QuantMind branding
│   │   │   ├── DashboardPage.jsx    # Market dashboard (10 widgets)
│   │   │   ├── RealtimePage.jsx     # Real-time quotes (4 sources)
│   │   │   ├── ChatPage.jsx         # AI conversation (Markdown)
│   │   │   ├── StrategiesPage.jsx   # 9 strategy cards with details
│   │   │   ├── SignalsPage.jsx      # Strategy signal table
│   │   │   ├── AgentsPage.jsx       # Agent CRUD + skill binding
│   │   │   ├── AIModelsPage.jsx     # Provider config (12 vendors)
│   │   │   ├── UsersPage.jsx        # User management
│   │   │   └── AuditLogPage.jsx     # Audit log viewer
│   │   ├── services/api.js          # Axios API client
│   │   ├── store/useStore.js        # Zustand global store
│   │   └── styles/index.css         # Global styles + CSS variables
│   ├── Dockerfile                   # Multi-stage build (Node + Nginx)
│   ├── nginx.conf                   # Reverse proxy config
│   ├── vite.config.js               # Dev server + proxy
│   ├── tailwind.config.js           # Brand color palette
│   └── package.json
│
├── docker-compose.yml                # 4-service orchestration
├── .env.example                      # Environment variable template
├── LICENSE                           # MIT License
└── README.md
```

---

## Market Data Sources

QuantMind integrates three live API sources for A-share market data, with a fourth reserved:

### Eastmoney (东方财富)

| API | Endpoint | Data |
|-----|----------|------|
| Sector Heat | push2.eastmoney.com | 16 sector tiles with change%, lead stock, fund flow |
| Limit-Up Board | push2ex.eastmoney.com | Limit-up/broken-board stocks with seal count |
| Dragon & Tiger | datacenter-web.eastmoney.com | Institutional buy/sell by stock |

### Sina Finance (新浪财经)

| API | Endpoint | Data |
|-----|----------|------|
| Real-time Quote | hq.sinajs.cn | Price, volume, turnover for any A-share code |

### Tencent Finance (腾讯财经)

| API | Endpoint | Data |
|-----|----------|------|
| Real-time Quote | qt.gtimg.cn | Alternative quote source with sector data |

All fetched data is automatically persisted to the database for historical analysis by AI agents.

---

## AI Agents

Four specialized agents built on the **Hermes Agent** architecture:

| Agent | Type | Data Sources | Capabilities |
|-------|------|-------------|-------------|
| Smart Ask | `smart_ask` | Baostock, Eastmoney, Sina | Stock lookup, technical indicators, fund flow |
| Smart Diagnose | `smart_diagnose` | Multi-dimensional data | Investment value assessment, buy/sell timing |
| Main Flow Analyst | `main_flow` | MiaoXiang API | Institutional positioning, chip distribution |
| Quant Expert | `quant_expert` | Baostock, Eastmoney | Market opportunities, risk alerts, sector rotation |

### Hermes Agent Protocol

1. **Self-improvement** — Summarizes experience after each interaction
2. **Persistent memory** — Cross-session context retention
3. **Tool calling** — `<tool_call>` tags for external tool invocation
4. **Skill system** — 16 bindable skills per agent

### Pre-registered Skills (16)

Market data query, K-line analysis, sector heat analysis, limit-up board analysis, Dragon & Tiger interpretation, sentiment scoring, fund flow tracking, stock diagnosis, strategy signal generation, risk assessment, opportunity scanning, trend analysis, concept tracking, auction analysis, portfolio optimization, and report generation.

---

## Quantitative Strategies

Nine strategies with documented scoring systems and evidence-based thresholds:

| # | Strategy | Scoring System | Key Threshold |
|---|----------|---------------|---------------|
| 1 | **Dragon Board** | 11 factors / 130 pts | >= 90 strong buy; seal strength S-grade |
| 2 | **Strong Pullback** | 11 factors / 180 pts | Dragon & Tiger net buy > 50M bonus |
| 3 | **Trend Core** | Trend pool + buypoint | MA20/MA60 both rising, held 3+ days |
| 4 | **Event Burst** | 7-step loop + 4-tier supply chain | Policy announcement -> verification -> entry |
| 5 | **Concept Core** | 5 lifecycle phases | Buy at fermentation + sector resonance |
| 6 | **Auction Pick** | Golden formula | Open +3-5%, auction vol 8-12%, bid ratio >60% |
| 7 | **Group Hug** | 5-step funnel + 8 factors | Volume shrink to 50% of limit day -> reversal |
| 8 | **Pre-Market Select** | 9-strategy composite | Composite score > 80 enters selection pool |
| 9 | **Micro Overnight** | 2-level filter + sentiment gate | Sentiment > 50 open / < 30 close, target WR 72% |

Each strategy card in the UI shows all scoring factors, threshold rules, and data source documentation.

---

## API Reference

### Public

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Authenticate and receive JWT token |

### Authenticated (Bearer Token)

**User & Dashboard**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/profile` | Current user info |
| GET | `/api/dashboard` | Full dashboard data (accepts `?date=`) |

**Market Data**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/market/sentiment` | Market sentiment (accepts `?days=`) |
| GET | `/api/market/sector-heat` | Sector heat map data |
| GET | `/api/market/limit-up` | Limit-up board (accepts `?type=`) |
| GET | `/api/market/dragon-tiger` | Dragon & Tiger list |
| GET | `/api/market/board-ladder` | Consecutive board ladder |
| GET | `/api/market/quote` | Real-time quote (`?code=&source=`) |
| GET | `/api/market/kline` | K-line data (`?code=&period=`) |
| GET | `/api/market/sectors` | Sector list |
| POST | `/api/market/fetch` | Trigger Eastmoney data fetch |

**AI Agents**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List all agents |
| POST | `/api/agents` | Create agent |
| PUT | `/api/agents/:id` | Update agent |
| DELETE | `/api/agents/:id` | Delete agent |
| GET | `/api/skills` | List all skills |
| POST | `/api/agents/:id/skills` | Bind skills to agent |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/:id/messages` | Get messages |
| POST | `/api/conversations/:id/messages` | Send message (triggers AI) |
| DELETE | `/api/conversations/:id` | Delete conversation |

**AI Providers**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ai-providers` | List all providers |
| POST | `/api/ai-providers` | Add provider |
| PUT | `/api/ai-providers/:id` | Update provider config |
| POST | `/api/ai-providers/:id/test` | Test connection |

**Strategies**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/strategies` | List strategies |
| GET | `/api/strategy-signals` | Signals (`?strategy=&date=`) |

**Admin**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |
| GET | `/api/audit-logs` | Audit logs (`?page=&module=&username=`) |

---

## Configuration

All configuration is done through environment variables. Copy `.env.example` to `.env` and edit:

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `SERVER_PORT` | `8080` | Backend HTTP port |
| `GIN_MODE` | `debug` | Gin mode (`debug` / `release`) |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DB_DRIVER` | `mysql` | Database driver (`mysql` / `sqlite`) |
| `DB_HOST` | `mysql` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `quantmind` | MySQL username |
| `DB_PASSWORD` | `quantmind123` | MySQL password |
| `DB_NAME` | `quantmind` | Database name |

### Message Queue

| Variable | Default | Description |
|----------|---------|-------------|
| `RABBITMQ_HOST` | `rabbitmq` | RabbitMQ host |
| `RABBITMQ_PORT` | `5672` | RabbitMQ port |
| `RABBITMQ_USER` | `guest` | RabbitMQ username |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ password |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `quantmind-secret-key-2026` | JWT signing secret |
| `ADMIN_USER` | `admin` | Initial admin username |
| `ADMIN_PASSWORD` | `Admin@2026!` | Initial admin password |

### AI (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `AI_PROVIDER` | `deepseek` | Default AI provider name |
| `AI_API_KEY` | _(empty)_ | Default provider API key |
| `AI_BASE_URL` | `https://api.deepseek.com/v1` | Default provider base URL |
| `AI_MODEL` | `deepseek-chat` | Default model name |

> Additional AI providers can be added and configured entirely through the web UI after login.

---

## Brand

| Element | Value |
|---------|-------|
| Primary Color | `#513CC8` |
| Background | `#F8F9FC` |
| Card | `#FFFFFF` |
| Border | `#E5E7EB` |
| Stock Up (Red) | `#EF4444` |
| Stock Down (Green) | `#22C55E` |
| Logo | Rounded square `#513CC8` + white Q-lightning icon |

---

## Acknowledgements

QuantMind integrates ideas and techniques from leading open-source A-share quantitative projects:

- **[Qlib](https://github.com/microsoft/qlib)** (Microsoft) — Quantitative research framework
- **[VeighNa](https://github.com/vnpy/vnpy)** — Most popular domestic open-source quant platform
- **[AKShare](https://github.com/akfamily/akshare)** — A-share data interface library
- **[Baostock](http://baostock.com)** — Securities data toolkit
- **[stock_analysis](https://github.com/jiasanpang/stock_analysis)** — Intelligent analysis agent

---

## License

[MIT License](LICENSE)

---

<p align="center">
  <strong>QuantMind</strong> — Intelligent Quantitative Trading, Data-Driven, AI-Powered Investment Decisions
</p>
