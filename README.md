<p align="center">
  <img src="frontend/public/logo.svg" width="80" height="80" alt="QuantMind Logo" />
</p>

<h1 align="center">QuantMind</h1>

<p align="center">
  <strong>A股 AI 量化炒股平台</strong><br/>
  <sub>基于 Hermes Agent 架构的智能 A 股量化交易平台</sub>
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

## 项目简介

QuantMind 是一套面向中国 A 股市场的全栈 AI 量化交易平台。它集成了多渠道实时行情数据（Tushare / 东方财富 / 新浪 / 腾讯）、9 套量化策略、4 个基于 Hermes Agent 架构的 AI 智能体，以及简洁现代的 UI 界面 —— 全部可通过一条 `docker-compose up` 命令完成部署。

**设计原则**

- 所有参数均通过 UI 配置 —— 无需手动修改后端代码
- 每一个指标、标签、阈值均来源于真实外部数据
- 策略阈值基于已论证的技术分析标准
- AI 回答必须引用具体的数据来源和分析体系

---

## 目录

- [核心功能](#核心功能)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [行情数据源](#行情数据源)
- [AI 智能体](#ai-智能体)
- [量化策略](#量化策略)
- [API 接口文档](#api-接口文档)
- [配置说明](#配置说明)
- [版本记录](#版本记录)
- [许可证](#许可证)

---

## 核心功能

### 行情看板大屏

全屏数据看板，支持 7 日历史记录和逐日导航：

| 模块 | 说明 |
|------|------|
| 板块热力图 | 板块涨跌幅色块展示，颜色越深涨跌越大 |
| 涨停板 | 封板强度分级、涨停原因标注 |
| 连板天梯 | 多日连续涨停可视化梯度 |
| 炸板监控 | 封板失败个股追踪 |
| 龙虎榜 | 机构/游资买卖净额数据 |
| 情绪温度计 | 0–100 市场情绪评分 |
| 资金流向 | 板块净流入柱状图 |
| 成交额趋势 | 近 5 日全市场成交额走势 |
| 涨跌分布 | 上涨/下跌/平盘比例分布图 |
| 大盘指数 | 上证/深证/创业板实时行情 |

### 游资打板

专业游资跟踪分析页面（v2.0+）：

| 模块 | 说明 |
|------|------|
| 日历网格 | 月历形式展示，交易日高亮，支持前后翻页追溯 |
| 游资排行 | 左侧 50% 展示游资实力排行及买卖详情 |
| 个股信息 | 右侧 50% 展示选中个股的详细信息面板 |
| 买卖比例条 | 可视化展示游资买入/卖出金额占比 |
| 默认选中 | 数据加载后自动选中排名第一的游资及其首只个股 |

### 实时行情（4 通道）

| 来源 | 接口 | 数据内容 |
|------|------|----------|
| 新浪财经 | hq.sinajs.cn | 实时报价、历史 K 线 |
| 腾讯财经 | qt.gtimg.cn | 实时报价、板块数据 |
| 东方财富 | push2.eastmoney.com | 报价、资金流、龙虎榜 |
| 通达信 | 预留 | Level-2 行情 |

### Tushare 数据接口（v2.1 已验证）

| 接口 | 数据量/说明 | 状态 |
|------|-------------|------|
| daily | 5,460 只股票涨跌幅+成交额 | 可用 |
| daily_basic | 市值/流通市值/换手率 | 可用 |
| index_daily | 沪深成交额（千元单位） | 可用 |
| stk_limit | 7,574 只股票涨跌停价 | 可用 |
| moneyflow | 5,151 只股票资金流向 | 可用 |
| moneyflow_ind_ths | 90 个行业板块热力 | 可用（偶有超时） |
| moneyflow_hsgt | 北向/南向资金 | 可用 |
| concept | 879 个概念板块 | 可用 |
| trade_cal | 交易日历 | 可用 |
| limit_list_d | 涨跌停明细 | 受限（1次/小时） |
| limit_step / ths_daily | 连板/同花顺指数 | 无权限 |

### AI 对话（4 个智能体）

四个专业智能体，支持 Markdown 渲染和对话历史。详见 [AI 智能体](#ai-智能体)。

### 9 套量化策略

每套策略均有完整的评分因子、阈值规则和数据来源说明。详见 [量化策略](#量化策略)。

### AI 模型管理

页面化配置 12 个预置供应商 —— 直接在 UI 中填入 API Key 即可使用：

> OpenAI / DeepSeek / 通义千问 / 智谱 GLM / Kimi / 百川 / MiniMax / 豆包 / SiliconFlow / Anthropic Claude / Google Gemini / 妙想 API

### 审计日志

全链路审计追踪：登录事件、智能体调用、数据访问、策略执行、管理操作 —— 支持按模块、用户、时间范围筛选。

---

## 系统架构

```
                        浏览器
                          |
                    Nginx (80端口)
                   /              \
            静态资源 (React)    /api/* -> 后端
                                  |
                         Go + Gin (:8080)
                     /      |      \
                JWT认证    CORS   审计中间件
                     |
          +----------+----------+----------+----------+
          |          |          |          |          |
        认证       智能体      行情       策略       管理
          |          |          |          |          |
       +--+--+       |    +----+----+     |          |
     MySQL  RabbitMQ |    Tushare   |  东方财富     |
     :3306   :5672   |    新浪     |  Baostock    |
                     |    腾讯     |               |
                     |    东方财富  |               |
                     |              |               |
                     +------ Hermes Agent ----------+
                            (大模型 API 调用)
```

### 数据获取优先级

```
Tushare daily（全量快照）→ 东方财富实时 API → 数据库缓存 → 历史数据 → 默认值
```

> 确保任何情况下不返回零值或"暂无数据"。

---

## 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Go | 1.22 | 服务端语言 |
| Gin | 1.10 | HTTP 框架 |
| GORM | 1.25 | ORM（MySQL + SQLite） |
| MySQL | 8.0 | 生产环境数据库 |
| SQLite | - | 开发环境数据库 |
| RabbitMQ | 3.13 | 消息队列（4 队列） |
| JWT (golang-jwt) | 5.x | 身份认证 |
| bcrypt | - | 密码加密 |
| Logrus | 1.9 | 结构化日志 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18.3 | UI 框架 |
| Vite | 5.4 | 构建工具 |
| Tailwind CSS | 3.4 | 原子化 CSS |
| Zustand | 4.5 | 状态管理 |
| Recharts | 2.12 | 图表（面积图、柱状图、饼图、折线图） |
| React Router | 6.26 | 客户端路由 |
| Axios | 1.7 | HTTP 客户端 |
| Lucide React | 0.436 | 图标库 |
| react-hot-toast | 2.4 | 通知提示 |
| react-markdown | - | 聊天 Markdown 渲染 |

### 基础设施

| 技术 | 用途 |
|------|------|
| Docker | 容器化（多阶段构建） |
| Docker Compose | 服务编排（4 个服务） |
| Nginx | 反向代理 + SPA 路由回退 |

---

## 快速开始

### 前置要求

- **Docker + Docker Compose**（推荐），或
- **Go 1.22+** 和 **Node.js 18+**（开发模式）

### 方式一：Docker Compose（生产环境）

```bash
git clone https://github.com/jibiao-ai/astock.git
cd astock

# 复制并编辑环境变量
cp .env.example .env
# 编辑 .env —— 至少设置 AI_API_KEY

# 启动所有服务
docker-compose up -d

# 浏览器访问 http://localhost
```

> **国内用户**：后端 Dockerfile 已配置 `GOPROXY=https://goproxy.cn,direct` 加速模块下载。

### 方式二：开发模式

```bash
# 终端 1 —— 后端（使用 SQLite，无需 MySQL）
cd backend
export DB_DRIVER=sqlite
go run ./cmd/server
# API 地址：http://localhost:8080

# 终端 2 —— 前端
cd frontend
npm install
npm run dev
# UI 地址：http://localhost:3000（自动代理 /api 到 :8080）
```

### 默认登录账号

| 字段 | 值 |
|------|-----|
| 用户名 | `admin` |
| 密码 | `Admin@2026!` |
| 角色 | 管理员 |

### 服务端口

| 服务 | 端口 | 说明 |
|------|------|------|
| 前端 | 80 | Web 界面（Nginx） |
| 后端 | 8080 | REST API（Gin） |
| MySQL | 3306 | 数据库 |
| RabbitMQ | 5672 | 消息队列 |
| RabbitMQ 管理 | 15672 | 管理控制台 |

---

## 项目结构

```
astock/
├── backend/                              # Go 后端
│   ├── cmd/server/main.go               # 入口、路由定义
│   ├── internal/
│   │   ├── config/config.go             # 环境变量配置加载
│   │   ├── handler/
│   │   │   ├── handlers.go              # 所有 API 处理器（30+ 接口）
│   │   │   ├── dashboard_overview.go    # 看板大屏数据聚合（多源回退）
│   │   │   ├── eastmoney.go             # 东方财富 API 集成
│   │   │   ├── tushare.go              # Tushare 基础接口
│   │   │   ├── tushare_dashboard.go     # Tushare 看板数据
│   │   │   ├── tushare_hotmoney.go      # 游资打板数据
│   │   │   ├── tushare_broadcast.go     # 播报数据
│   │   │   ├── marketfetch.go           # 行情抓取 + 数据播种
│   │   │   └── aistockpick.go           # AI 选股
│   │   ├── middleware/auth.go           # JWT / RBAC / 审计中间件
│   │   ├── model/models.go             # GORM 模型（17 张表）
│   │   ├── mq/rabbitmq.go              # RabbitMQ 客户端（4 队列）
│   │   └── repository/db.go            # 数据库初始化 + 种子数据
│   ├── pkg/
│   │   ├── logger/logger.go            # Logrus 日志封装
│   │   └── response/response.go        # 统一 API 响应工具
│   ├── Dockerfile                       # 多阶段构建（含 GOPROXY）
│   ├── go.mod
│   └── go.sum
│
├── frontend/                             # React 前端
│   ├── public/
│   │   ├── logo.svg                     # QuantMind 品牌 Logo
│   │   └── favicon.svg                  # 浏览器图标
│   ├── src/
│   │   ├── components/
│   │   │   ├── MainLayout.jsx           # 应用外壳（侧边栏 + 内容区）
│   │   │   └── Sidebar.jsx              # 导航侧边栏
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx            # 登录页
│   │   │   ├── DashboardPage.jsx        # 行情看板大屏（10 个组件）
│   │   │   ├── HotMoneyBoardPage.jsx    # 游资打板（日历+排行+个股）
│   │   │   ├── RealtimePage.jsx         # 实时行情（4 数据源）
│   │   │   ├── ChatPage.jsx             # AI 对话（Markdown 渲染）
│   │   │   ├── StrategiesPage.jsx       # 9 策略卡片详情
│   │   │   ├── SignalsPage.jsx          # 策略信号表
│   │   │   ├── BroadcastPage.jsx        # 盘中播报
│   │   │   ├── HotListPage.jsx          # 热门排行
│   │   │   ├── AIStockPickPage.jsx      # AI 选股
│   │   │   ├── StockPickPage.jsx        # 选股池
│   │   │   ├── WatchlistPage.jsx        # 自选股
│   │   │   ├── AgentsPage.jsx           # 智能体管理
│   │   │   ├── AIModelsPage.jsx         # AI 供应商配置（12 家）
│   │   │   ├── SettingsPage.jsx         # 系统设置
│   │   │   ├── UsersPage.jsx            # 用户管理
│   │   │   └── AuditLogPage.jsx         # 审计日志
│   │   ├── services/api.js              # Axios API 客户端
│   │   ├── store/useStore.js            # Zustand 全局状态
│   │   └── styles/index.css             # 全局样式 + CSS 变量
│   ├── Dockerfile                       # 多阶段构建（Node + Nginx）
│   ├── nginx.conf                       # 反向代理配置
│   ├── vite.config.js                   # 开发服务器 + 代理
│   ├── tailwind.config.js               # 品牌色板
│   └── package.json
│
├── docker/                               # Docker 相关配置
├── docs/                                 # 文档
├── scripts/                              # 脚本工具
├── docker-compose.yml                    # 4 服务编排
├── .env.example                          # 环境变量模板
├── LICENSE                               # MIT 许可证
└── README.md
```

---

## 行情数据源

QuantMind 集成多渠道 A 股行情数据，支持多源回退保障数据可用性：

### Tushare（主数据源）

| 接口 | 数据内容 | 单位说明 |
|------|----------|----------|
| daily | 全市场 5,460 只股票日行情（涨跌幅、成交额） | 成交额单位：千元 |
| index_daily | 上证/深证/创业板指数行情 | 成交额单位：千元 |
| daily_basic | 总市值、流通市值、换手率 | - |
| stk_limit | 涨跌停价 | - |
| moneyflow | 个股资金流向 | - |
| moneyflow_ind_ths | 行业板块资金流 | - |
| moneyflow_hsgt | 沪深港通资金 | 万元 |
| concept / concept_detail | 概念板块数据 | - |
| trade_cal | 交易日历 | - |

> **重要单位换算**（v2.1 修复）：
> - 千元 → 万亿：÷ 1e9
> - 千元 → 亿：÷ 1e5
> - 万亿 → 亿：× 10000
> - 元 → 万亿：÷ 1e12
> - 元 → 亿：÷ 1e8

### 东方财富（实时回退源）

| 接口 | 地址 | 数据内容 |
|------|------|----------|
| 板块热力 | push2.eastmoney.com | 板块涨跌幅、领涨股、资金流 |
| 涨停池 | push2ex.eastmoney.com/getTopicZTPool | 实时涨停股票 |
| 跌停池 | push2ex.eastmoney.com/getTopicDTPool | 实时跌停股票 |
| 炸板池 | push2ex.eastmoney.com/getTopicZBPool | 封板失败股票 |
| 龙虎榜 | datacenter-web.eastmoney.com | 机构买卖净额 |
| 全市场成交 | push2.eastmoney.com (f6) | 沪深成交总额（元） |

### 新浪财经

| 接口 | 地址 | 数据内容 |
|------|------|----------|
| 实时报价 | hq.sinajs.cn | 价格、成交量、换手率 |

### 腾讯财经

| 接口 | 地址 | 数据内容 |
|------|------|----------|
| 实时报价 | qt.gtimg.cn | 备用行情源、板块数据 |

所有获取的数据均自动持久化至数据库，供 AI 智能体进行历史分析。

---

## AI 智能体

四个专业智能体，基于 **Hermes Agent** 架构构建：

| 智能体 | 类型标识 | 数据来源 | 能力 |
|--------|----------|----------|------|
| 智能问答 | `smart_ask` | Baostock / 东方财富 / 新浪 | 股票查询、技术指标、资金流向 |
| 智能诊断 | `smart_diagnose` | 多维数据 | 投资价值评估、买卖时机判断 |
| 主力分析 | `main_flow` | 妙想 API | 机构持仓、筹码分布 |
| 量化专家 | `quant_expert` | Baostock / 东方财富 | 市场机会、风险预警、板块轮动 |

### Hermes Agent 协议

1. **自我进化** — 每次交互后自动总结经验
2. **持久记忆** — 跨会话上下文保持
3. **工具调用** — 通过 `<tool_call>` 标签调用外部工具
4. **技能系统** — 每个智能体最多绑定 16 个技能

### 预注册技能（16 个）

行情数据查询、K 线分析、板块热力分析、涨停板分析、龙虎榜解读、情绪评分、资金流向追踪、个股诊断、策略信号生成、风险评估、机会扫描、趋势分析、概念追踪、集合竞价分析、组合优化、报告生成。

---

## 量化策略

九套策略，每套均有完整评分体系和循证阈值：

| # | 策略名称 | 评分体系 | 核心阈值 |
|---|----------|----------|----------|
| 1 | **龙头打板** | 11因子 / 满分130 | >= 90 强买；封单强度 S 级 |
| 2 | **强势回封** | 11因子 / 满分180 | 龙虎榜净买 > 5000万加分 |
| 3 | **趋势核心** | 趋势池 + 买点判定 | MA20/MA60 双升，持有 3 天+ |
| 4 | **事件爆发** | 7步循环 + 4级供应链 | 政策发布 → 验证 → 入场 |
| 5 | **概念龙头** | 5阶段生命周期 | 发酵期买入 + 板块共振 |
| 6 | **竞价精选** | 黄金公式 | 开盘涨3-5%、竞价量8-12%、挂买比>60% |
| 7 | **抱团接力** | 5步漏斗 + 8因子 | 缩量至板日50% → 反转 |
| 8 | **盘前筛选** | 9策略复合 | 综合评分 > 80 进入候选池 |
| 9 | **微隔夜** | 2级过滤 + 情绪门控 | 情绪 > 50 开仓 / < 30 平仓，目标胜率72% |

每个策略卡片在 UI 中均展示完整的评分因子、阈值规则和数据来源文档。

---

## API 接口文档

### 公开接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 用户登录，返回 JWT Token |

### 需认证接口（Bearer Token）

**用户与看板**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/profile` | 当前用户信息 |
| GET | `/api/dashboard` | 看板大屏全量数据（支持 `?date=`） |
| GET | `/api/dashboard/overview` | 看板概览（多源聚合） |

**行情数据**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/market/sentiment` | 市场情绪（支持 `?days=`） |
| GET | `/api/market/sector-heat` | 板块热力图数据 |
| GET | `/api/market/limit-up` | 涨停板（支持 `?type=`） |
| GET | `/api/market/dragon-tiger` | 龙虎榜数据 |
| GET | `/api/market/board-ladder` | 连板天梯 |
| GET | `/api/market/quote` | 实时报价（`?code=&source=`） |
| GET | `/api/market/kline` | K 线数据（`?code=&period=`） |
| GET | `/api/market/sectors` | 板块列表 |
| POST | `/api/market/fetch` | 触发东方财富数据拉取 |

**AI 智能体**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/agents` | 列出所有智能体 |
| POST | `/api/agents` | 创建智能体 |
| PUT | `/api/agents/:id` | 更新智能体 |
| DELETE | `/api/agents/:id` | 删除智能体 |
| GET | `/api/skills` | 列出所有技能 |
| POST | `/api/agents/:id/skills` | 绑定技能 |
| GET | `/api/conversations` | 对话列表 |
| POST | `/api/conversations` | 创建对话 |
| GET | `/api/conversations/:id/messages` | 获取消息 |
| POST | `/api/conversations/:id/messages` | 发送消息（触发 AI） |
| DELETE | `/api/conversations/:id` | 删除对话 |

**AI 供应商**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/ai-providers` | 列出所有供应商 |
| POST | `/api/ai-providers` | 添加供应商 |
| PUT | `/api/ai-providers/:id` | 更新供应商配置 |
| POST | `/api/ai-providers/:id/test` | 测试连接 |

**策略**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/strategies` | 策略列表 |
| GET | `/api/strategy-signals` | 策略信号（`?strategy=&date=`） |

**管理**

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 创建用户 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |
| GET | `/api/audit-logs` | 审计日志（`?page=&module=&username=`） |

---

## 配置说明

所有配置通过环境变量完成。复制 `.env.example` 为 `.env` 后编辑：

### 服务器

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `SERVER_PORT` | `8080` | 后端 HTTP 端口 |
| `GIN_MODE` | `debug` | Gin 模式（`debug` / `release`） |

### 数据库

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DB_DRIVER` | `mysql` | 数据库驱动（`mysql` / `sqlite`） |
| `DB_HOST` | `mysql` | MySQL 主机 |
| `DB_PORT` | `3306` | MySQL 端口 |
| `DB_USER` | `quantmind` | MySQL 用户名 |
| `DB_PASSWORD` | `quantmind123` | MySQL 密码 |
| `DB_NAME` | `quantmind` | 数据库名 |

### 消息队列

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `RABBITMQ_HOST` | `rabbitmq` | RabbitMQ 主机 |
| `RABBITMQ_PORT` | `5672` | RabbitMQ 端口 |
| `RABBITMQ_USER` | `guest` | RabbitMQ 用户名 |
| `RABBITMQ_PASSWORD` | `guest` | RabbitMQ 密码 |

### 认证

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `JWT_SECRET` | `quantmind-secret-key-2026` | JWT 签名密钥 |
| `ADMIN_USER` | `admin` | 初始管理员用户名 |
| `ADMIN_PASSWORD` | `Admin@2026!` | 初始管理员密码 |

### AI 配置（可选）

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `AI_PROVIDER` | `deepseek` | 默认 AI 供应商 |
| `AI_API_KEY` | _(空)_ | 默认供应商 API Key |
| `AI_BASE_URL` | `https://api.deepseek.com/v1` | 默认供应商 Base URL |
| `AI_MODEL` | `deepseek-chat` | 默认模型名称 |

### Tushare 配置

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `TUSHARE_TOKEN` | _(空)_ | Tushare Pro 接口 Token |

> 额外 AI 供应商和 Tushare Token 均可在登录后通过 Web UI 进行配置。

---

## 版本记录

### v2.1（2026-04-30）

**重大 Bug 修复：**
- 修复 Tushare 成交额单位换算错误（千元 ÷ 1e6 → 千元 ÷ 1e9），修正前显示 2740.91 万亿，修正后显示 2.74 万亿
- 修复看板大屏所有"暂无数据"和零值问题
- 建立多源数据回退优先级：Tushare → 东方财富 → 数据库缓存 → 历史数据
- "较前日 放量/缩量"单位统一为亿（计算公式：(今日万亿 - 昨日万亿) × 10000 = 亿）

**游资打板 UI 重构：**
- 日历组件改为友好型月历网格，支持前后翻页追溯历史
- 布局改为左右 50/50 等高设计
- 数据加载后默认选中排名第一的游资及其首只个股

### v2.0

- 新增游资打板完整页面（日历、买卖比例条、汇总卡片）
- 看板大屏现代日历组件
- 情绪温度计优化

### v1.x

- 平台基础功能搭建
- 9 套量化策略
- 4 个 AI 智能体
- 实时行情 4 通道接入

---

## 品牌设计

| 元素 | 值 |
|------|-----|
| 主色 | `#513CC8` |
| 背景色 | `#F8F9FC` |
| 卡片色 | `#FFFFFF` |
| 边框色 | `#E5E7EB` |
| 股票涨（红） | `#EF4444` |
| 股票跌（绿） | `#22C55E` |
| Logo | 圆角方形 `#513CC8` + 白色 Q 闪电图标 |

---

## 致谢

QuantMind 集成了以下优秀开源 A 股量化项目的思想和技术：

- **[Qlib](https://github.com/microsoft/qlib)**（微软）— 量化研究框架
- **[VeighNa](https://github.com/vnpy/vnpy)** — 国内最流行的开源量化平台
- **[AKShare](https://github.com/akfamily/akshare)** — A 股数据接口库
- **[Baostock](http://baostock.com)** — 证券数据工具包
- **[Tushare](https://tushare.pro)** — 金融数据接口平台
- **[stock_analysis](https://github.com/jiasanpang/stock_analysis)** — 智能分析代理

---

## 许可证

[MIT License](LICENSE)

---

<p align="center">
  <strong>QuantMind</strong> — 智能量化交易，数据驱动，AI 赋能投资决策
</p>
