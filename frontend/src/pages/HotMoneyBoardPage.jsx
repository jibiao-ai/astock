import { useState, useEffect, useRef, useCallback } from 'react'
import { 
  getTsDragonTiger, getTrendChart, getKLineRealtime, getChipDistribution,
  getStockFundFlow, getGubaDiscussion
} from '../services/api'
import { getHotMoneyBoard, getHotMoneyDetail, getHotMoneyDates } from '../services/api'
import {
  Zap, TrendingUp, TrendingDown, RefreshCw, Search, X, Loader2,
  BarChart3, Activity, DollarSign, MessageSquare, ChevronDown, ChevronUp,
  Calendar, ArrowUpRight, ArrowDownRight, Crown
} from 'lucide-react'

// ==================== Scrolling Broadcast ====================
function HotMoneyTicker({ items }) {
  const containerRef = useRef(null)
  const [animDuration, setAnimDuration] = useState(80)
  
  useEffect(() => {
    if (items?.length > 0) {
      setAnimDuration(Math.max(items.length * 4, 40))
    }
  }, [items])

  if (!items || items.length === 0) return null

  return (
    <div ref={containerRef} className="overflow-hidden whitespace-nowrap relative bg-gradient-to-r from-amber-50 via-orange-50 to-red-50 rounded-xl border border-orange-200 py-3 px-4">
      <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-amber-50 to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-red-50 to-transparent z-10" />
      <div
        className="inline-block"
        style={{ animation: `hotmoney-scroll ${animDuration}s linear infinite` }}
      >
        {[...items, ...items].map((item, idx) => (
          <span key={idx} className="inline-flex items-center mx-4 text-sm">
            <span className={`font-bold ${item.is_known ? 'text-orange-600' : 'text-gray-600'}`}>
              {item.is_known && <Crown size={12} className="inline mr-0.5 text-orange-500" />}
              {item.trader}
            </span>
            <span className="mx-1.5 text-gray-400">
              {item.action === '买入' ? <ArrowUpRight size={14} className="inline text-red-500" /> : <ArrowDownRight size={14} className="inline text-green-500" />}
            </span>
            <span className={`font-medium ${item.action === '买入' ? 'text-red-600' : 'text-green-600'}`}>
              {item.action}
            </span>
            <span className="mx-1 font-semibold text-gray-800">{item.stock}</span>
            <span className="text-xs text-gray-500">({item.code})</span>
            <span className="ml-1.5 text-xs font-mono font-bold text-orange-700">
              {formatAmt(item.amount)}
            </span>
          </span>
        ))}
      </div>
      <style>{`
        @keyframes hotmoney-scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

// ==================== Trader List Panel ====================
function TraderListPanel({ traders, onSelectStock, selectedCode, sortBy, onSortChange }) {
  const [expandedTrader, setExpandedTrader] = useState(null)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      {/* Sort Buttons */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
          <Zap size={14} className="text-orange-500" /> 游资排行
        </h3>
        <div className="flex gap-1">
          {[{key:'net',label:'净额'},{key:'buy',label:'买入'},{key:'sell',label:'卖出'}].map(s => (
            <button key={s.key} onClick={() => onSortChange(s.key)}
              className={`px-2.5 py-1 text-xs rounded-md transition ${
                sortBy === s.key ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-500 hover:bg-gray-100'}`}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Trader List */}
      <div className="max-h-[calc(100vh-380px)] overflow-y-auto">
        {traders?.map((trader, idx) => (
          <div key={idx} className="border-b border-gray-50 last:border-0">
            <div
              className="flex items-center justify-between px-4 py-2.5 hover:bg-orange-50/50 cursor-pointer transition"
              onClick={() => setExpandedTrader(expandedTrader === idx ? null : idx)}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 w-5">{idx + 1}</span>
                <span className={`text-sm font-semibold ${trader.is_known ? 'text-orange-700' : 'text-gray-700'}`}>
                  {trader.is_known && <Crown size={11} className="inline mr-0.5 text-orange-400" />}
                  {trader.trader_name}
                </span>
                <span className="text-xs text-gray-400">{trader.trade_count}笔</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono">
                  <span className="text-red-500">{formatAmt(trader.total_buy)}</span>
                  <span className="text-gray-300 mx-1">/</span>
                  <span className="text-green-500">{formatAmt(trader.total_sell)}</span>
                </span>
                <span className={`text-xs font-bold font-mono ${trader.total_net >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                  净{formatAmt(trader.total_net)}
                </span>
                {expandedTrader === idx ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
              </div>
            </div>

            {/* Expanded trades */}
            {expandedTrader === idx && (
              <div className="px-4 pb-3 bg-orange-50/30">
                <div className="space-y-1">
                  {trader.stocks?.map((stock, sIdx) => (
                    <div key={sIdx}
                      onClick={() => onSelectStock(stock)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition text-xs
                        ${selectedCode === stock.code ? 'bg-orange-100 border border-orange-300' : 'bg-white hover:bg-orange-50 border border-transparent'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${stock.pct_chg >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {stock.name}
                        </span>
                        <span className="text-gray-400">{stock.code}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                          stock.side === '0' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                          {stock.side === '0' ? '买' : '卖'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-500">{formatAmt(stock.buy_amt)}</span>
                        <span className="text-green-500">{formatAmt(stock.sell_amt)}</span>
                        <span className={`font-bold ${stock.net_amt >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          净{formatAmt(stock.net_amt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ==================== Stock Detail Panel ====================
function StockDetailPanel({ code, stockInfo }) {
  const [activeTab, setActiveTab] = useState('trend')
  const [trendData, setTrendData] = useState(null)
  const [dailyKline, setDailyKline] = useState(null)
  const [weeklyKline, setWeeklyKline] = useState(null)
  const [fundFlow, setFundFlow] = useState(null)
  const [gubaData, setGubaData] = useState(null)
  const [loading, setLoading] = useState(false)

  const tabs = [
    { key: 'trend', label: '分时走势', icon: <Activity size={13} /> },
    { key: 'daily', label: '日K筹码峰', icon: <BarChart3 size={13} /> },
    { key: 'weekly', label: '周K筹码峰', icon: <TrendingUp size={13} /> },
    { key: 'fund', label: '主力资金', icon: <DollarSign size={13} /> },
    { key: 'guba', label: '股吧讨论', icon: <MessageSquare size={13} /> },
  ]

  useEffect(() => {
    if (!code) return
    setActiveTab('trend')
    setTrendData(null)
    setDailyKline(null)
    setWeeklyKline(null)
    setFundFlow(null)
    setGubaData(null)
  }, [code])

  useEffect(() => {
    if (!code) return
    fetchTabData(activeTab)
  }, [code, activeTab])

  const fetchTabData = async (tab) => {
    setLoading(true)
    try {
      switch (tab) {
        case 'trend': {
          const res = await getTrendChart({ code })
          if (res?.code === 0) setTrendData(res.data)
          break
        }
        case 'daily': {
          const res = await getChipDistribution({ code })
          if (res?.code === 0) setDailyKline(res.data)
          break
        }
        case 'weekly': {
          const res = await getKLineRealtime({ code, period: 'weekly' })
          if (res?.code === 0) setWeeklyKline(res.data)
          break
        }
        case 'fund': {
          const res = await getStockFundFlow({ code })
          if (res?.code === 0) setFundFlow(res.data)
          break
        }
        case 'guba': {
          const res = await getGubaDiscussion({ code })
          if (res?.code === 0) setGubaData(res.data)
          break
        }
      }
    } catch (e) {
      console.error('Stock detail fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  if (!code) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <BarChart3 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">选择左侧游资买入的个股</p>
          <p className="text-xs mt-1">查看分时走势、K线筹码峰、主力资金和股吧讨论</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden h-full flex flex-col">
      {/* Stock Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-800">{stockInfo?.name || code}</span>
            <span className="text-sm text-gray-500">{code}</span>
            {stockInfo?.pct_change != null && (
              <span className={`text-sm font-bold ${stockInfo.pct_change >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                {stockInfo.pct_change >= 0 ? '+' : ''}{stockInfo.pct_change?.toFixed(2)}%
              </span>
            )}
          </div>
          {stockInfo?.reason && (
            <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded">{stockInfo.reason}</span>
          )}
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-100 px-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1 px-3 py-2.5 text-xs font-medium border-b-2 transition
              ${activeTab === tab.key 
                ? 'border-indigo-500 text-indigo-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
            <span className="ml-2 text-sm text-gray-500">加载中...</span>
          </div>
        ) : (
          <>
            {activeTab === 'trend' && <TrendView data={trendData} />}
            {activeTab === 'daily' && <ChipKlineView data={dailyKline} period="日K" />}
            {activeTab === 'weekly' && <WeeklyKlineView data={weeklyKline} />}
            {activeTab === 'fund' && <FundFlowView data={fundFlow} />}
            {activeTab === 'guba' && <GubaView data={gubaData} />}
          </>
        )}
      </div>
    </div>
  )
}

// ==================== Detail Sub-Views ====================
function TrendView({ data }) {
  if (!data?.trends || data.trends.length === 0) {
    return <EmptyState text="暂无分时数据" />
  }

  const trends = data.trends
  const preClose = data.pre_close || trends[0]?.price
  const maxPrice = Math.max(...trends.map(t => t.price))
  const minPrice = Math.min(...trends.map(t => t.price))
  const range = maxPrice - minPrice || 1

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span>昨收: <span className="font-mono font-bold text-gray-700">{preClose?.toFixed(2)}</span></span>
        <span>最高: <span className="font-mono text-red-500">{maxPrice.toFixed(2)}</span></span>
        <span>最低: <span className="font-mono text-green-600">{minPrice.toFixed(2)}</span></span>
      </div>
      {/* Simple SVG chart */}
      <div className="relative h-48 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden">
        <svg viewBox={`0 0 ${trends.length} 100`} className="w-full h-full" preserveAspectRatio="none">
          {/* Pre-close line */}
          {preClose && (
            <line x1="0" y1={((maxPrice - preClose) / range) * 100} 
              x2={trends.length} y2={((maxPrice - preClose) / range) * 100}
              stroke="#9ca3af" strokeWidth="0.5" strokeDasharray="3,3" />
          )}
          {/* Price line */}
          <polyline
            points={trends.map((t, i) => `${i},${((maxPrice - t.price) / range) * 100}`).join(' ')}
            fill="none" stroke="#4f46e5" strokeWidth="1.5" />
          {/* Fill */}
          <polygon
            points={`0,100 ${trends.map((t, i) => `${i},${((maxPrice - t.price) / range) * 100}`).join(' ')} ${trends.length - 1},100`}
            fill="url(#trendGrad)" opacity="0.3" />
          <defs>
            <linearGradient id="trendGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Volume bars (simplified) */}
      <div className="h-12 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-end px-0.5">
        {trends.filter((_, i) => i % Math.max(1, Math.floor(trends.length / 100)) === 0).map((t, i) => {
          const maxVol = Math.max(...trends.map(x => x.vol || 0)) || 1
          const h = ((t.vol || 0) / maxVol) * 100
          return (
            <div key={i} className="flex-1 mx-px"
              style={{ height: `${h}%`, background: t.price >= (preClose || 0) ? '#ef4444' : '#22c55e' }} />
          )
        })}
      </div>
    </div>
  )
}

function ChipKlineView({ data, period }) {
  if (!data?.klines || data.klines.length === 0) {
    return <EmptyState text={`暂无${period}线数据`} />
  }

  const klines = data.klines.slice(-60)
  
  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500 flex items-center gap-3">
        <span>{period}线 (近{klines.length}根)</span>
        {data.chip_data && <span className="text-indigo-500">含筹码分布</span>}
      </div>
      {/* Candlestick simplified */}
      <div className="h-52 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-end px-1">
        {klines.map((k, i) => {
          const maxHigh = Math.max(...klines.map(x => x.high))
          const minLow = Math.min(...klines.map(x => x.low))
          const range = maxHigh - minLow || 1
          const top = ((maxHigh - Math.max(k.open, k.close)) / range) * 100
          const bodyH = Math.max(1, (Math.abs(k.close - k.open) / range) * 100)
          const isUp = k.close >= k.open
          return (
            <div key={i} className="flex-1 relative mx-px" style={{ height: '100%' }}>
              {/* Shadow */}
              <div className="absolute left-1/2 -translate-x-1/2 w-px"
                style={{
                  top: `${((maxHigh - k.high) / range) * 100}%`,
                  height: `${((k.high - k.low) / range) * 100}%`,
                  background: isUp ? '#ef4444' : '#22c55e'
                }} />
              {/* Body */}
              <div className="absolute left-0 right-0 rounded-sm"
                style={{
                  top: `${top}%`,
                  height: `${bodyH}%`,
                  background: isUp ? '#ef4444' : '#22c55e',
                  minHeight: '1px'
                }} />
            </div>
          )
        })}
      </div>
      {/* Chip distribution (if available) */}
      {data.chip_data?.length > 0 && (
        <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
          <p className="text-xs font-medium text-indigo-700 mb-2">筹码分布概要</p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <span className="text-gray-500">获利比例</span>
              <span className="ml-1 font-bold text-red-500">{data.chip_data[0]?.profit_ratio?.toFixed(1)}%</span>
            </div>
            <div>
              <span className="text-gray-500">平均成本</span>
              <span className="ml-1 font-bold text-gray-800">{data.chip_data[0]?.avg_cost?.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-gray-500">集中度</span>
              <span className="ml-1 font-bold text-indigo-600">{data.chip_data[0]?.concentration?.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function WeeklyKlineView({ data }) {
  if (!data?.klines || data.klines.length === 0) {
    return <EmptyState text="暂无周K线数据" />
  }

  const klines = data.klines.slice(-40)

  return (
    <div className="space-y-3">
      <div className="text-xs text-gray-500">周K线 (近{klines.length}周)</div>
      <div className="h-52 bg-gray-50 rounded-lg border border-gray-100 overflow-hidden flex items-end px-1">
        {klines.map((k, i) => {
          const maxHigh = Math.max(...klines.map(x => x.high))
          const minLow = Math.min(...klines.map(x => x.low))
          const range = maxHigh - minLow || 1
          const top = ((maxHigh - Math.max(k.open, k.close)) / range) * 100
          const bodyH = Math.max(1, (Math.abs(k.close - k.open) / range) * 100)
          const isUp = k.close >= k.open
          return (
            <div key={i} className="flex-1 relative mx-px" style={{ height: '100%' }}>
              <div className="absolute left-1/2 -translate-x-1/2 w-px"
                style={{
                  top: `${((maxHigh - k.high) / range) * 100}%`,
                  height: `${((k.high - k.low) / range) * 100}%`,
                  background: isUp ? '#ef4444' : '#22c55e'
                }} />
              <div className="absolute left-0 right-0 rounded-sm"
                style={{
                  top: `${top}%`,
                  height: `${bodyH}%`,
                  background: isUp ? '#ef4444' : '#22c55e',
                  minHeight: '1px'
                }} />
            </div>
          )
        })}
      </div>
      {/* Summary */}
      {klines.length > 0 && (
        <div className="grid grid-cols-4 gap-2 text-xs">
          <div className="bg-gray-50 rounded p-2 text-center">
            <span className="text-gray-500">最新收盘</span>
            <div className="font-bold text-gray-800">{klines[klines.length-1]?.close?.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <span className="text-gray-500">周最高</span>
            <div className="font-bold text-red-500">{klines[klines.length-1]?.high?.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <span className="text-gray-500">周最低</span>
            <div className="font-bold text-green-600">{klines[klines.length-1]?.low?.toFixed(2)}</div>
          </div>
          <div className="bg-gray-50 rounded p-2 text-center">
            <span className="text-gray-500">成交量</span>
            <div className="font-bold text-gray-700">{formatAmt(klines[klines.length-1]?.vol)}</div>
          </div>
        </div>
      )}
    </div>
  )
}

function FundFlowView({ data }) {
  if (!data?.items || data.items.length === 0) {
    return <EmptyState text="暂无主力资金数据" />
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      {data.summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <MiniStat label="主力净流入" value={formatAmt(data.summary.main_net)} 
            color={data.summary.main_net >= 0 ? 'text-red-500' : 'text-green-600'} />
          <MiniStat label="超大单净流入" value={formatAmt(data.summary.super_net)} 
            color={data.summary.super_net >= 0 ? 'text-red-500' : 'text-green-600'} />
          <MiniStat label="大单净流入" value={formatAmt(data.summary.big_net)} 
            color={data.summary.big_net >= 0 ? 'text-red-500' : 'text-green-600'} />
          <MiniStat label="中小单净流入" value={formatAmt(data.summary.small_net)} 
            color={data.summary.small_net >= 0 ? 'text-red-500' : 'text-green-600'} />
        </div>
      )}
      {/* Recent days */}
      <div className="max-h-60 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left text-gray-500">日期</th>
              <th className="px-2 py-1.5 text-right text-gray-500">主力净流入</th>
              <th className="px-2 py-1.5 text-right text-gray-500">超大单</th>
              <th className="px-2 py-1.5 text-right text-gray-500">大单</th>
              <th className="px-2 py-1.5 text-right text-gray-500">中小单</th>
            </tr>
          </thead>
          <tbody>
            {data.items.slice(0, 20).map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-2 py-1.5 text-gray-700">{item.date}</td>
                <td className={`px-2 py-1.5 text-right font-mono ${item.main_net >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatAmt(item.main_net)}
                </td>
                <td className={`px-2 py-1.5 text-right font-mono ${item.super_net >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatAmt(item.super_net)}
                </td>
                <td className={`px-2 py-1.5 text-right font-mono ${item.big_net >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatAmt(item.big_net)}
                </td>
                <td className={`px-2 py-1.5 text-right font-mono ${item.small_net >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                  {formatAmt(item.small_net)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GubaView({ data }) {
  if (!data?.posts || data.posts.length === 0) {
    return <EmptyState text="暂无股吧讨论数据" />
  }

  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto">
      {data.posts.map((post, idx) => (
        <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 transition border border-gray-100">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-800 font-medium line-clamp-2">{post.title}</p>
              <div className="mt-1 flex items-center gap-3 text-xs text-gray-400">
                <span>{post.author}</span>
                <span>{post.time}</span>
                <span>阅读 {post.read_count}</span>
                <span>评论 {post.comment_count}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ==================== Utilities ====================
function EmptyState({ text }) {
  return (
    <div className="flex items-center justify-center h-32 text-sm text-gray-400">
      {text}
    </div>
  )
}

function MiniStat({ label, value, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-2 text-center">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-sm font-bold font-mono ${color}`}>{value}</div>
    </div>
  )
}

function formatAmt(val) {
  if (val === null || val === undefined || isNaN(val)) return '-'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 100000000) return sign + (abs / 100000000).toFixed(2) + '亿'
  if (abs >= 10000) return sign + (abs / 10000).toFixed(0) + '万'
  if (abs >= 1000) return sign + (abs / 1000).toFixed(1) + '千'
  return val.toFixed(0)
}

// ==================== Main Page ====================
export default function HotMoneyBoardPage() {
  const [boardData, setBoardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedStock, setSelectedStock] = useState(null)
  const [selectedCode, setSelectedCode] = useState('')
  const [sortBy, setSortBy] = useState('net')
  const [dates, setDates] = useState([])
  const [tradeDate, setTradeDate] = useState('')

  // Fetch available dates on mount
  useEffect(() => {
    fetchDates()
  }, [])

  // Fetch board data when date or sort changes
  useEffect(() => {
    fetchBoard()
  }, [tradeDate, sortBy])

  const fetchDates = async () => {
    try {
      const res = await getHotMoneyDates({ limit: 10 })
      if (res?.code === 0 && res.data?.dates) {
        setDates(res.data.dates)
        if (res.data.dates.length > 0 && !tradeDate) {
          setTradeDate(res.data.dates[0].raw_date)
        }
      }
    } catch (e) { console.error(e) }
  }

  const fetchBoard = async () => {
    setLoading(true)
    try {
      const params = { sort: sortBy }
      if (tradeDate) params.trade_date = tradeDate
      const res = await getHotMoneyBoard(params)
      if (res?.code === 0) {
        setBoardData(res.data)
      }
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const handleSelectStock = (stock) => {
    setSelectedCode(stock.code)
    setSelectedStock({
      code: stock.code,
      name: stock.name,
      pct_change: stock.pct_chg,
      reason: stock.reason,
      close: stock.close,
    })
  }

  const handleRefresh = () => {
    fetchBoard()
  }

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-500">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">游资打板</h1>
            <p className="text-xs text-gray-400">龙虎榜游资交易实时追踪</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Date selector */}
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-gray-400" />
            <select value={tradeDate} onChange={e => setTradeDate(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-orange-400">
              {dates.map(d => (
                <option key={d.raw_date} value={d.raw_date}>{d.trade_date} ({d.count}只)</option>
              ))}
            </select>
          </div>
          <button onClick={handleRefresh}
            className="p-2 text-gray-400 hover:text-orange-500 transition rounded-lg hover:bg-orange-50">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Scrolling Ticker */}
      {boardData?.scroll_items && <HotMoneyTicker items={boardData.scroll_items} />}

      {/* Main Content: Left=Traders, Right=Stock Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: 'calc(100vh - 250px)' }}>
        {/* Left Panel: Trader List */}
        <div className="lg:col-span-2">
          {loading && !boardData ? (
            <div className="flex items-center justify-center h-40 bg-white rounded-xl border border-gray-100">
              <Loader2 size={24} className="animate-spin text-orange-400" />
              <span className="ml-2 text-sm text-gray-500">加载游资数据...</span>
            </div>
          ) : (
            <TraderListPanel
              traders={boardData?.traders}
              onSelectStock={handleSelectStock}
              selectedCode={selectedCode}
              sortBy={sortBy}
              onSortChange={setSortBy}
            />
          )}
        </div>

        {/* Right Panel: Stock Detail */}
        <div className="lg:col-span-3">
          <StockDetailPanel code={selectedCode} stockInfo={selectedStock} />
        </div>
      </div>

      {/* Stats footer */}
      {boardData && (
        <div className="flex items-center justify-center gap-6 text-xs text-gray-400">
          <span>日期: {boardData.trade_date}</span>
          <span>游资: {boardData.total_traders}位</span>
          <span>个股: {boardData.total_stocks}只</span>
        </div>
      )}
    </div>
  )
}
