import { useState, useEffect } from 'react'
import { getDashboard, getConceptHeat, getLimitUpDownDetails, getSectorFundFlow, getRealTimeStats, getDragonTigerHotMoney } from '../services/api'
import { BarChart3, TrendingUp, TrendingDown, Activity, Flame, Crown, AlertTriangle, DollarSign, Users, Zap, ArrowUp, ArrowDown, RefreshCw, Lightbulb, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conceptData, setConceptData] = useState([])
  const [limitUpStocks, setLimitUpStocks] = useState([])
  const [limitDownStocks, setLimitDownStocks] = useState([])
  const [sectorFlows, setSectorFlows] = useState([])
  const [conceptFlows, setConceptFlows] = useState([])
  const [flowTab, setFlowTab] = useState('sector')
  const [limitTab, setLimitTab] = useState('up')
  const [limitPage, setLimitPage] = useState(1)
  const [flowPage, setFlowPage] = useState(1)
  // Real-time stats
  const [realTimeStats, setRealTimeStats] = useState(null)
  // Dragon tiger hot money - paginated
  const [hotMoneyData, setHotMoneyData] = useState([])
  const [hotMoneyDate, setHotMoneyDate] = useState('')
  const [hotMoneyPage, setHotMoneyPage] = useState(1)
  const [hotMoneyTotal, setHotMoneyTotal] = useState(0)
  const [hotMoneyTotalPages, setHotMoneyTotalPages] = useState(1)
  const [expandedTrader, setExpandedTrader] = useState(null)
  // Board seal + broken pagination (5 per page)
  const [sealPage, setSealPage] = useState(1)
  const [brokenPage, setBrokenPage] = useState(1)

  const SEAL_PAGE_SIZE = 5
  const BROKEN_PAGE_SIZE = 5
  const HOT_MONEY_PAGE_SIZE = 5

  const last7Days = (() => {
    const dates = []
    let d = new Date()
    while (dates.length < 7) {
      const day = d.getDay()
      if (day !== 0 && day !== 6) {
        dates.unshift(d.toISOString().slice(0, 10))
      }
      d = new Date(d.getTime() - 86400000)
    }
    return dates
  })()

  useEffect(() => { loadData() }, [date])

  // Load hot money with page change
  useEffect(() => {
    if (!loading) loadHotMoney(hotMoneyPage)
  }, [hotMoneyPage])

  const loadHotMoney = async (page) => {
    const retryFetch = async (fn, retries = 3, delay = 1000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await fn()
          if (res?.code === 0 && res.data) return res
        } catch (e) { /* retry */ }
        if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)))
      }
      return null
    }
    const hotMoneyRes = await retryFetch(() => getDragonTigerHotMoney({ page, page_size: HOT_MONEY_PAGE_SIZE }), 3, 2000)
    if (hotMoneyRes?.code === 0) {
      setHotMoneyData(hotMoneyRes.data?.traders || [])
      setHotMoneyDate(hotMoneyRes.data?.trade_date || '')
      setHotMoneyTotal(hotMoneyRes.data?.total || 0)
      setHotMoneyTotalPages(hotMoneyRes.data?.total_pages || 1)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setSealPage(1)
    setBrokenPage(1)
    setHotMoneyPage(1)
    try {
      // Retry wrapper for individual API calls
      const retryFetch = async (fn, retries = 3, delay = 1000) => {
        for (let i = 0; i < retries; i++) {
          try {
            const res = await fn()
            if (res?.code === 0 && res.data) return res
          } catch (e) { /* retry */ }
          if (i < retries - 1) await new Promise(r => setTimeout(r, delay * (i + 1)))
        }
        return null
      }

      const [dashRes, conceptRes, limitUpRes, limitDownRes, sectorFlowRes, conceptFlowRes, rtStatsRes, hotMoneyRes] = await Promise.all([
        retryFetch(() => getDashboard({ date })),
        retryFetch(() => getConceptHeat()),
        retryFetch(() => getLimitUpDownDetails({ type: 'up' })),
        retryFetch(() => getLimitUpDownDetails({ type: 'down' })),
        retryFetch(() => getSectorFundFlow({ category: 'sector' })),
        retryFetch(() => getSectorFundFlow({ category: 'concept' })),
        retryFetch(() => getRealTimeStats()),
        retryFetch(() => getDragonTigerHotMoney({ page: 1, page_size: HOT_MONEY_PAGE_SIZE }), 3, 2000),
      ])
      if (dashRes?.code === 0) setData(dashRes.data)
      if (conceptRes?.code === 0) setConceptData(conceptRes.data || [])
      if (limitUpRes?.code === 0) setLimitUpStocks(limitUpRes.data?.stocks || [])
      if (limitDownRes?.code === 0) setLimitDownStocks(limitDownRes.data?.stocks || [])
      if (sectorFlowRes?.code === 0) setSectorFlows(sectorFlowRes.data?.flows || [])
      if (conceptFlowRes?.code === 0) setConceptFlows(conceptFlowRes.data?.flows || [])
      if (rtStatsRes?.code === 0) setRealTimeStats(rtStatsRes.data)
      if (hotMoneyRes?.code === 0) {
        setHotMoneyData(hotMoneyRes.data?.traders || [])
        setHotMoneyDate(hotMoneyRes.data?.trade_date || '')
        setHotMoneyTotal(hotMoneyRes.data?.total || 0)
        setHotMoneyTotalPages(hotMoneyRes.data?.total_pages || 1)
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Prefer real-time stats over DB stats
  const rtSentiment = realTimeStats?.market_sentiment || {}
  const dbSentiment = data?.market_sentiment || {}
  // Merge: use real-time if available, fallback to DB
  const sentiment = {
    limit_up_count: rtSentiment.limit_up_count || dbSentiment.limit_up_count || limitUpStocks.length || 0,
    limit_down_count: rtSentiment.limit_down_count || dbSentiment.limit_down_count || limitDownStocks.length || 0,
    broken_count: rtSentiment.broken_count || dbSentiment.broken_count || 0,
    highest_board: rtSentiment.highest_board || dbSentiment.highest_board || 0,
    total_amount: rtSentiment.total_amount || dbSentiment.total_amount || 0,
    score: rtSentiment.score || dbSentiment.score || 0,
    up_count: rtSentiment.up_count || dbSentiment.up_count || 0,
    down_count: rtSentiment.down_count || dbSentiment.down_count || 0,
    flat_count: rtSentiment.flat_count || dbSentiment.flat_count || 0,
  }

  const sentiments = data?.sentiments || []
  const sectors = data?.sectors || []

  // Prefer real-time limit_ups and brokens for Row 3
  const rtLimitUps = realTimeStats?.limit_ups || []
  const rtBrokens = realTimeStats?.brokens || []
  const limitUps = rtLimitUps.length > 0 ? rtLimitUps : (data?.limit_ups || [])
  const brokens = rtBrokens.length > 0 ? rtBrokens : (data?.brokens || [])
  const rtBoardLadder = realTimeStats?.board_ladder || {}
  const boardLadder = rtBoardLadder.max_board > 0 ? rtBoardLadder : (data?.board_ladder || {})

  const dragons = data?.dragon_tigers || []
  const stats = data?.stats || {}

  // Pagination for seal (涨停封板) and broken (炸板)
  const sealTotalPages = Math.max(1, Math.ceil(limitUps.length / SEAL_PAGE_SIZE))
  const sealPaged = limitUps.slice((sealPage - 1) * SEAL_PAGE_SIZE, sealPage * SEAL_PAGE_SIZE)
  const brokenTotalPages = Math.max(1, Math.ceil(brokens.length / BROKEN_PAGE_SIZE))
  const brokenPaged = brokens.slice((brokenPage - 1) * BROKEN_PAGE_SIZE, brokenPage * BROKEN_PAGE_SIZE)

  const getScoreColor = (score) => {
    if (score >= 70) return '#EF4444'
    if (score >= 50) return '#F59E0B'
    return '#22C55E'
  }

  const tooltipStyle = { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }

  const formatFlow = (v) => {
    if (!v || v === 0) return '---'
    const abs = Math.abs(v)
    if (abs >= 10000) return (v / 10000).toFixed(2) + '亿'
    return v.toFixed(0) + '万'
  }

  const formatAmount = (v) => {
    if (!v || v === 0) return '---'
    const abs = Math.abs(v)
    if (abs >= 100000000) return (v / 100000000).toFixed(2) + '亿'
    if (abs >= 10000) return (v / 10000).toFixed(0) + '万'
    return v.toFixed(0)
  }

  const currentFlows = flowTab === 'sector' ? sectorFlows : conceptFlows
  const currentLimitStocks = limitTab === 'up' ? limitUpStocks : limitDownStocks

  const PAGE_SIZE = 12
  const limitTotalPages = Math.max(1, Math.ceil(currentLimitStocks.length / PAGE_SIZE))
  const limitPagedStocks = currentLimitStocks.slice((limitPage - 1) * PAGE_SIZE, limitPage * PAGE_SIZE)
  const flowTotalPages = Math.max(1, Math.ceil(currentFlows.length / PAGE_SIZE))
  const flowPagedItems = currentFlows.slice((flowPage - 1) * PAGE_SIZE, flowPage * PAGE_SIZE)

  // Pagination component helper
  const PaginationBar = ({ page, totalPages, total, label, onPageChange }) => (
    <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
      <span className="text-[10px] text-gray-400">共 {total} {label} · 第 {page}/{totalPages} 页</span>
      <div className="flex items-center gap-0.5">
        <button onClick={() => onPageChange(Math.max(1, page - 1))} disabled={page <= 1}
          className={`p-1 rounded transition ${page <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
          <ChevronLeft size={13} />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let p
          if (totalPages <= 5) {
            p = i + 1
          } else if (page <= 3) {
            p = i + 1
          } else if (page >= totalPages - 2) {
            p = totalPages - 4 + i
          } else {
            p = page - 2 + i
          }
          return (
            <button key={p} onClick={() => onPageChange(p)}
              className={`w-5 h-5 rounded text-[10px] font-medium transition ${p === page ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              style={p === page ? { background: '#513CC8' } : {}}>
              {p}
            </button>
          )
        })}
        <button onClick={() => onPageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
          className={`p-1 rounded transition ${page >= totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  )

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">A股看板大屏</h1>
          <p className="text-xs text-gray-400 mt-1">
            实时数据来源：东方财富 · {loading ? '加载中...' : `最后更新 ${new Date().toLocaleTimeString('zh-CN')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {last7Days.map(d => (
            <button key={d} onClick={() => setDate(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                date === d ? 'text-white shadow-md' : 'text-gray-500 hover:text-gray-700 bg-white border border-gray-200 hover:border-gray-300'
              }`}
              style={date === d ? { background: '#513CC8', boxShadow: '0 2px 8px rgba(81,60,200,0.3)' } : {}}>
              {d.slice(5)}
            </button>
          ))}
          <button onClick={loadData} disabled={loading}
            className="p-2 rounded-lg text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA] transition ml-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Row - NOW USES REAL-TIME DATA */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '涨停', value: sentiment.limit_up_count, icon: ArrowUp, color: '#EF4444', suffix: '家' },
          { label: '跌停', value: sentiment.limit_down_count, icon: ArrowDown, color: '#22C55E', suffix: '家' },
          { label: '炸板', value: sentiment.broken_count, icon: AlertTriangle, color: '#F59E0B', suffix: '家' },
          { label: '最高连板', value: sentiment.highest_board, icon: Crown, color: '#513CC8', suffix: '板' },
          { label: '总成交额', value: sentiment.total_amount ? sentiment.total_amount.toFixed(0) : '0', icon: DollarSign, color: '#3B82F6', suffix: '亿' },
          { label: '情绪指数', value: sentiment.score ? sentiment.score.toFixed(0) : '0', icon: Activity, color: getScoreColor(sentiment.score), suffix: '分' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${item.color}10` }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-400">{item.label}</p>
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}<span className="text-xs ml-1 font-normal text-gray-400">{item.suffix}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Heat + Concept Heat + Sentiment */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Flame size={16} style={{ color: '#513CC8' }} /> 热力板块</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {sectors.slice(0, 12).map((s, i) => {
              const intensity = Math.min(Math.abs(s.change_pct) / 4, 1)
              const bg = s.change_pct >= 0
                ? `rgba(239,68,68,${0.08 + intensity * 0.25})`
                : `rgba(34,197,94,${0.08 + intensity * 0.25})`
              return (
                <div key={i} className="rounded-lg p-2 text-center border border-transparent hover:border-gray-200 transition" style={{ background: bg }}>
                  <p className="text-xs font-medium truncate text-gray-700">{s.name}</p>
                  <p className={`text-sm font-bold ${s.change_pct >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {s.change_pct > 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{s.lead_stock}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Lightbulb size={16} style={{ color: '#F59E0B' }} /> 热力概念(实时)</h3>
          <div className="grid grid-cols-3 gap-1.5">
            {conceptData.slice(0, 12).map((c, i) => {
              const intensity = Math.min(Math.abs(c.change_pct) / 4, 1)
              const bg = c.change_pct >= 0
                ? `rgba(239,68,68,${0.08 + intensity * 0.25})`
                : `rgba(34,197,94,${0.08 + intensity * 0.25})`
              return (
                <div key={i} className="rounded-lg p-2 text-center border border-transparent hover:border-gray-200 transition" style={{ background: bg }}>
                  <p className="text-xs font-medium truncate text-gray-700">{c.name}</p>
                  <p className={`text-sm font-bold ${c.change_pct >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {c.change_pct > 0 ? '+' : ''}{c.change_pct?.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{formatFlow(c.net_flow * 10000)}</p>
                </div>
              )
            })}
            {conceptData.length === 0 && (
              <div className="col-span-3 text-center py-4 text-gray-400 text-xs">暂无概念数据（非交易时段）</div>
            )}
          </div>
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Activity size={16} style={{ color: '#513CC8' }} /> 情绪走势 + 成交额</h3>
          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={sentiments.slice(-5)}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#513CC8" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#513CC8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="trade_date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} domain={[0, 100]} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v, name) => [typeof v === 'number' ? v.toFixed(1) : v, name === 'score' ? '情绪分' : name]} />
              <Area type="monotone" dataKey="score" stroke="#513CC8" fill="url(#sentGrad)" strokeWidth={2} name="score" dot={{ fill: '#513CC8', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={sentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(0) + '亿' : v, '成交额']} />
              <Bar dataKey="total_amount" fill="#513CC8" radius={[4,4,0,0]} name="total_amount" opacity={0.85} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Limit-up/down details + Fund Flow */}
      <div className="grid grid-cols-12 gap-3">
        {/* Daily Limit-up / Limit-down stocks with pagination */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Eye size={16} style={{ color: '#EF4444' }} /> 当日涨跌停个股
            </h3>
            <div className="flex gap-1">
              <button onClick={() => { setLimitTab('up'); setLimitPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${limitTab === 'up' ? 'text-white bg-red-500' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                涨停 {limitUpStocks.length}
              </button>
              <button onClick={() => { setLimitTab('down'); setLimitPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${limitTab === 'down' ? 'text-white bg-green-500' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                跌停 {limitDownStocks.length}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">股票</th>
                  <th className="text-right p-2">现价</th>
                  <th className="text-right p-2">开盘价</th>
                  <th className="text-right p-2">涨跌幅</th>
                  <th className="text-right p-2">资金(亿)</th>
                  <th className="text-left p-2">概念</th>
                </tr>
              </thead>
              <tbody>
                {limitPagedStocks.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-2">
                      <span className="text-gray-800 font-medium">{s.name}</span>
                      <span className="text-gray-400 ml-1">{s.code}</span>
                      {s.board_count > 1 && (
                        <span className="ml-1 px-1 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">
                          {s.board_count}连板
                        </span>
                      )}
                    </td>
                    <td className={`p-2 text-right font-medium ${limitTab === 'up' ? 'stock-up' : 'stock-down'}`}>
                      {s.price?.toFixed(2) || '---'}
                    </td>
                    <td className="p-2 text-right text-gray-500">
                      {s.open?.toFixed(2) || '---'}
                    </td>
                    <td className={`p-2 text-right font-medium ${(s.change_pct || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {s.change_pct >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                    </td>
                    <td className={`p-2 text-right ${(s.fund_amount || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {s.fund_amount?.toFixed(2) || '---'}
                    </td>
                    <td className="p-2 text-gray-400 max-w-[80px] truncate">{s.concept?.split('+')[0] || '---'}</td>
                  </tr>
                ))}
                {currentLimitStocks.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-4 text-gray-400">暂无当日涨跌停数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {currentLimitStocks.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">共 {currentLimitStocks.length} 只 · 第 {limitPage}/{limitTotalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setLimitPage(p => Math.max(1, p - 1))} disabled={limitPage <= 1}
                  className={`p-1.5 rounded-lg transition ${limitPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(limitTotalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setLimitPage(p)}
                    className={`w-6 h-6 rounded-lg text-[11px] font-medium transition ${p === limitPage ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    style={p === limitPage ? { background: '#513CC8' } : {}}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setLimitPage(p => Math.min(limitTotalPages, p + 1))} disabled={limitPage >= limitTotalPages}
                  className={`p-1.5 rounded-lg transition ${limitPage >= limitTotalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sector/Concept Fund Flow with amounts + pagination */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <DollarSign size={16} style={{ color: '#3B82F6' }} /> 资金流向(实时金额)
            </h3>
            <div className="flex gap-1">
              <button onClick={() => { setFlowTab('sector'); setFlowPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${flowTab === 'sector' ? 'text-white' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}
                style={flowTab === 'sector' ? { background: '#513CC8' } : {}}>
                板块
              </button>
              <button onClick={() => { setFlowTab('concept'); setFlowPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${flowTab === 'concept' ? 'text-white' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}
                style={flowTab === 'concept' ? { background: '#513CC8' } : {}}>
                概念
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">名称</th>
                  <th className="text-right p-2">涨跌幅</th>
                  <th className="text-right p-2">净流入(万)</th>
                  <th className="text-right p-2">流入(万)</th>
                  <th className="text-right p-2">流出(万)</th>
                  <th className="text-left p-2">领涨股</th>
                </tr>
              </thead>
              <tbody>
                {flowPagedItems.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-2 font-medium text-gray-800">{f.name}</td>
                    <td className={`p-2 text-right font-medium ${(f.change_pct || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {f.change_pct >= 0 ? '+' : ''}{f.change_pct?.toFixed(2)}%
                    </td>
                    <td className={`p-2 text-right font-medium ${(f.net_flow || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {formatFlow(f.net_flow)}
                    </td>
                    <td className="p-2 text-right text-red-400">{formatFlow(f.flow_in)}</td>
                    <td className="p-2 text-right text-green-400">{formatFlow(f.flow_out)}</td>
                    <td className="p-2 text-gray-400 truncate max-w-[60px]">{f.lead_stock || '---'}</td>
                  </tr>
                ))}
                {currentFlows.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-4 text-gray-400">暂无数据（非交易时段）</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {currentFlows.length > PAGE_SIZE && (
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-[11px] text-gray-400">共 {currentFlows.length} 条 · 第 {flowPage}/{flowTotalPages} 页</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setFlowPage(p => Math.max(1, p - 1))} disabled={flowPage <= 1}
                  className={`p-1.5 rounded-lg transition ${flowPage <= 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
                  <ChevronLeft size={14} />
                </button>
                {Array.from({ length: Math.min(flowTotalPages, 7) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setFlowPage(p)}
                    className={`w-6 h-6 rounded-lg text-[11px] font-medium transition ${p === flowPage ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                    style={p === flowPage ? { background: '#513CC8' } : {}}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setFlowPage(p => Math.min(flowTotalPages, p + 1))} disabled={flowPage >= flowTotalPages}
                  className={`p-1.5 rounded-lg transition ${flowPage >= flowTotalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-[#513CC8] hover:bg-[#F0EDFA]'}`}>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Board Ladder (paginated 5/page) + Broken Stocks (paginated 5/page) + Sector Chart */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Crown size={16} className="text-red-500" /> 涨停封板 · 连板天梯 <span className="text-[10px] text-gray-400 font-normal ml-1">(实时·每页5)</span></h3>
          {boardLadder.max_board > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {Array.from({length: boardLadder.max_board}, (_, i) => boardLadder.max_board - i).map(level => {
                const count = boardLadder.ladder?.[level] || boardLadder.ladder?.[String(level)] || 0
                if (count === 0) return null
                return (
                  <span key={level} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">
                    {level}板: {count}家
                  </span>
                )
              })}
            </div>
          )}
          <div className="space-y-1">
            {sealPaged.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center text-[10px] font-bold border border-red-100">
                    {s.board_count || 1}
                  </span>
                  <span className="text-gray-800 font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="stock-up font-medium">+{s.change_pct?.toFixed(2)}%</span>
                  <span className="text-gray-400 text-[10px] max-w-[60px] truncate">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            ))}
            {limitUps.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-xs">暂无涨停封板数据</div>
            )}
          </div>
          {limitUps.length > SEAL_PAGE_SIZE && (
            <PaginationBar page={sealPage} totalPages={sealTotalPages} total={limitUps.length} label="家" onPageChange={setSealPage} />
          )}
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><AlertTriangle size={16} className="text-yellow-500" /> 炸板个股 <span className="text-[10px] text-gray-400 font-normal ml-1">(实时·每页5)</span></h3>
          <div className="space-y-1">
            {brokenPaged.length > 0 ? brokenPaged.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center text-[10px] font-bold border border-yellow-100">
                    {(brokenPage - 1) * BROKEN_PAGE_SIZE + i + 1}
                  </span>
                  <span className="text-gray-800 font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${(s.change_pct || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {(s.change_pct || 0) >= 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                  </span>
                  <span className="text-gray-400 text-[10px] truncate max-w-[60px]">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-400 text-xs">暂无炸板数据（非交易时段或无炸板）</div>
            )}
          </div>
          {brokens.length > BROKEN_PAGE_SIZE && (
            <PaginationBar page={brokenPage} totalPages={brokenTotalPages} total={brokens.length} label="家" onPageChange={setBrokenPage} />
          )}
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><BarChart3 size={16} style={{ color: '#513CC8' }} /> 板块资金净流入(亿)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectors.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{fontSize: 10, fill: '#9CA3AF'}} />
              <YAxis type="category" dataKey="name" tick={{fontSize: 10, fill: '#6B7280'}} width={60} />
              <Tooltip contentStyle={tooltipStyle}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(2) + '亿' : v, '净流入']} />
              <Bar dataKey="net_flow" radius={[0,4,4,0]} name="net_flow">
                {sectors.slice(0, 8).map((s, i) => (
                  <Cell key={i} fill={s.net_flow >= 0 ? '#EF4444' : '#22C55E'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Dragon Tiger Hot Money (PAGINATED 5/page, by trader name) + Charts */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Users size={16} className="text-orange-500" /> 龙虎榜游资数据
              <span className="text-[10px] text-gray-400 font-normal ml-1">(按游资分组·每页5)</span>
            </h3>
            {hotMoneyDate && (
              <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{hotMoneyDate}</span>
            )}
          </div>
          <div className="overflow-x-auto">
            {hotMoneyData.length > 0 ? (
              <div className="space-y-1">
                {hotMoneyData.map((trader, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => setExpandedTrader(expandedTrader === i ? null : i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center text-[10px] font-bold border border-orange-100">
                          {(hotMoneyPage - 1) * HOT_MONEY_PAGE_SIZE + i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">{trader.trader_name}</span>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">{trader.trade_count}笔</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="stock-up">买{formatAmount(trader.total_buy)}</span>
                        <span className="stock-down">卖{formatAmount(trader.total_sell)}</span>
                        <span className={`font-bold ${(trader.total_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          净{formatAmount(trader.total_net)}
                        </span>
                        {expandedTrader === i ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                      </div>
                    </div>
                    {expandedTrader === i && trader.trades && (
                      <div className="border-t border-gray-100 bg-gray-50/50">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-gray-400">
                              <th className="text-left p-1.5 pl-3">股票</th>
                              <th className="text-left p-1.5">营业部</th>
                              <th className="text-right p-1.5">买入</th>
                              <th className="text-right p-1.5">卖出</th>
                              <th className="text-right p-1.5 pr-3">净额</th>
                            </tr>
                          </thead>
                          <tbody>
                            {trader.trades.map((t, j) => (
                              <tr key={j} className="border-t border-gray-100/50 hover:bg-white/50">
                                <td className="p-1.5 pl-3">
                                  <span className="text-gray-800 font-medium">{t.name}</span>
                                  <span className="text-gray-400 ml-1">{t.code}</span>
                                </td>
                                <td className="p-1.5 text-gray-400 max-w-[120px] truncate">{t.seat}</td>
                                <td className="p-1.5 text-right stock-up">{formatAmount(t.buy_amt)}</td>
                                <td className="p-1.5 text-right stock-down">{formatAmount(t.sell_amt)}</td>
                                <td className={`p-1.5 text-right pr-3 font-medium ${(t.net_amt || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                                  {formatAmount(t.net_amt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400 text-xs">
                {loading ? '加载中...' : '暂无龙虎榜游资数据（T+1延迟，非交易日可能无数据）'}
              </div>
            )}
          </div>
          {hotMoneyTotal > HOT_MONEY_PAGE_SIZE && (
            <PaginationBar page={hotMoneyPage} totalPages={hotMoneyTotalPages} total={hotMoneyTotal} label="家游资"
              onPageChange={(p) => { setHotMoneyPage(p); setExpandedTrader(null) }} />
          )}
        </div>

        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Zap size={16} style={{ color: '#513CC8' }} /> 涨跌分布 <span className="text-[10px] text-gray-400 font-normal">(实时)</span></h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[
                { name: '上涨', value: sentiment.up_count || 0 },
                { name: '下跌', value: sentiment.down_count || 0 },
                { name: '平盘', value: sentiment.flat_count || 0 },
              ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                <Cell fill="#EF4444" />
                <Cell fill="#22C55E" />
                <Cell fill="#D1D5DB" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>上涨 {sentiment.up_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>下跌 {sentiment.down_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span>平盘 {sentiment.flat_count || 0}</span>
          </div>
        </div>

        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 text-gray-800">涨跌停趋势</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="limit_up_count" fill="#EF4444" radius={[2,2,0,0]} name="涨停" />
              <Bar dataKey="limit_down_count" fill="#22C55E" radius={[2,2,0,0]} name="跌停" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'AI智能体', value: stats.agents || 0, color: '#513CC8' },
          { label: '策略信号', value: stats.strategy_signals || 0, color: '#F59E0B' },
          { label: '行情数据', value: stats.stock_quotes || 0, color: '#3B82F6' },
          { label: '审计日志', value: stats.audit_logs || 0, color: '#22C55E' },
          { label: '用户数', value: stats.users || 0, color: '#EC4899' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-3 text-center">
            <p className="text-xs text-gray-400 mb-1">{item.label}</p>
            <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
