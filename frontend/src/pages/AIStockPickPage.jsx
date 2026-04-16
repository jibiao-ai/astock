import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { 
  Search, RefreshCw, Filter, ChevronLeft, ChevronRight, X, TrendingUp, 
  BarChart3, Activity, Clock, Target, Zap, ArrowUpRight, ArrowDownRight,
  Info, MessageSquare, Calendar, Layers, Play, Award
} from 'lucide-react'
import { 
  getAIStockPicks, runAIStockPick, getAIStockPickStats, getAIStockPickBatches,
  getTrendChart, getTrendChart5Day, getKLineRealtime, getGubaDiscussion, getChipDistribution
} from '../services/api'
import toast from 'react-hot-toast'

// ==================== Main Page ====================

export default function AIStockPickPage() {
  const [picks, setPicks] = useState([])
  const [batches, setBatches] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [selectedBatchId, setSelectedBatchId] = useState('')
  const [selectedStock, setSelectedStock] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const pageSize = 20

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, page_size: pageSize }
      if (selectedBatchId) params.batch_id = selectedBatchId
      const res = await getAIStockPicks(params)
      if (res.code === 0) {
        setPicks(res.data.items || [])
        setTotalPages(res.data.total_pages || 1)
        setTotal(res.data.total || 0)
        if (res.data.batches) setBatches(res.data.batches)
      }
    } catch (e) {
      console.error('Failed to fetch AI stock picks', e)
    }
    setLoading(false)
  }, [page, selectedBatchId])

  const fetchStats = async () => {
    try {
      const res = await getAIStockPickStats()
      if (res.code === 0) setStats(res.data)
    } catch(e) {}
  }

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchStats() }, [])

  const handleRun = async () => {
    setRunning(true)
    try {
      const res = await runAIStockPick()
      if (res.code === 0) {
        toast.success('AI筛选任务已提交，请稍候刷新')
        // Auto refresh after 10 seconds
        setTimeout(() => { fetchData(); fetchStats() }, 10000)
      } else {
        toast.error('任务提交失败')
      }
    } catch(e) {
      toast.error('任务提交失败')
    }
    setRunning(false)
  }

  const handleSelectStock = (stock) => {
    setSelectedStock(stock)
    setShowDetail(true)
  }

  return (
    <div className="p-6 space-y-4" style={{ background: '#F8F9FB', minHeight: '100vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="text-[#513CC8]" size={22} />
            AI筛选股
          </h1>
          <p className="text-xs text-gray-500 mt-1">杨永兴隔夜套利法 - 尾盘选股八步筛选策略 | 每小时自动运行</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRun} disabled={running}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all"
            style={{ background: running ? '#9CA3AF' : '#513CC8' }}>
            {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
            {running ? '运行中...' : '立即筛选'}
          </button>
          <button onClick={() => { fetchData(); fetchStats() }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
            <RefreshCw size={14} /> 刷新
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <StatsCards stats={stats} batches={batches} />

      {/* Batch Selector + Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Layers size={14} />
          <span>筛选批次:</span>
        </div>
        <select value={selectedBatchId} onChange={(e) => { setSelectedBatchId(e.target.value); setPage(1) }}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-200 outline-none">
          <option value="">最新批次</option>
          {batches.map(b => (
            <option key={b.batch_id} value={b.batch_id}>
              {b.trade_date} {b.screen_time} ({b.result_count}只)
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-500">
          共 <span className="font-bold text-[#513CC8]">{total}</span> 只筛选结果
        </div>
      </div>

      {/* Stock Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100" style={{ background: '#FAFBFC' }}>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">股票代码</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">股票名称</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500 text-xs">行业</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">收盘价</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">涨幅%</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">换手率%</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">量比</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">市值(亿)</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500 text-xs">评分</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500 text-xs">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                  <RefreshCw size={20} className="animate-spin mx-auto mb-2" />加载中...
                </td></tr>
              ) : picks.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-20 text-gray-400">
                  <Target size={24} className="mx-auto mb-2 opacity-40" />
                  暂无筛选结果，请点击"立即筛选"运行
                </td></tr>
              ) : picks.map((pick, idx) => (
                <StockRow key={pick.id || idx} pick={pick} index={(page - 1) * pageSize + idx + 1} 
                  onSelect={() => handleSelectStock(pick)} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-xs text-gray-500">
              第 {page} / {totalPages} 页，共 {total} 条
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum
                if (totalPages <= 7) {
                  pageNum = i + 1
                } else if (page <= 4) {
                  pageNum = i + 1
                } else if (page >= totalPages - 3) {
                  pageNum = totalPages - 6 + i
                } else {
                  pageNum = page - 3 + i
                }
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`min-w-[32px] h-8 rounded text-xs transition ${
                      page === pageNum 
                        ? 'text-white font-medium' 
                        : 'text-gray-600 hover:bg-gray-50 border border-gray-200'}`}
                    style={page === pageNum ? { background: '#513CC8' } : {}}>
                    {pageNum}
                  </button>
                )
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="p-1.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Eight-Step Filter Info */}
      <EightStepInfo />

      {/* Stock Detail Modal */}
      {showDetail && selectedStock && (
        <StockDetailModal stock={selectedStock} onClose={() => setShowDetail(false)} />
      )}
    </div>
  )
}

// ==================== Stats Cards ====================

function StatsCards({ stats, batches }) {
  const latestBatch = batches?.[0]
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#F0EDFA' }}>
            <Target size={16} style={{ color: '#513CC8' }} />
          </div>
          <span className="text-xs text-gray-500">今日筛选</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{latestBatch?.result_count || 0}</div>
        <p className="text-[10px] text-gray-400 mt-1">
          {latestBatch ? `${latestBatch.screen_time} 更新` : '暂无数据'}
        </p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#FEF3C7' }}>
            <Clock size={16} className="text-amber-600" />
          </div>
          <span className="text-xs text-gray-500">累计批次</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats?.total_batches || 0}</div>
        <p className="text-[10px] text-gray-400 mt-1">每小时自动筛选</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#DBEAFE' }}>
            <Award size={16} className="text-blue-600" />
          </div>
          <span className="text-xs text-gray-500">累计选股</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats?.total_stocks || 0}</div>
        <p className="text-[10px] text-gray-400 mt-1">不重复股票数</p>
      </div>
      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#D1FAE5' }}>
            <Zap size={16} className="text-emerald-600" />
          </div>
          <span className="text-xs text-gray-500">平均结果</span>
        </div>
        <div className="text-2xl font-bold text-gray-900">{stats?.avg_result || 0}</div>
        <p className="text-[10px] text-gray-400 mt-1">每次筛选平均数</p>
      </div>
    </div>
  )
}

