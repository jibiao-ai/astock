# 🐉 龙策 QuantMind — A股AI量化炒股平台

**Intelligent A-Stock Quantitative Trading Platform Powered by Hermes Agent**

一个融合AI智能体的A股掌上量化炒股平台，集实时行情、看板大屏、多维策略、智能问股诊股于一体。

[![Go](https://img.shields.io/badge/Go-1.22-00ADD8?style=flat&logo=go)](https://go.dev)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat&logo=mysql)](https://mysql.com)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-3.13-FF6600?style=flat&logo=rabbitmq)](https://rabbitmq.com)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat&logo=docker)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 目录

- [系统概览](#系统概览)
- [核心功能](#核心功能)
- [系统架构](#系统架构)
- [技术栈](#技术栈)
- [快速启动](#快速启动)
- [项目结构](#项目结构)
- [功能详情](#功能详情)
- [API参考](#api参考)
- [配置说明](#配置说明)
- [License](#license)

---

## 系统概览

**龙策 QuantMind** 是一个面向A股市场的AI量化炒股平台，参考 [DeliveryDesk](https://github.com/jibiao-ai/deliverydesk) 架构设计，融合 [stock_analysis](https://github.com/jiasanpang/stock_analysis) 智能分析能力，并整合 GitHub 上 star 评分前十的A股量化项目（Qlib、VeighNa、AKShare、Baostock等）的核心技能。

### 设计原则

- **所有参数页面化**：禁止后台填写参数，所有配置在前端页面完成
- **数据来源透明**：所有指标/标签/数值必须来自外部数据分析，禁止编造数据
- **阈值有据可依**：每个策略阈值均基于具体外部数据分析和技术指标标准
- **引用具体系统**：回答必须引用具体数据来源和分析系统

### 默认登录

| 字段 | 值 |
|------|------|
| 用户名 | `admin` |
| 密码 | `Admin@2026!` |
| 角色 | 管理员 |

---

## 核心功能

### 1. 看板大屏（Dashboard）

可查看过往7天数据，支持按天筛选：

| 模块 | 说明 |
|------|------|
| 热力板块 | 彩色热力图展示各板块涨跌幅 |
| 涨停封板 | 涨停个股列表+封板强度分析 |
| 炸板个股 | 开板次数+时间统计 |
| 最高连板 | 连板天梯可视化 |
| 龙虎榜游资 | 买入/卖出/净买入数据 |
| 情绪分 | 0-100分量化市场情绪 |
| 板块资金流入 | 各概念板块资金净流入柱状图 |
| 总成交额 | 每日成交额趋势 |
| 5日情绪走势 | 面积图趋势展示 |
| 涨跌分布 | 上涨/下跌/平盘饼图 |

### 2. 实时行情（4大通道）

| 数据源 | 接口 | 能力 |
|--------|------|------|
| 新浪财经 | hq.sinajs.cn | 实时行情/历史K线 |
| 腾讯财经 | qt.gtimg.cn | 实时行情/板块数据 |
| 东方财富 | push2.eastmoney.com | 行情/资金流向/龙虎榜 |
| 通达信 | 预留接口 | Level2数据 |

### 3. AI智能体（Hermes Agent架构）

| 智能体 | 类型 | 数据源 |
|--------|------|--------|
| 智能问股助手 | smart_ask | Baostock/东财/新浪 |
| 智能诊股专家 | smart_diagnose | 多维度外部数据 |
| AI主力动向分析师 | main_flow | 妙想API |
| 量化炒股专家 | quant_expert | Baostock/东财 |

**量化专家整合7大工具：**
市场机会分析 · 风险预警 · 投资决策辅助 · 边界分析 · 股价异动分析 · 活跃资金跟踪 · 热点板块分析

### 4. 九大量化策略

| 策略 | 评分体系 | 核心阈值 |
|------|----------|----------|
| 🐉 龙头打板 | Dragon Score 11因子/130分 | ≥90强力推荐，封板强度S级 |
| 💪 强势回踩 | 11因子/180分 | 龙虎榜游资净买入>5000万加分 |
| 📈 趋势核心 | 趋势池+buypoint+板块核心 | MA20/MA60同步上行站稳3日 |
| ⚡ 事件爆发 | 七步闭环+4层产业链 | 政策公告→产业链分级→技术验证 |
| 💡 概念核心 | 生命周期5阶段 | 发酵期+板块趋势共振时买入 |
| ⏱️ 竞价选股 | 黄金公式 | 高开3-5% + 竞价占比8-12% + 委比>60% |
| 👥 反复抱团 | 5步漏斗+8因子 | 缩量至涨停日50%以下→反包确认 |
| ⭐ 盘前精选 | 9策略综合+命中率统计 | 综合评分>80进入精选池 |
| 🌙 微盘隔夜 | 两级过滤+情绪门控 | 情绪分>50开仓/<30清仓，WR 72% |

### 5. AI模型管理（页面化配置）

预配置12家模型厂商，全部在页面上填写API Key：

OpenAI · DeepSeek · 通义千问 · 智谱GLM · 月之暗面Kimi · 百川智能 · MiniMax海螺 · 豆包(火山引擎) · SiliconFlow · Anthropic Claude · Google Gemini · 妙想API

### 6. 审计日志

全链路审计：用户登录 · 智能体调用 · 数据访问 · 策略执行 · 管理操作

---

## 系统架构

```
                     用户浏览器 (Client)
                           │
                     Nginx (Port 80)
                    ┌──────┴──────┐
              静态文件(React)   /api/* → 后端
                           │
                  Go Backend (Gin :8080)
                  ┌────────┼────────┐
              JWT Auth   CORS    Audit Log
                  │
            ┌─────┼─────┬──────┬──────┐
          Auth  Agent  Market Strategy Users
            │     │      │      │      │
         ┌──┴──┐  │   ┌──┴──┐   │      │
       MySQL  RabbitMQ │ 新浪  │ Baostock │
       :3306   :5672   │ 腾讯  │  东财    │
                       │ 东财  │         │
                       └─────┘         │
                                   Hermes Agent
                                   (AI模型调用)
```

---

## 技术栈

### 后端
| 技术 | 版本 | 用途 |
|------|------|------|
| Go | 1.22 | 后端语言 |
| Gin | 1.10 | HTTP框架 |
| GORM | 1.25 | ORM |
| MySQL | 8.0 | 数据库 |
| RabbitMQ | 3.13 | 消息队列 |
| JWT | - | 认证 |
| bcrypt | - | 密码加密 |

### 前端
| 技术 | 版本 | 用途 |
|------|------|------|
| React | 18 | UI框架 |
| Vite | 5.4 | 构建工具 |
| Tailwind CSS | 3.x | 样式 |
| Zustand | 4.x | 状态管理 |
| Recharts | 2.x | 图表 |
| Lucide React | - | 图标 |

### 基础设施
| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Docker Compose | 编排 |
| Nginx | 反向代理 |

---

## 快速启动

### 方式一：Docker Compose（推荐）

```bash
git clone https://github.com/jibiao-ai/astock.git
cd astock
cp .env.example .env
# 编辑 .env 配置AI API Key
docker-compose up -d
# 访问 http://localhost
```

### 方式二：开发模式

```bash
# 后端（使用SQLite，无需MySQL）
cd backend
export DB_DRIVER=sqlite
go run ./cmd/server

# 前端
cd frontend
npm install
npm run dev
# 访问 http://localhost:3000
```

### 默认端口

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend | 80 | Web UI |
| Backend | 8080 | REST API |
| MySQL | 3306 | 数据库 |
| RabbitMQ | 5672 / 15672 | 消息队列 / 管理UI |

---

## 项目结构

```
astock/
├── backend/                      # Go后端
│   ├── cmd/server/main.go       # 入口+路由定义
│   ├── internal/
│   │   ├── config/              # 配置加载
│   │   ├── handler/             # API处理器
│   │   ├── middleware/          # JWT/RBAC/审计中间件
│   │   ├── model/               # 数据模型(17张表)
│   │   ├── mq/                  # RabbitMQ客户端
│   │   ├── repository/          # 数据库初始化+种子数据
│   │   └── service/             # 业务逻辑
│   ├── pkg/
│   │   ├── logger/              # 日志
│   │   └── response/            # 统一响应
│   ├── Dockerfile
│   └── go.mod
├── frontend/                     # React前端
│   ├── src/
│   │   ├── components/          # 布局组件
│   │   │   ├── MainLayout.jsx   # 主布局
│   │   │   └── Sidebar.jsx      # 侧边栏
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx    # 登录
│   │   │   ├── DashboardPage.jsx # 看板大屏
│   │   │   ├── RealtimePage.jsx # 实时行情
│   │   │   ├── ChatPage.jsx     # AI对话(4个智能体)
│   │   │   ├── StrategiesPage.jsx # 策略中心(9大策略)
│   │   │   ├── SignalsPage.jsx  # 策略信号
│   │   │   ├── AgentsPage.jsx   # 智能体管理
│   │   │   ├── AIModelsPage.jsx # AI模型管理(12家厂商)
│   │   │   ├── UsersPage.jsx    # 用户管理
│   │   │   └── AuditLogPage.jsx # 审计日志
│   │   ├── services/api.js      # API客户端
│   │   ├── store/useStore.js    # 状态管理
│   │   └── styles/index.css     # 全局样式
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml            # Docker编排
├── .env.example                  # 环境变量模板
└── README.md
```

---

## 功能详情

### Hermes Agent 协议

所有智能体采用Hermes Agent协议：
1. 自我改进能力 — 每次交互后总结经验
2. 持久记忆 — 跨会话上下文记忆
3. 工具调用 — `<tool_call>` 标签调用外部工具
4. 技能系统 — 16项技能可自由绑定到智能体

### 数据存储

所有获取的数据自动存储到MySQL（开发模式使用SQLite），供智能体做历史查询：
- `stock_quotes` — 实时行情快照
- `kline_data` — K线数据
- `sector_heats` — 板块热力数据
- `limit_up_boards` — 涨停板数据
- `dragon_tigers` — 龙虎榜数据
- `market_sentiments` — 市场情绪
- `strategy_signals` — 策略信号

### 参考项目

整合了GitHub A股量化star前十项目的核心技能：
- **Qlib** (Microsoft) — 量化研究框架
- **VeighNa** — 国内最流行开源量化平台
- **AKShare** — A股数据接口
- **Baostock** — 证券数据工具
- **stock_analysis** — 智能分析Agent

---

## API参考

### 公共接口
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/login` | 用户登录 |

### 认证接口
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/profile` | 当前用户信息 |
| GET | `/api/dashboard` | 看板统计 |
| GET | `/api/market/sentiment` | 市场情绪(支持days参数) |
| GET | `/api/market/sector-heat` | 板块热力 |
| GET | `/api/market/limit-up` | 涨停板(支持type筛选) |
| GET | `/api/market/dragon-tiger` | 龙虎榜 |
| GET | `/api/market/board-ladder` | 连板天梯 |
| GET | `/api/market/quote` | 实时行情(code+source) |
| GET | `/api/market/kline` | K线数据 |
| GET | `/api/agents` | 智能体列表 |
| POST | `/api/conversations` | 创建对话 |
| POST | `/api/conversations/:id/messages` | 发送消息 |
| GET | `/api/ai-providers` | AI模型列表 |
| PUT | `/api/ai-providers/:id` | 更新模型配置 |
| POST | `/api/ai-providers/:id/test` | 测试连接 |
| GET | `/api/strategies` | 策略列表 |
| GET | `/api/strategy-signals` | 策略信号 |
| GET | `/api/audit-logs` | 审计日志(分页+筛选) |

---

## 配置说明

| 环境变量 | 默认值 | 说明 |
|----------|--------|------|
| `SERVER_PORT` | 8080 | 后端端口 |
| `DB_DRIVER` | mysql | 数据库(mysql/sqlite) |
| `DB_HOST` | mysql | MySQL主机 |
| `DB_PORT` | 3306 | MySQL端口 |
| `DB_USER` | quantmind | 数据库用户 |
| `DB_PASSWORD` | quantmind123 | 数据库密码 |
| `RABBITMQ_HOST` | rabbitmq | MQ主机 |
| `JWT_SECRET` | quantmind-secret-key-2026 | JWT密钥 |
| `ADMIN_USER` | admin | 管理员用户名 |
| `ADMIN_PASSWORD` | Admin@2026! | 管理员密码 |

---

## License

[MIT License](LICENSE)

---

**龙策 QuantMind** — 智能量化 · 数据驱动 · AI赋能投资决策
