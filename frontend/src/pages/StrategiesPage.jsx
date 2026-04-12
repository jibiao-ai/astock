import { useState, useEffect } from 'react'
import { getStrategyList } from '../services/api'
import useStore from '../store/useStore'
import { Crown, ArrowDownUp, TrendingUp, Zap, Lightbulb, Timer, Users, Star, Moon } from 'lucide-react'

const ICONS = { Crown, ArrowDownUp, TrendingUp, Zap, Lightbulb, Timer, Users, Star, Moon }
const COLORS = ['#ef4444','#f59e0b','#3b82f6','#8b5cf6','#22c55e','#ec4899','#06b6d4','#f97316','#6366f1']

const STRATEGY_DETAILS = {
  dragon_board: {
    factors: ['封板强度(15分)', '量比(15分)', '换手率(10分)', '板块地位(15分)', '连板数(15分)', '资金净流入(10分)', '市场情绪(10分)', '封板时间(10分)', '竞价强度(10分)', '概念热度(10分)', '技术形态(10分)'],
    threshold: '总分130分，≥90分为强力推荐，70-90分为关注，<70分为观望',
    description: '基于涨停板11维度因子的量化评分系统。数据来源：东方财富涨停板数据、Level2逐笔成交、龙虎榜数据。',
  },
  strong_pullback: {
    factors: ['回踩幅度(20分)', '支撑位有效性(20分)', '缩量程度(15分)', '均线系统(15分)', '游资确认(15分)', '板块强度(15分)', '情绪位置(15分)', '资金回流(15分)', '形态完整(15分)', '连板历史(15分)', '龙虎榜(20分)'],
    threshold: '总分180分，≥120分为强势回踩买入信号，龙虎榜游资净买入>5000万加分',
    description: '强势股回踩买入策略。阈值基于历史统计：强势股首次回踩5日线，量缩至峰值50%以下，且有游资席位确认。',
  },
  trend_core: {
    factors: ['MA20趋势', 'Buypoint信号', '板块核心度', 'MACD金叉', '量价配合'],
    threshold: '趋势池纳入条件：MA20/MA60同步上行，收盘价>MA20且站稳3日以上',
    description: '融合趋势跟踪与板块核心选股。数据来源：Baostock日K数据+东财板块数据。',
  },
  event_burst: {
    factors: ['事件识别', '产业链一级(直接受益)', '产业链二级(间接受益)', '产业链三级(边际改善)', '产业链四级(概念关联)', '技术验证', '资金确认'],
    threshold: '七步闭环：事件确认→产业链4层分级→受益度评分→技术面验证→资金面确认→建仓计划→止盈止损',
    description: '事件驱动型选股闭环系统。事件来源：财政部/工信部/证监会等政策公告。',
  },
  concept_core: {
    factors: ['概念萌芽期', '概念发酵期', '概念高潮期', '概念分歧期', '概念退潮期'],
    threshold: '发酵期+板块趋势共振时买入，高潮期分歧时减仓。生命周期通过板块涨停比例和换手率判断。',
    description: '概念生命周期跟踪系统。跟踪板块内涨停数/开板数/跌停数的比值变化判断周期阶段。',
  },
  auction_pick: {
    factors: ['高开幅度3-5%', '竞价量占比8-12%', '委比>60%', '板块强度', '均线支撑'],
    threshold: '黄金公式：高开幅度在3-5%区间 + 竞价成交量占流通盘8-12% + 委买比>60%',
    description: '集合竞价选股系统。数据来源：Level2集合竞价数据，每日9:15-9:25实时计算。',
  },
  group_hug: {
    factors: ['第一步:涨停筛选', '第二步:次日低开', '第三步:缩量企稳', '第四步:反包确认', '第五步:成交验证', '8因子画像评分', '反包量比', '反包幅度'],
    threshold: '5步漏斗：涨停→次日低开>-3%→缩量至涨停日50%以下→反包收阳→量能放大1.5倍以上',
    description: '反复抱团股的漏斗筛选系统+8因子画像评分。基于历史涨停次日低开反包统计概率。',
  },
  pre_market: {
    factors: ['9大策略综合信号', '评分加权排序', '盘前精选Top10', '收盘自动结算', '命中率统计'],
    threshold: '综合评分>80的个股进入盘前精选池，收盘自动计算涨跌幅，统计T+1/T+3/T+5命中率',
    description: 'AI策略精选系统。每日盘前综合9大策略的信号输出，自动精选Top10并跟踪命中率。',
  },
  micro_overnight: {
    factors: ['一级流动性过滤(市值<50亿)', '二级技术过滤(趋势+量价)', '情绪门控(情绪分>50)', '弹性仓位WR=72%'],
    threshold: '一级：市值20-50亿+日均换手>3%；二级：MA5>MA10>MA20+量价齐升；情绪门控：情绪分>50开仓,<30清仓',
    description: '微盘股隔夜策略。两级过滤+情绪门控管理仓位，弹性立场目标WR 72%。数据来源：Baostock+东财情绪指数。',
  },
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([])
  const [selected, setSelected] = useState(null)
  const { setCurrentPage } = useStore()

  useEffect(() => {
    loadStrategies()
  }, [])

  const loadStrategies = async () => {
    try {
      const res = await getStrategyList()
      if (res.code === 0) setStrategies(res.data || defaultStrategies)
      else setStrategies(defaultStrategies)
    } catch (e) { setStrategies(defaultStrategies) }
  }

  const defaultStrategies = [
    { name: 'dragon_board', label: '龙头打板', description: 'Dragon Score 11因子/130分涨停板量化评分', icon: 'Crown' },
    { name: 'strong_pullback', label: '强势回踩', description: '11因子/180分+龙虎榜游资确认', icon: 'ArrowDownUp' },
    { name: 'trend_core', label: '趋势核心', description: '趋势池融合buypoint信号+板块核心股票', icon: 'TrendingUp' },
    { name: 'event_burst', label: '事件爆发', description: '七步闭环+产业链4层分级选股', icon: 'Zap' },
    { name: 'concept_core', label: '概念核心', description: '概念生命周期跟踪+板块趋势共振', icon: 'Lightbulb' },
    { name: 'auction_pick', label: '竞价选股', description: '黄金公式高开3-5%+竞价占比8-12%', icon: 'Timer' },
    { name: 'group_hug', label: '反复抱团', description: '全市场5步漏斗+8因子画像+反包监控', icon: 'Users' },
    { name: 'pre_market', label: '盘前精选', description: 'AI策略精选+收盘自动结算+命中率统计', icon: 'Star' },
    { name: 'micro_overnight', label: '微盘隔夜', description: '两级过滤+情绪门控+弹性立场WR 72%', icon: 'Moon' },
  ]

  const displayStrategies = strategies.length > 0 ? strategies : defaultStrategies

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      <div>
        <h1 className="text-2xl font-bold gradient-text">量化策略中心</h1>
        <p className="text-xs text-gray-500 mt-1">9大量化策略 · 基于外部数据分析 · 禁止编造数据</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {displayStrategies.map((s, i) => {
          const IconComp = ICONS[s.icon] || Crown
          const detail = STRATEGY_DETAILS[s.name]
          const isSelected = selected === s.name
          return (
            <div key={s.name} onClick={() => setSelected(isSelected ? null : s.name)}
              className={`glass-card p-4 cursor-pointer transition-all hover:scale-[1.02] ${isSelected ? 'ring-1' : ''}`}
              style={isSelected ? { borderColor: COLORS[i], boxShadow: `0 0 20px ${COLORS[i]}20` } : {}}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${COLORS[i]}20` }}>
                  <IconComp size={20} style={{ color: COLORS[i] }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{s.label}</h3>
                  <p className="text-xs text-gray-500">{s.description}</p>
                </div>
              </div>
              
              {isSelected && detail && (
                <div className="mt-3 pt-3 border-t border-[#2d3548] space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 mb-2">📊 评分因子:</p>
                    <div className="flex flex-wrap gap-1">
                      {detail.factors.map((f, j) => (
                        <span key={j} className="px-2 py-0.5 rounded text-[10px] bg-[#0f1419] text-gray-300 border border-[#2d3548]">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">🎯 阈值标准:</p>
                    <p className="text-xs text-gray-300">{detail.threshold}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">📌 说明:</p>
                    <p className="text-xs text-gray-300">{detail.description}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); setCurrentPage('signals') }}
                    className="w-full py-2 rounded-lg text-xs font-medium text-white mt-2"
                    style={{ background: `${COLORS[i]}30`, color: COLORS[i] }}>
                    查看策略信号 →
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