// ==================== Stock Row ====================

function StockRow({ pick, index, onSelect }) {
  const isUp = pick.change_pct >= 0
  const pctColor = isUp ? '#EF4444' : '#22C55E'

  const getScoreColor = (score) => {
    if (score >= 85) return '#16A34A'
    if (score >= 75) return '#2563EB'
    if (score >= 65) return '#D97706'
    return '#6B7280'
  }

  const pureCode = pick.code?.split('.')?.[0] || pick.code

  return (
    <tr className="border-b border-gray-50 hover:bg-purple-50/30 transition cursor-pointer" onClick={onSelect}>
      <td className="py-3 px-4 text-gray-400 text-xs">{index}</td>
      <td className="py-3 px-4">
        <span className="font-mono text-xs text-gray-600">{pureCode}</span>
      </td>
      <td className="py-3 px-4">
        <span className="font-medium text-gray-900 text-sm">{pick.name}</span>
      </td>
      <td className="py-3 px-4">
        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{pick.industry || '-'}</span>
      </td>
      <td className="py-3 px-4 text-right font-mono text-sm" style={{ color: pctColor }}>
        {pick.close_price?.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-right">
        <span className="flex items-center justify-end gap-0.5 font-medium text-sm" style={{ color: pctColor }}>
          {isUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {isUp ? '+' : ''}{pick.change_pct?.toFixed(2)}%
        </span>
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-gray-600">
        {pick.turnover_rate?.toFixed(2)}%
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-gray-600">
        {pick.volume_ratio?.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-right font-mono text-xs text-gray-600">
        {pick.total_mv?.toFixed(1)}
      </td>
      <td className="py-3 px-4 text-right">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold text-white"
          style={{ background: getScoreColor(pick.score) }}>
          {pick.score?.toFixed(0)}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <button className="text-xs px-2.5 py-1 rounded-lg border border-purple-200 text-[#513CC8] hover:bg-purple-50 transition"
          onClick={(e) => { e.stopPropagation(); onSelect() }}>
          详情
        </button>
      </td>
    </tr>
  )
}

// ==================== Eight Step Info ====================

function EightStepInfo() {
  const [expanded, setExpanded] = useState(false)

  const steps = [
    { num: 1, title: '主板股票', desc: '仅选取上海(60xxxx)和深圳(00xxxx)主板股票，排除ST', icon: '🏢' },
    { num: 2, title: '涨幅3%-5%', desc: '当日涨幅在3%~5%区间，不追涨停，不选弱势股', icon: '📈' },
    { num: 3, title: '近期涨停', desc: '近20个交易日内有涨停记录，说明有资金关注', icon: '🔥' },
    { num: 4, title: '量比>1', desc: '量比大于1，说明当日成交活跃度高于近期平均', icon: '📊' },
    { num: 5, title: '换手率5%-10%', desc: '适度换手，筹码充分交换但不过度投机', icon: '🔄' },
    { num: 6, title: '市值50-200亿', desc: '中盘股，流动性好且弹性足够', icon: '💰' },
    { num: 7, title: '分时走势确认', desc: '全天运行在分时均价线之上，选择走势最强的个股', icon: '📉' },
    { num: 8, title: '尾盘进场', desc: '创当天新高后回踩分时均线不破时果断进场', icon: '🎯' },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition">
        <div className="flex items-center gap-2">
          <Info size={16} className="text-[#513CC8]" />
          <span className="text-sm font-medium text-gray-900">杨永兴隔夜套利法 - 八步筛选详解</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">策略说明</span>
        </div>
        <ChevronRight size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            {steps.map(step => (
              <div key={step.num} className="flex items-start gap-2 p-2.5 rounded-lg bg-gray-50">
                <div className="text-lg mt-0.5">{step.icon}</div>
                <div>
                  <div className="text-xs font-bold text-gray-900">
                    <span className="text-[#513CC8] mr-1">Step {step.num}</span>
                    {step.title}
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs font-bold text-red-700 mb-1">生死铁律 (刻进骨子里)</p>
            <p className="text-[11px] text-red-600 leading-relaxed">
              次日早盘必须清仓！除非：缩量涨停 或 一字涨停。
              其余情况必须离场，哪怕赚七八个点、盈亏平衡、亏点手续费。
              <br/>
              <span className="font-medium">战法精髓：把A股的T+1做成T+0，只赚确定的惯性溢价，不赌未知的行情。</span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Stock Detail Modal ====================

function StockDetailModal({ stock, onClose }) {
  const [activeTab, setActiveTab] = useState('info')
  const [trendData, setTrendData] = useState(null)
  const [trend5DayData, setTrend5DayData] = useState(null)
  const [klineData, setKlineData] = useState(null)
  const [chipData, setChipData] = useState(null)
  const [weeklyKlineData, setWeeklyKlineData] = useState(null)
  const [gubaData, setGubaData] = useState(null)
  const [loadingChart, setLoadingChart] = useState(false)
  const canvasRef = useRef(null)

  const pureCode = stock.code?.split('.')?.[0] || stock.code

  const tabs = [
    { key: 'info', label: '股票信息', icon: Info },
    { key: 'trend', label: '分时图', icon: Activity },
    { key: 'daily', label: '日K筹码峰', icon: BarChart3 },
    { key: 'trend5', label: '5日分时', icon: TrendingUp },
    { key: 'weekly', label: '周K线', icon: Calendar },
    { key: 'guba', label: '股吧', icon: MessageSquare },
  ]

  useEffect(() => {
    const fetchTabData = async () => {
      setLoadingChart(true)
      try {
        switch(activeTab) {
          case 'trend': {
            const res = await getTrendChart({ code: pureCode })
            if (res.code === 0) setTrendData(res.data)
            break
          }
          case 'trend5': {
            const res = await getTrendChart5Day({ code: pureCode })
            if (res.code === 0) setTrend5DayData(res.data)
            break
          }
          case 'daily': {
            const res = await getChipDistribution({ code: pureCode })
            if (res.code === 0) setChipData(res.data)
            break
          }
          case 'weekly': {
            const res = await getKLineRealtime({ code: pureCode, period: 'week', limit: 60 })
            if (res.code === 0) setWeeklyKlineData(res.data)
            break
          }
          case 'guba': {
            const res = await getGubaDiscussion({ code: pureCode })
            if (res.code === 0) setGubaData(res.data)
            break
          }
        }
      } catch(e) { console.error('Fetch failed', e) }
      setLoadingChart(false)
    }
    if (activeTab !== 'info') fetchTabData()
  }, [activeTab, pureCode])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[900px] max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#F0EDFA' }}>
              <Target size={20} style={{ color: '#513CC8' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{stock.name}</h2>
                <span className="font-mono text-xs text-gray-500">{pureCode}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-[#513CC8] font-medium">
                  评分 {stock.score?.toFixed(0)}
                </span>
              </div>
              <p className="text-xs text-gray-500">{stock.industry} | 八步筛选全通过</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition">
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-gray-100">
          {tabs.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs transition ${
                  active ? 'text-[#513CC8] font-medium border-b-2' : 'text-gray-500 hover:text-gray-900'}`}
                style={active ? { borderColor: '#513CC8' } : {}}>
                <Icon size={13} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ minHeight: '400px' }}>
          {activeTab === 'info' && <StockInfoTab stock={stock} />}
          {activeTab === 'trend' && <ChartTab loading={loadingChart} data={trendData} type="trend" code={pureCode} />}
          {activeTab === 'trend5' && <ChartTab loading={loadingChart} data={trend5DayData} type="trend5" code={pureCode} />}
          {activeTab === 'daily' && <ChipPeakTab loading={loadingChart} data={chipData} />}
          {activeTab === 'weekly' && <ChartTab loading={loadingChart} data={weeklyKlineData} type="kline" code={pureCode} />}
          {activeTab === 'guba' && <GubaTab loading={loadingChart} data={gubaData} />}
        </div>
      </div>
    </div>
  )
}

// ==================== Stock Info Tab ====================

function StockInfoTab({ stock }) {
  const isUp = stock.change_pct >= 0
  const pctColor = isUp ? '#EF4444' : '#22C55E'

  const fields = [
    { label: '股票代码', value: stock.code },
    { label: '股票名称', value: stock.name },
    { label: '所属行业', value: stock.industry || '-' },
    { label: '收盘价', value: `¥${stock.close_price?.toFixed(2)}`, color: pctColor },
    { label: '涨跌幅', value: `${isUp ? '+' : ''}${stock.change_pct?.toFixed(2)}%`, color: pctColor },
    { label: '开盘价', value: `¥${stock.open?.toFixed(2) || '-'}` },
    { label: '最高价', value: `¥${stock.high?.toFixed(2) || '-'}` },
    { label: '最低价', value: `¥${stock.low?.toFixed(2) || '-'}` },
    { label: '昨收价', value: `¥${stock.pre_close?.toFixed(2) || '-'}` },
    { label: '换手率', value: `${stock.turnover_rate?.toFixed(2)}%` },
    { label: '量比', value: stock.volume_ratio?.toFixed(2) },
    { label: '总市值', value: `${stock.total_mv?.toFixed(1)}亿` },
    { label: '成交额', value: `${stock.amount?.toFixed(2)}亿` },
    { label: '综合评分', value: stock.score?.toFixed(1) },
    { label: '筛选时间', value: `${stock.trade_date} ${stock.screen_time}` },
    { label: '通过步骤', value: stock.passed_steps || 'ALL' },
  ]

  return (
    <div className="space-y-4">
      {/* Price Banner */}
      <div className="rounded-xl p-5" style={{ background: 'linear-gradient(135deg, #F0EDFA 0%, #E8E3F8 100%)' }}>
        <div className="flex items-end gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">当前价格</p>
            <div className="text-3xl font-bold" style={{ color: pctColor }}>
              ¥{stock.close_price?.toFixed(2)}
            </div>
          </div>
          <div className="flex items-center gap-1 pb-1">
            {isUp ? <ArrowUpRight size={18} style={{ color: pctColor }} /> : <ArrowDownRight size={18} style={{ color: pctColor }} />}
            <span className="text-lg font-bold" style={{ color: pctColor }}>
              {isUp ? '+' : ''}{stock.change_pct?.toFixed(2)}%
            </span>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold text-white"
              style={{ background: '#513CC8' }}>
              <Award size={14} /> 评分 {stock.score?.toFixed(0)}
            </span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {fields.map(f => (
          <div key={f.label} className="p-3 rounded-lg bg-gray-50">
            <p className="text-[10px] text-gray-400">{f.label}</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: f.color || '#1F2937' }}>{f.value}</p>
          </div>
        ))}
      </div>

      {/* Trading Suggestion */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
          <Zap size={13} /> 尾盘操作建议
        </p>
        <ol className="text-xs text-amber-700 space-y-1 list-decimal ml-4">
          <li>观察分时走势，确保全天运行在分时均价线之上</li>
          <li>选择走势最强、强于大盘甚至逆势的个股</li>
          <li>等待创当天新高后回踩分时均线不破时进场</li>
          <li>尾盘(14:30后)果断进场，规避日内波动风险</li>
          <li className="font-bold text-red-700">次日早盘必须清仓！除非缩量涨停或一字涨停</li>
        </ol>
      </div>

      {/* Note */}
      {stock.note && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
          <p className="text-xs text-blue-700">
            <span className="font-medium">筛选备注：</span>{stock.note}
          </p>
        </div>
      )}
    </div>
  )
}

// ==================== Chart Tab (Trend / KLine) ====================

function ChartTab({ loading, data, type, code }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!data || !canvasRef.current) return

    const canvas = canvasRef.current
    const container = canvas.parentElement
    const dpr = window.devicePixelRatio || 1
    const w = container.clientWidth || 800
    const h = 380

    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    if (type === 'trend' || type === 'trend5') {
      drawTrendChart(ctx, w, h, data)
    } else if (type === 'kline') {
      drawKlineChart(ctx, w, h, data)
    }
  }, [data, type])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" />加载中...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <BarChart3 size={24} className="mr-2 opacity-40" />暂无图表数据
      </div>
    )
  }

  return (
    <div className="w-full">
      <canvas ref={canvasRef} className="w-full" />
    </div>
  )
}

// ==================== Draw Trend Chart ====================

function drawTrendChart(ctx, w, h, data) {
  const trends = data?.trends || []
  if (trends.length === 0) return

  const preClose = data?.pre_close || 0
  const pad = { top: 30, right: 20, bottom: 40, left: 60 }
  const chartW = w - pad.left - pad.right
  const chartH = h - pad.top - pad.bottom

  // Parse trend data
  const points = trends.map(t => {
    const parts = typeof t === 'string' ? t.split(',') : [t.time, t.price, t.avg_price, t.volume]
    return {
      time: parts[0],
      price: parseFloat(parts[1]) || 0,
      avg: parseFloat(parts[2]) || 0,
      vol: parseFloat(parts[3]) || 0,
    }
  }).filter(p => p.price > 0)

  if (points.length === 0) return

  const prices = points.map(p => p.price)
  const avgs = points.map(p => p.avg).filter(a => a > 0)
  const allPrices = [...prices, ...avgs]
  if (preClose > 0) allPrices.push(preClose)
  
  let minP = Math.min(...allPrices)
  let maxP = Math.max(...allPrices)
  const padding = (maxP - minP) * 0.1 || maxP * 0.02
  minP -= padding
  maxP += padding

  // Background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + chartW, y)
    ctx.stroke()
  }

  // Pre-close line
  if (preClose > 0 && preClose >= minP && preClose <= maxP) {
    const y = pad.top + (1 - (preClose - minP) / (maxP - minP)) * chartH
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(pad.left + chartW, y)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`昨收 ${preClose.toFixed(2)}`, pad.left - 4, y + 3)
  }

  // Price line
  ctx.beginPath()
  ctx.strokeStyle = '#3B82F6'
  ctx.lineWidth = 1.5
  points.forEach((p, i) => {
    const x = pad.left + (i / (points.length - 1)) * chartW
    const y = pad.top + (1 - (p.price - minP) / (maxP - minP)) * chartH
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.stroke()

  // Fill under price line
  const firstX = pad.left
  const lastX = pad.left + chartW
  ctx.lineTo(lastX, pad.top + chartH)
  ctx.lineTo(firstX, pad.top + chartH)
  ctx.closePath()
  const grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + chartH)
  grad.addColorStop(0, 'rgba(59,130,246,0.15)')
  grad.addColorStop(1, 'rgba(59,130,246,0.02)')
  ctx.fillStyle = grad
  ctx.fill()

  // Average line
  const avgPoints = points.filter(p => p.avg > 0)
  if (avgPoints.length > 1) {
    ctx.beginPath()
    ctx.strokeStyle = '#F59E0B'
    ctx.lineWidth = 1
    avgPoints.forEach((p, i) => {
      const idx = points.indexOf(p)
      const x = pad.left + (idx / (points.length - 1)) * chartW
      const y = pad.top + (1 - (p.avg - minP) / (maxP - minP)) * chartH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  // Y-axis labels
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const price = maxP - ((maxP - minP) / 4) * i
    const y = pad.top + (chartH / 4) * i
    ctx.fillText(price.toFixed(2), pad.left - 6, y + 3)
  }

  // X-axis labels
  ctx.textAlign = 'center'
  const step = Math.max(1, Math.floor(points.length / 5))
  for (let i = 0; i < points.length; i += step) {
    const x = pad.left + (i / (points.length - 1)) * chartW
    const time = points[i].time?.split(' ')?.[1] || points[i].time?.substring(11) || ''
    ctx.fillText(time.substring(0, 5), x, h - pad.bottom + 15)
  }

  // Legend
  ctx.font = '11px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(pad.left, 8, 12, 3)
  ctx.fillText('价格', pad.left + 16, 13)
  ctx.fillStyle = '#F59E0B'
  ctx.fillRect(pad.left + 60, 8, 12, 3)
  ctx.fillText('均价', pad.left + 76, 13)
}

// ==================== Draw KLine Chart ====================

function drawKlineChart(ctx, w, h, data) {
  const klines = data?.klines || data?.items || []
  if (klines.length === 0) return

  const pad = { top: 30, right: 20, bottom: 40, left: 65 }
  const chartW = w - pad.left - pad.right
  const volH = 60
  const chartH = h - pad.top - pad.bottom - volH - 10

  // Parse klines
  const parsed = klines.map(k => {
    if (typeof k === 'string') {
      const p = k.split(',')
      return { date: p[0], open: +p[1], close: +p[2], high: +p[3], low: +p[4], vol: +p[5] }
    }
    return { 
      date: k.date || k.trade_date, 
      open: k.open, close: k.close, high: k.high, low: k.low, 
      vol: k.volume || k.vol || 0 
    }
  }).filter(k => k.close > 0)

  if (parsed.length === 0) return

  const allPrices = parsed.flatMap(k => [k.high, k.low])
  let minP = Math.min(...allPrices)
  let maxP = Math.max(...allPrices)
  const pPad = (maxP - minP) * 0.05 || 1
  minP -= pPad
  maxP += pPad
  const maxVol = Math.max(...parsed.map(k => k.vol)) || 1

  // Background
  ctx.fillStyle = '#FFFFFF'
  ctx.fillRect(0, 0, w, h)

  // Grid
  ctx.strokeStyle = 'rgba(0,0,0,0.06)'
  ctx.lineWidth = 0.5
  for (let i = 0; i <= 4; i++) {
    const y = pad.top + (chartH / 4) * i
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(pad.left + chartW, y); ctx.stroke()
  }

  // Candlesticks
  const candleW = Math.max(2, (chartW / parsed.length) * 0.7)
  const gap = chartW / parsed.length

  parsed.forEach((k, i) => {
    const x = pad.left + i * gap + gap / 2
    const isUp = k.close >= k.open
    const color = isUp ? '#EF4444' : '#22C55E'

    // High-Low line (shadow)
    const yHigh = pad.top + (1 - (k.high - minP) / (maxP - minP)) * chartH
    const yLow = pad.top + (1 - (k.low - minP) / (maxP - minP)) * chartH
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x, yHigh); ctx.lineTo(x, yLow); ctx.stroke()

    // Body
    const yOpen = pad.top + (1 - (k.open - minP) / (maxP - minP)) * chartH
    const yClose = pad.top + (1 - (k.close - minP) / (maxP - minP)) * chartH
    const bodyTop = Math.min(yOpen, yClose)
    const bodyH = Math.max(1, Math.abs(yOpen - yClose))

    ctx.fillStyle = color
    if (isUp) {
      ctx.strokeStyle = color
      ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH)
    } else {
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH)
    }

    // Volume bar
    const volTop = h - pad.bottom - (k.vol / maxVol) * volH
    ctx.fillStyle = isUp ? 'rgba(239,68,68,0.5)' : 'rgba(34,197,94,0.5)'
    ctx.fillRect(x - candleW / 2, volTop, candleW, h - pad.bottom - volTop)
  })

  // MA lines (5, 10, 20)
  const drawMA = (period, color) => {
    ctx.beginPath()
    ctx.strokeStyle = color
    ctx.lineWidth = 1
    for (let i = period - 1; i < parsed.length; i++) {
      let sum = 0
      for (let j = 0; j < period; j++) sum += parsed[i - j].close
      const avg = sum / period
      const x = pad.left + i * gap + gap / 2
      const y = pad.top + (1 - (avg - minP) / (maxP - minP)) * chartH
      if (i === period - 1) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  if (parsed.length >= 5) drawMA(5, '#F59E0B')
  if (parsed.length >= 10) drawMA(10, '#3B82F6')
  if (parsed.length >= 20) drawMA(20, '#A855F7')

  // Y-axis labels
  ctx.fillStyle = 'rgba(0,0,0,0.45)'
  ctx.font = '10px monospace'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const price = maxP - ((maxP - minP) / 4) * i
    ctx.fillText(price.toFixed(2), pad.left - 6, pad.top + (chartH / 4) * i + 3)
  }

  // X-axis labels
  ctx.textAlign = 'center'
  const xStep = Math.max(1, Math.floor(parsed.length / 6))
  for (let i = 0; i < parsed.length; i += xStep) {
    const x = pad.left + i * gap + gap / 2
    const date = parsed[i].date || ''
    ctx.fillText(date.substring(5, 10), x, h - pad.bottom + 15)
  }

  // Legend
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'left'
  ctx.fillStyle = '#F59E0B'
  ctx.fillRect(pad.left, 8, 12, 3); ctx.fillText('MA5', pad.left + 16, 13)
  ctx.fillStyle = '#3B82F6'
  ctx.fillRect(pad.left + 50, 8, 12, 3); ctx.fillText('MA10', pad.left + 66, 13)
  ctx.fillStyle = '#A855F7'
  ctx.fillRect(pad.left + 110, 8, 12, 3); ctx.fillText('MA20', pad.left + 126, 13)
}

// ==================== Chip Peak Tab (日K筹码峰) ====================

function ChipPeakTab({ loading, data }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" />加载中...
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <BarChart3 size={24} className="mr-2 opacity-40" />暂无日K筹码峰数据
      </div>
    )
  }

  const klines = data.klines || []
  const chips = data.chips || []
  const summary = data.summary || {}

  if (klines.length === 0) {
    return <div className="flex items-center justify-center h-[400px] text-gray-400 text-sm">暂无K线筹码数据</div>
  }

  return <AIChipPeakChart klines={klines} chips={chips} summary={summary} />
}

// ==================== AI Chip Peak Chart (matches WatchlistPage ChipPeakChart) ====================

function AIChipPeakChart({ klines, chips, summary }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const [hoveredIdx, setHoveredIdx] = useState(null)
  const [tooltipData, setTooltipData] = useState(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // ResizeObserver for responsive canvas
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(container)
    setContainerWidth(container.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  // Display last 60 klines
  const displayKlines = useMemo(() => klines.slice(-60), [klines])

  // Calculate MA lines
  const maData = useMemo(() => {
    const calcMA = (data, period) => {
      return data.map((_, i) => {
        if (i < period - 1) return null
        let sum = 0
        for (let j = i - period + 1; j <= i; j++) sum += data[j].close
        return sum / period
      })
    }
    return {
      ma5: calcMA(displayKlines, 5),
      ma10: calcMA(displayKlines, 10),
      ma20: calcMA(displayKlines, 20),
    }
  }, [displayKlines])

  // Price range
  const priceRange = useMemo(() => {
    if (displayKlines.length === 0) return { min: 0, max: 1 }
    let min = Infinity, max = -Infinity
    displayKlines.forEach(k => {
      if (k.low < min) min = k.low
      if (k.high > max) max = k.high
    })
    const padding = (max - min) * 0.05
    return { min: min - padding, max: max + padding }
  }, [displayKlines])

  // Volume range
  const volRange = useMemo(() => {
    if (displayKlines.length === 0) return { max: 1 }
    let max = 0
    displayKlines.forEach(k => { if (k.volume > max) max = k.volume })
    return { max: max || 1 }
  }, [displayKlines])

  // Draw the chart on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || displayKlines.length === 0) return
    const container = containerRef.current
    if (!container) return

    const dpr = window.devicePixelRatio || 1
    const W = containerWidth || 800
    const H = 380
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'

    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, W, H)

    // Layout: kline area (left 72%), chip area (right 28%), volume bar below
    const klineW = Math.floor(W * 0.72)
    const chipW = W - klineW
    const klineH = 270
    const volH = 60
    const gapH = 10
    const padL = 55
    const padR = 5
    const padT = 20
    const padB = 20

    const kDrawW = klineW - padL - padR
    const kDrawH = klineH - padT - padB

    // ===== Background =====
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, W, H)

    // ===== Grid lines =====
    ctx.strokeStyle = 'rgba(0,0,0,0.06)'
    ctx.lineWidth = 0.5
    const numGridH = 5
    for (let i = 0; i <= numGridH; i++) {
      const y = padT + (kDrawH / numGridH) * i
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(klineW - padR, y)
      ctx.stroke()
    }

    // ===== Y-axis labels (price) =====
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    for (let i = 0; i <= numGridH; i++) {
      const y = padT + (kDrawH / numGridH) * i
      const price = priceRange.max - ((priceRange.max - priceRange.min) / numGridH) * i
      ctx.fillText(price.toFixed(2), padL - 4, y + 3)
    }

    // Helper: price to Y
    const priceToY = (price) => {
      return padT + ((priceRange.max - price) / (priceRange.max - priceRange.min)) * kDrawH
    }

    // ===== Candlestick Chart =====
    const barW = Math.max(2, Math.floor(kDrawW / displayKlines.length) - 1)
    const barGap = (kDrawW - barW * displayKlines.length) / (displayKlines.length + 1)

    displayKlines.forEach((k, i) => {
      const x = padL + barGap + (barW + barGap) * i
      const isUp = k.close >= k.open
      const bodyTop = priceToY(Math.max(k.open, k.close))
      const bodyBot = priceToY(Math.min(k.open, k.close))
      const bodyH = Math.max(1, bodyBot - bodyTop)
      const wickTop = priceToY(k.high)
      const wickBot = priceToY(k.low)
      const cx = x + barW / 2

      // Wick
      ctx.strokeStyle = isUp ? '#ef4444' : '#22c55e'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, wickTop)
      ctx.lineTo(cx, wickBot)
      ctx.stroke()

      // Body
      ctx.fillStyle = isUp ? '#ef4444' : '#22c55e'
      if (bodyH <= 1) {
        ctx.fillRect(x, bodyTop, barW, 1)
      } else {
        ctx.fillRect(x, bodyTop, barW, bodyH)
      }
    })

    // ===== MA Lines =====
    const drawMA = (maArr, color) => {
      ctx.strokeStyle = color
      ctx.lineWidth = 1
      ctx.beginPath()
      let started = false
      maArr.forEach((v, i) => {
        if (v === null) return
        const x = padL + barGap + (barW + barGap) * i + barW / 2
        const y = priceToY(v)
        if (!started) { ctx.moveTo(x, y); started = true }
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
    }

    drawMA(maData.ma5, '#f59e0b')
    drawMA(maData.ma10, '#3b82f6')
    drawMA(maData.ma20, '#a855f7')

    // ===== MA Legend =====
    ctx.font = '9px sans-serif'
    const legends = [
      { label: 'MA5', color: '#f59e0b', val: maData.ma5[maData.ma5.length - 1] },
      { label: 'MA10', color: '#3b82f6', val: maData.ma10[maData.ma10.length - 1] },
      { label: 'MA20', color: '#a855f7', val: maData.ma20[maData.ma20.length - 1] },
    ]
    let lx = padL + 5
    legends.forEach(l => {
      if (l.val === null) return
      ctx.fillStyle = l.color
      ctx.fillRect(lx, 5, 12, 6)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.textAlign = 'left'
      ctx.fillText(`${l.label}:${l.val.toFixed(2)}`, lx + 15, 11)
      lx += 95
    })

    // ===== Average cost reference line =====
    if (summary.avg_cost > 0 && summary.avg_cost >= priceRange.min && summary.avg_cost <= priceRange.max) {
      const y = priceToY(summary.avg_cost)
      ctx.strokeStyle = 'rgba(245,158,11,0.6)'
      ctx.lineWidth = 1
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(klineW - padR, y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.fillStyle = '#f59e0b'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('成本' + summary.avg_cost.toFixed(2), klineW - padR - 70, y - 3)
    }

    // ===== X-axis date labels =====
    ctx.fillStyle = 'rgba(0,0,0,0.4)'
    ctx.font = '8px monospace'
    ctx.textAlign = 'center'
    const labelInterval = Math.max(1, Math.floor(displayKlines.length / 6))
    displayKlines.forEach((k, i) => {
      if (i % labelInterval === 0 || i === displayKlines.length - 1) {
        const x = padL + barGap + (barW + barGap) * i + barW / 2
        ctx.fillText(k.date?.slice(5) || '', x, klineH - 2)
      }
    })

    // ===== Volume Bars =====
    const volTop = klineH + gapH
    const volDrawH = volH - 10
    displayKlines.forEach((k, i) => {
      const x = padL + barGap + (barW + barGap) * i
      const isUp = k.close >= k.open
      const h2 = Math.max(1, (k.volume / volRange.max) * volDrawH)
      ctx.fillStyle = isUp ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)'
      ctx.fillRect(x, volTop + volDrawH - h2, barW, h2)
    })

    // VOL label
    ctx.fillStyle = 'rgba(0,0,0,0.3)'
    ctx.font = '8px sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText('VOL', padL, volTop + 8)

    // ===== Chip Peak Distribution (right side) =====
    if (chips.length > 0) {
      const chipX = klineW
      const chipDrawW = chipW - 10
      const chipDrawH = kDrawH
      const chipTop = padT

      const maxPct = Math.max(...chips.map(c => c.percent || 0), 0.001)
      const latestPrice = summary.latest_price || displayKlines[displayKlines.length - 1]?.close || 0

      // Separator line
      ctx.strokeStyle = 'rgba(0,0,0,0.1)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(chipX, padT)
      ctx.lineTo(chipX, padT + kDrawH)
      ctx.stroke()

      // Label
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.font = '9px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('筹码分布', chipX + chipDrawW / 2 + 5, 11)

      // Draw each chip bar
      const profitGrad = ctx.createLinearGradient(chipX, 0, chipX + chipDrawW, 0)
      profitGrad.addColorStop(0, 'rgba(239, 68, 68, 0.2)')
      profitGrad.addColorStop(1, 'rgba(239, 68, 68, 0.9)')

      const lossGrad = ctx.createLinearGradient(chipX, 0, chipX + chipDrawW, 0)
      lossGrad.addColorStop(0, 'rgba(59, 130, 246, 0.2)')
      lossGrad.addColorStop(1, 'rgba(59, 130, 246, 0.85)')

      chips.forEach((chip) => {
        const price = chip.price || 0
        if (price < priceRange.min || price > priceRange.max) return

        const y = priceToY(price)
        const barHeight = Math.max(1.5, chipDrawH / chips.length * 0.85)
        const barLength = (chip.percent / maxPct) * chipDrawW * 0.85

        const isProfit = price <= latestPrice
        const barX2 = chipX + chipDrawW + 5 - barLength

        ctx.fillStyle = isProfit ? profitGrad : lossGrad
        ctx.fillRect(barX2, y - barHeight / 2, barLength, barHeight)
      })

      // Current price line across chip area
      if (latestPrice >= priceRange.min && latestPrice <= priceRange.max) {
        const priceY = priceToY(latestPrice)
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'
        ctx.lineWidth = 0.5
        ctx.setLineDash([3, 2])
        ctx.beginPath()
        ctx.moveTo(chipX, priceY)
        ctx.lineTo(W, priceY)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 9px monospace'
        ctx.textAlign = 'right'
        ctx.fillText(latestPrice.toFixed(2), W - 2, priceY - 3)
      }
    }

    // ===== Hover highlight =====
    if (hoveredIdx !== null && hoveredIdx >= 0 && hoveredIdx < displayKlines.length) {
      const x = padL + barGap + (barW + barGap) * hoveredIdx + barW / 2
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'
      ctx.lineWidth = 0.5
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(x, padT)
      ctx.lineTo(x, H)
      ctx.stroke()
      ctx.setLineDash([])
    }

  }, [displayKlines, chips, summary, priceRange, volRange, maData, hoveredIdx, containerWidth])

  // Handle mouse move for tooltip
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const W = rect.width
    const klineW = Math.floor(W * 0.72)
    const padL = 55
    const padR = 5
    const kDrawW = klineW - padL - padR
    const barW = Math.max(2, Math.floor(kDrawW / displayKlines.length) - 1)
    const barGap = (kDrawW - barW * displayKlines.length) / (displayKlines.length + 1)

    if (x >= padL && x <= klineW - padR) {
      const idx = Math.floor((x - padL) / (barW + barGap))
      if (idx >= 0 && idx < displayKlines.length) {
        setHoveredIdx(idx)
        setTooltipData(displayKlines[idx])
        return
      }
    }
    setHoveredIdx(null)
    setTooltipData(null)
  }, [displayKlines])

  const handleMouseLeave = useCallback(() => {
    setHoveredIdx(null)
    setTooltipData(null)
  }, [])

  return (
    <div className="space-y-3">
      {/* Summary stats bar */}
      {summary.avg_cost > 0 && (
        <div className="grid grid-cols-5 gap-1.5 p-2.5 rounded-xl border border-gray-200" style={{ background: '#F8F9FB' }}>
          <div className="text-center">
            <p className="text-[9px] text-gray-400">获利比例</p>
            <p className="text-xs font-bold text-red-600">{summary.profit_ratio?.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-400">平均成本</p>
            <p className="text-xs font-bold text-amber-600">{summary.avg_cost?.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-400">90%筹码</p>
            <p className="text-xs font-bold text-blue-600">{summary.chip_low_90?.toFixed(2)}-{summary.chip_high_90?.toFixed(2)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-400">集中度</p>
            <p className="text-xs font-bold text-purple-600">{summary.concentration?.toFixed(1)}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] text-gray-400">最新价</p>
            <p className="text-xs font-bold text-gray-900">{summary.latest_price?.toFixed(2)}</p>
          </div>
        </div>
      )}

      {/* Main chart area: Canvas-based K-line + Chip Peak */}
      <div ref={containerRef} className="relative rounded-xl overflow-hidden border border-gray-200" style={{ background: '#FFFFFF' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: 'crosshair', display: 'block', width: '100%', height: '380px' }}
        />

        {/* Floating tooltip */}
        {tooltipData && (
          <div className="absolute top-2 left-14 bg-white/95 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] space-y-0.5 pointer-events-none z-10 shadow-md backdrop-blur-sm">
            <div className="text-gray-700 font-medium">{tooltipData.date}</div>
            <div className="flex gap-3">
              <span className="text-gray-500">开:<span className={tooltipData.close >= tooltipData.open ? 'text-red-600' : 'text-green-600'}>{tooltipData.open?.toFixed(2)}</span></span>
              <span className="text-gray-500">收:<span className={tooltipData.close >= tooltipData.open ? 'text-red-600' : 'text-green-600'}>{tooltipData.close?.toFixed(2)}</span></span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">高:<span className="text-red-600">{tooltipData.high?.toFixed(2)}</span></span>
              <span className="text-gray-500">低:<span className="text-green-600">{tooltipData.low?.toFixed(2)}</span></span>
            </div>
            <div className="flex gap-3">
              <span className="text-gray-500">量:<span className="text-gray-700">{(tooltipData.volume / 10000).toFixed(0)}万</span></span>
              {tooltipData.change_pct !== undefined && (
                <span className="text-gray-500">幅:<span className={tooltipData.change_pct >= 0 ? 'text-red-600' : 'text-green-600'}>{tooltipData.change_pct >= 0 ? '+' : ''}{tooltipData.change_pct?.toFixed(2)}%</span></span>
              )}
            </div>
          </div>
        )}

        {/* Chip legend */}
        <div className="absolute bottom-1 right-2 flex items-center gap-3 text-[8px]">
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(239,68,68,0.85)' }}></span><span className="text-gray-500">获利筹码</span></span>
          <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: 'rgba(59,130,246,0.75)' }}></span><span className="text-gray-500">套牢筹码</span></span>
        </div>
      </div>
    </div>
  )
}

// ==================== Guba Tab ====================

function GubaTab({ loading, data }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[400px] text-gray-400">
        <RefreshCw size={20} className="animate-spin mr-2" />加载中...
      </div>
    )
  }

  const posts = data?.posts || data?.items || []
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
        <MessageSquare size={28} className="mb-2 opacity-40" />
        <span>暂无股吧讨论数据</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 mb-3">最新股吧讨论 ({posts.length} 条)</p>
      {posts.map((post, i) => (
        <div key={i} className="p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 font-medium truncate">{post.title || post.content || '无标题'}</p>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-400">
                <span>{post.author || '匿名'}</span>
                <span>{post.time || post.created_at || ''}</span>
                {post.read_count && <span>阅读 {post.read_count}</span>}
                {post.comment_count && <span>评论 {post.comment_count}</span>}
              </div>
            </div>
            {post.sentiment && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                post.sentiment === 'positive' ? 'bg-red-100 text-red-600' :
                post.sentiment === 'negative' ? 'bg-green-100 text-green-600' :
                'bg-gray-100 text-gray-500'}`}>
                {post.sentiment === 'positive' ? '看多' : post.sentiment === 'negative' ? '看空' : '中性'}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
