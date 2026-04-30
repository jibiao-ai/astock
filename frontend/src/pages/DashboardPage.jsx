import { useState, useEffect, useRef, useCallback } from 'react'
import { getDashboard, getConceptHeat, getSectorFundFlow, getSectorHeat, getTsDragonTiger, getTsLimitStats, getTsLimitStep, getTsStkAuction, getTsMoneyflow, getTsRealTimeStats } from '../services/api'
import { BarChart3, TrendingUp, TrendingDown, Activity, Flame, Crown, AlertTriangle, DollarSign, Users, Zap, ArrowUp, ArrowDown, RefreshCw, Lightbulb, Eye, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Maximize, Minimize, Clock, Gavel } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts'

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [conceptData, setConceptData] = useState([])
  const [sectorFlows, setSectorFlows] = useState([])
  const [conceptFlows, setConceptFlows] = useState([])
  const [flowTab, setFlowTab] = useState('sector')
  const [limitTab, setLimitTab] = useState('up')
  const [limitPage, setLimitPage] = useState(1)
  const [flowPage, setFlowPage] = useState(1)

  // Tushare-backed real-time stats
  const [tsStats, setTsStats] = useState(null)
  // Tushare-backed dragon tiger hot money
  const [hotMoneyData, setHotMoneyData] = useState([])
  const [hotMoneyDate, setHotMoneyDate] = useState('')
  const [hotMoneyPage, setHotMoneyPage] = useState(1)
  const [hotMoneyTotal, setHotMoneyTotal] = useState(0)
  const [hotMoneyTotalPages, setHotMoneyTotalPages] = useState(1)
  const [expandedTrader, setExpandedTrader] = useState(null)

  // Tushare-backed limit stats
  const [tsLimitData, setTsLimitData] = useState(null)
  // Tushare-backed limit step (board ladder)
  const [tsLimitStep, setTsLimitStep] = useState(null)
  // Tushare-backed auction data
  const [tsAuction, setTsAuction] = useState(null)
  const [auctionPage, setAuctionPage] = useState(1)
  // Tushare-backed moneyflow
  const [tsMoneyflow, setTsMoneyflow] = useState(null)
  const [moneyflowPage, setMoneyflowPage] = useState(1)
  const [moneyflowTab, setMoneyflowTab] = useState('stock')

  // Board seal + broken pagination (5 per page)
  const [sealPage, setSealPage] = useState(1)
  const [brokenPage, setBrokenPage] = useState(1)
  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false)
  const dashboardRef = useRef(null)
  // Sector/Concept heat pagination
  const [sectorHeatPage, setSectorHeatPage] = useState(1)
  const [sectorHeatData, setSectorHeatData] = useState([])
  const [sectorHeatTotal, setSectorHeatTotal] = useState(0)
  const [conceptHeatPage, setConceptHeatPage] = useState(1)
  const [conceptHeatTotal, setConceptHeatTotal] = useState(0)

  const SEAL_PAGE_SIZE = 5
  const BROKEN_PAGE_SIZE = 5
  const HOT_MONEY_PAGE_SIZE = 5
  const AUCTION_PAGE_SIZE = 15
  const MONEYFLOW_PAGE_SIZE = 15

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

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      const el = dashboardRef.current || document.documentElement
      el.requestFullscreen?.() || el.webkitRequestFullscreen?.() || el.msRequestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.() || document.webkitExitFullscreen?.() || document.msExitFullscreen?.()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  useEffect(() => { loadData() }, [date])

  // Convert date to YYYYMMDD for tushare APIs
  const tsDate = date.replace(/-/g, '')

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

  const loadData = async () => {
    setLoading(true)
    setSealPage(1)
    setBrokenPage(1)
    setHotMoneyPage(1)
    setAuctionPage(1)
    setMoneyflowPage(1)
    try {
      const [dashRes, conceptRes, sectorFlowRes, conceptFlowRes, sectorHeatRes,
             tsStatsRes, tsLimitRes, tsStepRes, tsDragonRes, tsAuctionRes, tsMoneyflowRes] = await Promise.all([
        retryFetch(() => getDashboard({ date })),
        retryFetch(() => getConceptHeat({ page: 1, page_size: 100 })),
        retryFetch(() => getSectorFundFlow({ category: 'sector', page: 1, page_size: 100 })),
        retryFetch(() => getSectorFundFlow({ category: 'concept', page: 1, page_size: 100 })),
        retryFetch(() => getSectorHeat({ page: 1, page_size: 100 })),
        // Tushare-backed APIs
        retryFetch(() => getTsRealTimeStats({ trade_date: tsDate })),
        retryFetch(() => getTsLimitStats({ trade_date: tsDate })),
        retryFetch(() => getTsLimitStep({ trade_date: tsDate })),
        retryFetch(() => getTsDragonTiger({ trade_date: tsDate, page: 1, page_size: 50 })),
        retryFetch(() => getTsStkAuction({ trade_date: tsDate, page: 1, page_size: AUCTION_PAGE_SIZE })),
        retryFetch(() => getTsMoneyflow({ trade_date: tsDate, category: 'stock', page: 1, page_size: MONEYFLOW_PAGE_SIZE })),
      ])

      if (dashRes?.code === 0) setData(dashRes.data)
      if (conceptRes?.code === 0) {
        const items = conceptRes.data?.items || conceptRes.data || []
        setConceptData(items)
        setConceptHeatTotal(conceptRes.data?.total || items.length)
      }
      if (sectorFlowRes?.code === 0) setSectorFlows(sectorFlowRes.data?.flows || [])
      if (conceptFlowRes?.code === 0) setConceptFlows(conceptFlowRes.data?.flows || [])
      if (sectorHeatRes?.code === 0) {
        const items = sectorHeatRes.data?.items || []
        setSectorHeatData(items)
        setSectorHeatTotal(sectorHeatRes.data?.total || items.length)
      }
      // Tushare data
      if (tsStatsRes?.code === 0) setTsStats(tsStatsRes.data)
      if (tsLimitRes?.code === 0) setTsLimitData(tsLimitRes.data)
      if (tsStepRes?.code === 0) setTsLimitStep(tsStepRes.data)
      if (tsDragonRes?.code === 0) {
        setHotMoneyData(tsDragonRes.data?.traders || [])
        setHotMoneyDate(tsDragonRes.data?.trade_date || '')
        setHotMoneyTotal(tsDragonRes.data?.total_traders || 0)
        setHotMoneyTotalPages(Math.max(1, Math.ceil((tsDragonRes.data?.total_traders || 0) / HOT_MONEY_PAGE_SIZE)))
      }
      if (tsAuctionRes?.code === 0) setTsAuction(tsAuctionRes.data)
      if (tsMoneyflowRes?.code === 0) setTsMoneyflow(tsMoneyflowRes.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  // Refresh individual section
  const refreshSection = async (section) => {
    try {
      switch (section) {
        case 'stats':
          const r = await retryFetch(() => getTsRealTimeStats({ trade_date: tsDate, refresh: 'true' }))
          if (r?.code === 0) setTsStats(r.data)
          break
        case 'dragon':
          const dr = await retryFetch(() => getTsDragonTiger({ trade_date: tsDate, page: 1, page_size: 50, refresh: 'true' }))
          if (dr?.code === 0) {
            setHotMoneyData(dr.data?.traders || [])
            setHotMoneyDate(dr.data?.trade_date || '')
            setHotMoneyTotal(dr.data?.total_traders || 0)
          }
          break
        case 'limit':
          const lr = await retryFetch(() => getTsLimitStats({ trade_date: tsDate, refresh: 'true' }))
          if (lr?.code === 0) setTsLimitData(lr.data)
          break
        case 'step':
          const sr = await retryFetch(() => getTsLimitStep({ trade_date: tsDate, refresh: 'true' }))
          if (sr?.code === 0) setTsLimitStep(sr.data)
          break
        case 'auction':
          const ar = await retryFetch(() => getTsStkAuction({ trade_date: tsDate, page: 1, page_size: AUCTION_PAGE_SIZE, refresh: 'true' }))
          if (ar?.code === 0) setTsAuction(ar.data)
          break
        case 'moneyflow':
          const mfr = await retryFetch(() => getTsMoneyflow({ trade_date: tsDate, category: moneyflowTab, page: 1, page_size: MONEYFLOW_PAGE_SIZE, refresh: 'true' }))
          if (mfr?.code === 0) setTsMoneyflow(mfr.data)
          break
      }
    } catch(e) { console.error(e) }
  }

  // Load moneyflow when tab changes
  const loadMoneyflow = async (category, page = 1) => {
    const res = await retryFetch(() => getTsMoneyflow({ trade_date: tsDate, category, page, page_size: MONEYFLOW_PAGE_SIZE }))
    if (res?.code === 0) setTsMoneyflow(res.data)
  }

  // Load auction when page changes
  const loadAuction = async (page) => {
    const res = await retryFetch(() => getTsStkAuction({ trade_date: tsDate, page, page_size: AUCTION_PAGE_SIZE }))
    if (res?.code === 0) setTsAuction(res.data)
  }

  // Use Tushare stats for sentiment
  const tsSentiment = tsStats?.market_sentiment || {}
  const dbSentiment = data?.market_sentiment || {}
  const sentiment = {
    limit_up_count: tsSentiment.limit_up_count || dbSentiment.limit_up_count || 0,
    limit_down_count: tsSentiment.limit_down_count || dbSentiment.limit_down_count || 0,
    broken_count: tsSentiment.broken_count || dbSentiment.broken_count || 0,
    highest_board: tsSentiment.highest_board || dbSentiment.highest_board || 0,
    total_amount: tsSentiment.total_amount || dbSentiment.total_amount || 0,
    score: tsSentiment.score || dbSentiment.score || 0,
    up_count: tsSentiment.up_count || dbSentiment.up_count || 0,
    down_count: tsSentiment.down_count || dbSentiment.down_count || 0,
    flat_count: tsSentiment.flat_count || dbSentiment.flat_count || 0,
  }

  const sentiments = data?.sentiments || []
  const sectors = sectorHeatData.length > 0 ? sectorHeatData : (data?.sectors || [])

  // Use Tushare limit data for Row 3
  const limitUps = (tsStats?.limit_ups || [])
  const brokens = (tsStats?.brokens || [])
  const boardLadder = tsStats?.board_ladder || (tsLimitStep ? { ladder: tsLimitStep.ladder_map, max_board: tsLimitStep.highest_board } : {})

  // Limit-up/down stocks from Tushare
  const limitUpStocks = tsLimitData?.up_stocks || []
  const limitDownStocks = tsLimitData?.down_stocks || []

  const dragons = data?.dragon_tigers || []
  const stats = data?.stats || {}

  // Pagination for seal (涨停封板) and broken (炸板)
  const sealTotalPages = Math.max(1, Math.ceil(limitUps.length / SEAL_PAGE_SIZE))
  const sealPaged = limitUps.slice((sealPage - 1) * SEAL_PAGE_SIZE, sealPage * SEAL_PAGE_SIZE)
  const brokenTotalPages = Math.max(1, Math.ceil(brokens.length / BROKEN_PAGE_SIZE))
  const brokenPaged = brokens.slice((brokenPage - 1) * BROKEN_PAGE_SIZE, brokenPage * BROKEN_PAGE_SIZE)

  // Hot money pagination (frontend-side since we already have all traders)
  const hotMoneyPaged = hotMoneyData.slice((hotMoneyPage - 1) * HOT_MONEY_PAGE_SIZE, hotMoneyPage * HOT_MONEY_PAGE_SIZE)
  const hotMoneyTotalPagesCalc = Math.max(1, Math.ceil(hotMoneyData.length / HOT_MONEY_PAGE_SIZE))

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

  const formatAmountWan = (v) => {
    if (!v || v === 0) return '---'
    const abs = Math.abs(v)
    if (abs >= 10000) return (v / 10000).toFixed(2) + '亿'
    return v.toFixed(0) + '万'
  }

  const currentFlows = flowTab === 'sector' ? sectorFlows : conceptFlows
  const currentLimitStocks = limitTab === 'up' ? limitUpStocks : limitDownStocks

  const PAGE_SIZE = 12
  const limitTotalPages = Math.max(1, Math.ceil(currentLimitStocks.length / PAGE_SIZE))
  const limitPagedStocks = currentLimitStocks.slice((limitPage - 1) * PAGE_SIZE, limitPage * PAGE_SIZE)
  const flowTotalPages = Math.max(1, Math.ceil(currentFlows.length / PAGE_SIZE))
  const flowPagedItems = currentFlows.slice((flowPage - 1) * PAGE_SIZE, flowPage * PAGE_SIZE)

  // Auction data
  const auctionItems = tsAuction?.items || []
  const auctionTotal = tsAuction?.total || 0
  const auctionTotalPages = tsAuction?.total_pages || 1

  // Moneyflow data
  const moneyflowItems = tsMoneyflow?.items || []
  const moneyflowTotal = tsMoneyflow?.total || 0
  const moneyflowTotalPages = tsMoneyflow?.total_pages || 1

  // Section refresh button
  const RefreshBtn = ({ onClick, title }) => (
    <button onClick={onClick} title={title || '刷新数据'} className="p-1 rounded text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA] transition">
      <RefreshCw size={12} />
    </button>
  )

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
    <div ref={dashboardRef} className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">A股看板大屏</h1>
          <p className="text-xs text-gray-400 mt-1">
            数据来源：Tushare Pro · {loading ? '加载中...' : `最后更新 ${new Date().toLocaleTimeString('zh-CN')}`}
            {tsStats?.trade_date && <span className="ml-2 text-[#513CC8]">交易日: {tsStats.trade_date}</span>}
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
          <button onClick={toggleFullscreen}
            className="p-2 rounded-lg text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA] transition"
            title={isFullscreen ? '退出全屏' : '全屏显示'}>
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
        </div>
      </div>

      {/* Stats Row - Tushare Data */}
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
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Flame size={16} style={{ color: '#513CC8' }} /> 热力板块 <span className="text-[10px] text-gray-400 font-normal">({sectorHeatTotal || sectors.length}个)</span></h3>
          <div className="grid grid-cols-3 gap-1.5">
            {sectors.slice((sectorHeatPage - 1) * 12, sectorHeatPage * 12).map((s, i) => {
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
          {sectors.length > 12 && (
            <PaginationBar page={sectorHeatPage} totalPages={Math.ceil(sectors.length / 12)} total={sectors.length} label="个板块" onPageChange={setSectorHeatPage} />
          )}
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Lightbulb size={16} style={{ color: '#F59E0B' }} /> 热力概念 <span className="text-[10px] text-gray-400 font-normal">({conceptHeatTotal || conceptData.length}个)</span></h3>
          <div className="grid grid-cols-3 gap-1.5">
            {conceptData.slice((conceptHeatPage - 1) * 12, conceptHeatPage * 12).map((c, i) => {
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
              <div className="col-span-3 text-center py-4 text-gray-400 text-xs">暂无概念数据</div>
            )}
          </div>
          {conceptData.length > 12 && (
            <PaginationBar page={conceptHeatPage} totalPages={Math.ceil(conceptData.length / 12)} total={conceptData.length} label="个概念" onPageChange={setConceptHeatPage} />
          )}
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

      {/* Row 2: Limit-up/down details (Tushare) + Fund Flow (Tushare moneyflow) */}
      <div className="grid grid-cols-12 gap-3">
        {/* Daily Limit-up / Limit-down stocks from Tushare */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Eye size={16} style={{ color: '#EF4444' }} /> 当日涨跌停个股
              {tsLimitData?.trade_date && <span className="text-[10px] text-gray-400 font-normal ml-1">({tsLimitData.trade_date})</span>}
            </h3>
            <div className="flex gap-1 items-center">
              <RefreshBtn onClick={() => refreshSection('limit')} />
              <button onClick={() => { setLimitTab('up'); setLimitPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${limitTab === 'up' ? 'text-white bg-red-500' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                涨停 {tsLimitData?.limit_up || limitUpStocks.length}
              </button>
              <button onClick={() => { setLimitTab('down'); setLimitPage(1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${limitTab === 'down' ? 'text-white bg-green-500' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                跌停 {tsLimitData?.limit_down || limitDownStocks.length}
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">股票</th>
                  <th className="text-right p-2">现价</th>
                  <th className="text-right p-2">涨跌幅</th>
                  <th className="text-right p-2">连板</th>
                  <th className="text-right p-2">封单额</th>
                  <th className="text-left p-2">行业</th>
                </tr>
              </thead>
              <tbody>
                {limitPagedStocks.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-2">
                      <span className="text-gray-800 font-medium">{s.name}</span>
                      <span className="text-gray-400 ml-1">{s.code}</span>
                    </td>
                    <td className={`p-2 text-right font-medium ${limitTab === 'up' ? 'stock-up' : 'stock-down'}`}>
                      {s.close?.toFixed(2) || '---'}
                    </td>
                    <td className={`p-2 text-right font-medium ${(s.pct_chg || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {(s.pct_chg || 0) >= 0 ? '+' : ''}{s.pct_chg?.toFixed(2)}%
                    </td>
                    <td className="p-2 text-right">
                      {s.limit_times > 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">
                          {s.limit_times}连板
                        </span>
                      )}
                    </td>
                    <td className={`p-2 text-right ${(s.fd_amount || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {s.fd_amount ? formatAmountWan(s.fd_amount / 10000) : '---'}
                    </td>
                    <td className="p-2 text-gray-400 max-w-[80px] truncate">{s.industry || '---'}</td>
                  </tr>
                ))}
                {currentLimitStocks.length === 0 && (
                  <tr><td colSpan={6} className="text-center p-4 text-gray-400">暂无当日涨跌停数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {currentLimitStocks.length > PAGE_SIZE && (
            <PaginationBar page={limitPage} totalPages={limitTotalPages} total={currentLimitStocks.length} label="只" onPageChange={setLimitPage} />
          )}
        </div>

        {/* Tushare资金流向 */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <DollarSign size={16} style={{ color: '#3B82F6' }} /> 资金流向
              {tsMoneyflow?.trade_date && <span className="text-[10px] text-gray-400 font-normal ml-1">({tsMoneyflow.trade_date})</span>}
            </h3>
            <div className="flex gap-1 items-center">
              <RefreshBtn onClick={() => refreshSection('moneyflow')} />
              <button onClick={() => { setMoneyflowTab('stock'); setMoneyflowPage(1); loadMoneyflow('stock', 1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${moneyflowTab === 'stock' ? 'text-white' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}
                style={moneyflowTab === 'stock' ? { background: '#513CC8' } : {}}>
                个股
              </button>
              <button onClick={() => { setMoneyflowTab('concept'); setMoneyflowPage(1); loadMoneyflow('concept', 1) }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${moneyflowTab === 'concept' ? 'text-white' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}
                style={moneyflowTab === 'concept' ? { background: '#513CC8' } : {}}>
                概念
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">名称</th>
                  {moneyflowTab === 'stock' ? (
                    <>
                      <th className="text-right p-2">主力净流入(万)</th>
                      <th className="text-right p-2">主力流入</th>
                      <th className="text-right p-2">主力流出</th>
                      <th className="text-right p-2">散户净流入</th>
                    </>
                  ) : (
                    <>
                      <th className="text-right p-2">涨跌%</th>
                      <th className="text-right p-2">净流入(万)</th>
                      <th className="text-right p-2">净买入(万)</th>
                      <th className="text-left p-2">领涨股</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {moneyflowItems.map((f, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-2 font-medium text-gray-800">
                      {f.name}
                      {f.code && <span className="text-gray-400 ml-1 text-[10px]">{f.code}</span>}
                    </td>
                    {moneyflowTab === 'stock' ? (
                      <>
                        <td className={`p-2 text-right font-medium ${(f.main_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          {formatAmountWan(f.main_net)}
                        </td>
                        <td className="p-2 text-right text-red-400">{formatAmountWan(f.main_in)}</td>
                        <td className="p-2 text-right text-green-400">{formatAmountWan(f.main_out)}</td>
                        <td className={`p-2 text-right ${(f.retail_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          {formatAmountWan(f.retail_net)}
                        </td>
                      </>
                    ) : (
                      <>
                        <td className={`p-2 text-right font-medium ${(f.pct_change || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          {(f.pct_change || 0) >= 0 ? '+' : ''}{f.pct_change?.toFixed(2)}%
                        </td>
                        <td className={`p-2 text-right font-medium ${(f.net_amount || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          {formatAmountWan(f.net_amount)}
                        </td>
                        <td className={`p-2 text-right ${(f.net_buy_amount || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                          {formatAmountWan(f.net_buy_amount)}
                        </td>
                        <td className="p-2 text-gray-400 truncate max-w-[60px]">{f.lead_stock || '---'}</td>
                      </>
                    )}
                  </tr>
                ))}
                {moneyflowItems.length === 0 && (
                  <tr><td colSpan={5} className="text-center p-4 text-gray-400">暂无资金流向数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {moneyflowTotal > MONEYFLOW_PAGE_SIZE && (
            <PaginationBar page={moneyflowPage} totalPages={moneyflowTotalPages} total={moneyflowTotal} label="条"
              onPageChange={(p) => { setMoneyflowPage(p); loadMoneyflow(moneyflowTab, p) }} />
          )}
        </div>
      </div>

      {/* Row 3: Board Ladder + Broken + Rise/Fall Distribution */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Crown size={16} className="text-red-500" /> 涨停封板 · 连板天梯
              {tsLimitStep?.trade_date && <span className="text-[10px] text-gray-400 font-normal ml-1">({tsLimitStep.trade_date})</span>}
            </h3>
            <RefreshBtn onClick={() => refreshSection('step')} />
          </div>
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
                    {s.board_count || s.limit_times || 1}
                  </span>
                  <span className="text-gray-800 font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="stock-up font-medium">+{(s.change_pct || s.pct_chg)?.toFixed(2)}%</span>
                  <span className="text-gray-400 text-[10px] max-w-[60px] truncate">{s.concept || s.industry}</span>
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
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <AlertTriangle size={16} className="text-yellow-500" /> 炸板个股
              {tsLimitData?.trade_date && <span className="text-[10px] text-gray-400 font-normal ml-1">({tsLimitData.trade_date}·{tsLimitData?.broken || brokens.length}家)</span>}
            </h3>
            <RefreshBtn onClick={() => refreshSection('limit')} />
          </div>
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
                  <span className={`font-medium ${(s.change_pct || s.pct_chg || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {(s.change_pct || s.pct_chg || 0) >= 0 ? '+' : ''}{(s.change_pct || s.pct_chg)?.toFixed(2)}%
                  </span>
                  <span className="text-gray-400 text-[10px] truncate max-w-[60px]">{s.concept || s.industry}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-400 text-xs">暂无炸板数据</div>
            )}
          </div>
          {brokens.length > BROKEN_PAGE_SIZE && (
            <PaginationBar page={brokenPage} totalPages={brokenTotalPages} total={brokens.length} label="家" onPageChange={setBrokenPage} />
          )}
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Zap size={16} style={{ color: '#513CC8' }} /> 涨跌分布</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={[
                { name: '上涨', value: sentiment.up_count || 0 },
                { name: '下跌', value: sentiment.down_count || 0 },
                { name: '平盘', value: sentiment.flat_count || 0 },
              ]} cx="50%" cy="50%" innerRadius={30} outerRadius={48} dataKey="value">
                <Cell fill="#EF4444" />
                <Cell fill="#22C55E" />
                <Cell fill="#D1D5DB" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[10px] mb-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>上涨 {sentiment.up_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>下跌 {sentiment.down_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300"></span>平盘 {sentiment.flat_count || 0}</span>
          </div>
          <h4 className="text-xs font-medium text-gray-600 mb-2">涨跌停趋势</h4>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={sentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 8, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 8, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="limit_up_count" fill="#EF4444" radius={[2,2,0,0]} name="涨停" />
              <Bar dataKey="limit_down_count" fill="#22C55E" radius={[2,2,0,0]} name="跌停" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 4: Dragon Tiger Hot Money (Tushare) */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Users size={16} className="text-orange-500" /> 龙虎榜游资数据
              <span className="text-[10px] text-gray-400 font-normal ml-1">(Tushare·按营业部分组)</span>
            </h3>
            <div className="flex items-center gap-2">
              {hotMoneyDate && (
                <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{hotMoneyDate}</span>
              )}
              <RefreshBtn onClick={() => refreshSection('dragon')} />
            </div>
          </div>
          <div className="overflow-x-auto">
            {hotMoneyPaged.length > 0 ? (
              <div className="space-y-1">
                {hotMoneyPaged.map((trader, i) => (
                  <div key={i} className="border border-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="flex items-center justify-between p-2.5 cursor-pointer hover:bg-gray-50 transition"
                      onClick={() => setExpandedTrader(expandedTrader === i ? null : i)}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center text-[10px] font-bold border border-orange-100">
                          {(hotMoneyPage - 1) * HOT_MONEY_PAGE_SIZE + i + 1}
                        </span>
                        <span className="text-sm font-semibold text-gray-800 truncate max-w-[200px]">{trader.trader_name}</span>
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
                              <th className="text-left p-1.5">方向</th>
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
                                <td className="p-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${t.side === '0' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                                    {t.side === '0' ? '买入' : '卖出'}
                                  </span>
                                </td>
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
          {hotMoneyData.length > HOT_MONEY_PAGE_SIZE && (
            <PaginationBar page={hotMoneyPage} totalPages={hotMoneyTotalPagesCalc} total={hotMoneyData.length} label="家游资"
              onPageChange={(p) => { setHotMoneyPage(p); setExpandedTrader(null) }} />
          )}
        </div>
      </div>

      {/* Row 5: Auction Data (Tushare) */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Gavel size={16} style={{ color: '#8B5CF6' }} /> 集合竞价数据
              {tsAuction?.trade_date && <span className="text-[10px] text-gray-400 font-normal ml-1">({tsAuction.trade_date}·{auctionTotal}只)</span>}
            </h3>
            <RefreshBtn onClick={() => refreshSection('auction')} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">股票</th>
                  <th className="text-right p-2">竞价价格</th>
                  <th className="text-right p-2">昨收</th>
                  <th className="text-right p-2">涨跌幅</th>
                  <th className="text-right p-2">成交量(手)</th>
                  <th className="text-right p-2">成交额(万)</th>
                  <th className="text-right p-2">换手率%</th>
                  <th className="text-right p-2">量比</th>
                </tr>
              </thead>
              <tbody>
                {auctionItems.map((s, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="p-2">
                      <span className="text-gray-800 font-medium">{s.name}</span>
                      <span className="text-gray-400 ml-1">{s.code}</span>
                    </td>
                    <td className={`p-2 text-right font-medium ${(s.pct_chg || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {s.price?.toFixed(2) || '---'}
                    </td>
                    <td className="p-2 text-right text-gray-500">{s.pre_close?.toFixed(2) || '---'}</td>
                    <td className={`p-2 text-right font-medium ${(s.pct_chg || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {(s.pct_chg || 0) >= 0 ? '+' : ''}{s.pct_chg?.toFixed(2)}%
                    </td>
                    <td className="p-2 text-right text-gray-600">{s.vol ? (s.vol / 100).toFixed(0) : '---'}</td>
                    <td className="p-2 text-right text-gray-600">{s.amount ? (s.amount / 10000).toFixed(0) : '---'}</td>
                    <td className="p-2 text-right text-gray-600">{s.turnover_rate?.toFixed(2) || '---'}</td>
                    <td className={`p-2 text-right font-medium ${(s.volume_ratio || 0) >= 1.5 ? 'stock-up' : 'text-gray-600'}`}>
                      {s.volume_ratio?.toFixed(2) || '---'}
                    </td>
                  </tr>
                ))}
                {auctionItems.length === 0 && (
                  <tr><td colSpan={8} className="text-center p-4 text-gray-400">暂无集合竞价数据（仅09:25-09:29可用）</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {auctionTotal > AUCTION_PAGE_SIZE && (
            <PaginationBar page={auctionPage} totalPages={auctionTotalPages} total={auctionTotal} label="只"
              onPageChange={(p) => { setAuctionPage(p); loadAuction(p) }} />
          )}
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
