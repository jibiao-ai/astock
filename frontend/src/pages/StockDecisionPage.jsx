import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock, BarChart3, Brain, Activity, Loader2, ChevronRight, Target, Shield, Zap, ExternalLink, Newspaper } from 'lucide-react'
import { analyzeStock, getDecisionHistory, getMarketReview, runMarketReview, getStockNews } from '../services/api'
import toast from 'react-hot-toast'

// ==================== Sentiment Gauge ====================
function SentimentGauge({ score = 50, size = 160 }) {
  const radius = size * 0.38
  const strokeWidth = size * 0.065
  const center = size / 2
  const startAngle = 135
  const endAngle = 405
  const totalAngle = endAngle - startAngle
  const scoreAngle = startAngle + (score / 100) * totalAngle

  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const rad = (angleDeg - 90) * Math.PI / 180
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) }
  }

  const arcPath = (start, end) => {
    const s = polarToCartesian(center, center, radius, start)
    const e = polarToCartesian(center, center, radius, end)
    const largeArc = end - start > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`
  }

  const getColor = (s) => {
    if (s >= 70) return '#16A34A'
    if (s >= 50) return '#513CC8'
    if (s >= 30) return '#D97706'
    return '#DC2626'
  }

  const getLabel = (s) => {
    if (s >= 70) return '乐观'
    if (s >= 50) return '中性'
    if (s >= 30) return '谨慎'
    return '恐慌'
  }

  return (
    <div className="flex flex-col items-center">
      <p className="text-[10px] text-gray-400 mb-1 tracking-widest uppercase font-medium">Market Sentiment</p>
      <svg width={size} height={size * 0.62}>
        {/* Background track */}
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} strokeLinecap="round" />
        {/* Colored progress */}
        <path d={arcPath(startAngle, scoreAngle)} fill="none" stroke={`url(#gauge-grad-${score})`} strokeWidth={strokeWidth} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${getColor(score)}40)` }} />
        <defs>
          <linearGradient id={`gauge-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getColor(score)} stopOpacity="0.5" />
            <stop offset="100%" stopColor={getColor(score)} />
          </linearGradient>
        </defs>
        {/* Score */}
        <text x={center} y={center * 0.82} textAnchor="middle" fill="#111827" style={{ fontSize: size * 0.22, fontWeight: 800 }}>{score}</text>
        {/* Label */}
        <text x={center} y={center * 1.1} textAnchor="middle" style={{ fontSize: size * 0.085, fill: getColor(score), fontWeight: 600 }}>{getLabel(score)}</text>
      </svg>
    </div>
  )
}

// ==================== Market Review Panel ====================
function MarketReviewPanel({ review, loading, onRefresh }) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center min-h-[200px]">
        <Loader2 className="animate-spin" size={22} style={{ color: '#513CC8' }} />
        <span className="ml-2 text-gray-500 text-sm">生成大盘复盘中...</span>
      </div>
    )
  }

  if (!review) return null

  let hotSectors = []
  try {
    hotSectors = review.hot_sectors ? JSON.parse(review.hot_sectors) : []
  } catch (e) { /* ignore */ }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={15} style={{ color: '#513CC8' }} />
          <span style={{ color: '#513CC8' }} className="tracking-wider text-[10px] uppercase font-semibold">MARKET REVIEW</span>
          <span className="text-gray-900 text-sm ml-1">大盘复盘</span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400">{review.trade_date}</span>
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#513CC8] transition">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Index cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label: '上证指数', value: review.index_sh, pct: review.index_sh_pct },
          { label: '深证成指', value: review.index_sz, pct: review.index_sz_pct },
          { label: '创业板指', value: review.index_cyb, pct: review.index_cyb_pct },
        ].map(idx => (
          <div key={idx.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
            <p className="text-[10px] text-gray-500 mb-1">{idx.label}</p>
            <p className="text-sm font-bold text-gray-900">{idx.value?.toFixed(2) || '--'}</p>
            <p className={`text-xs font-semibold ${(idx.pct || 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
              {(idx.pct || 0) >= 0 ? '+' : ''}{(idx.pct || 0).toFixed(2)}%
            </p>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: '上涨', value: review.up_count, color: 'text-red-500' },
          { label: '下跌', value: review.down_count, color: 'text-green-600' },
          { label: '涨停', value: review.limit_up, color: 'text-red-600' },
          { label: '最高板', value: `${review.highest_board || 0}板`, color: 'text-[#513CC8]' },
        ].map(s => (
          <div key={s.label} className="text-center py-2 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-[10px] text-gray-500">{s.label}</p>
            <p className={`text-sm font-bold ${s.color}`}>{s.value || 0}</p>
          </div>
        ))}
      </div>

      {/* AI Summary */}
      {review.summary && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100 mb-3">
          <p className="text-xs text-gray-600 leading-relaxed">{review.summary}</p>
        </div>
      )}

      {/* Suggestion + Trend badges */}
      <div className="flex items-center gap-3">
        {review.suggestion && (
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            review.suggestion === '加仓' ? 'bg-red-50 text-red-600 border-red-200' :
            review.suggestion === '减仓' ? 'bg-green-50 text-green-600 border-green-200' :
            'bg-amber-50 text-amber-600 border-amber-200'
          }`}>
            操作: {review.suggestion}
          </span>
        )}
        {review.market_trend && (
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            review.market_trend === '多头' ? 'bg-red-50 text-red-600 border-red-200' :
            review.market_trend === '空头' ? 'bg-green-50 text-green-600 border-green-200' :
            'bg-purple-50 text-[#513CC8] border-purple-200'
          }`}>
            趋势: {review.market_trend}
          </span>
        )}
      </div>

      {/* Hot sectors */}
      {hotSectors.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {hotSectors.slice(0, 5).map((s, i) => (
            <span key={i} className="px-2 py-0.5 bg-purple-50 text-[#513CC8] text-[10px] rounded border border-purple-200 font-medium">
              {s.name} {s.change_pct > 0 ? '+' : ''}{(s.change_pct || 0).toFixed(1)}%
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== News Feed Panel ====================
function NewsFeedPanel({ code, news, loading, onRefresh }) {
  if (!code) return null

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <Newspaper size={15} style={{ color: '#513CC8' }} />
          <span style={{ color: '#513CC8' }} className="tracking-wider text-[10px] uppercase font-semibold">NEWS FEED</span>
          <span className="text-gray-900 text-sm ml-1">相关资讯</span>
        </h3>
        <button onClick={onRefresh} className="text-[10px] text-gray-400 hover:text-[#513CC8] transition flex items-center gap-1">
          <RefreshCw size={11} /> 刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin" size={18} style={{ color: '#513CC8' }} />
          <span className="ml-2 text-gray-500 text-xs">加载资讯...</span>
        </div>
      ) : (
        <div className="space-y-2">
          {(news || []).slice(0, 6).map((item, i) => (
            <a
              key={i}
              href={item.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-800 group-hover:text-[#513CC8] transition truncate leading-relaxed">
                  {item.title}
                </p>
                {item.summary && (
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-1">{item.summary}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5">
                  {item.source && <span className="text-[9px] text-gray-400">{item.source}</span>}
                  {item.date && <span className="text-[9px] text-gray-400">{item.date}</span>}
                </div>
              </div>
              <ExternalLink size={12} className="text-gray-300 group-hover:text-[#513CC8] transition shrink-0 mt-1" />
            </a>
          ))}
          {(!news || news.length === 0) && (
            <p className="text-xs text-gray-400 text-center py-4">暂无相关资讯</p>
          )}
        </div>
      )}
    </div>
  )
}

// ==================== Main Page ====================
export default function StockDecisionPage() {
  const [code, setCode] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentDecision, setCurrentDecision] = useState(null)
  const [history, setHistory] = useState([])
  const [review, setReview] = useState(null)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [news, setNews] = useState([])
  const [newsLoading, setNewsLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    loadHistory()
    loadMarketReview()
  }, [])

  const loadHistory = async () => {
    try {
      const res = await getDecisionHistory()
      if (res?.data) setHistory(res.data)
    } catch (e) { /* silent */ }
  }

  const loadMarketReview = async () => {
    setReviewLoading(true)
    try {
      const res = await getMarketReview()
      if (res?.data) setReview(res.data)
    } catch (e) { /* silent */ }
    setReviewLoading(false)
  }

  const loadNews = async (stockCode) => {
    if (!stockCode) return
    setNewsLoading(true)
    try {
      const res = await getStockNews({ code: stockCode })
      if (res?.data) setNews(res.data)
    } catch (e) { /* silent */ }
    setNewsLoading(false)
  }

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast.error('请输入股票代码')
      return
    }
    setAnalyzing(true)
    try {
      const res = await analyzeStock({ code: code.trim() })
      if (res?.data) {
        setCurrentDecision(res.data)
        loadHistory()
        loadNews(code.trim())
        toast.success('分析完成')
      }
    } catch (e) {
      toast.error('分析失败: ' + (e.response?.data?.message || '网络错误'))
    }
    setAnalyzing(false)
  }

  const handleRefreshReview = async () => {
    setReviewLoading(true)
    try {
      const res = await runMarketReview()
      if (res?.data) setReview(res.data)
      toast.success('大盘复盘已更新')
    } catch (e) {
      toast.error('更新失败')
    }
    setReviewLoading(false)
  }

  const selectFromHistory = (item) => {
    setCurrentDecision(item)
    setCode(item.code)
    loadNews(item.code)
  }

  const getSuggestionStyle = (suggestion) => {
    switch (suggestion) {
      case '买入': return { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200' }
      case '加仓': return { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200' }
      case '卖出': return { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200' }
      default: return { bg: 'bg-purple-50', text: 'text-[#513CC8]', border: 'border-purple-200' }
    }
  }

  const getTrendStyle = (trend) => {
    switch (trend) {
      case '上涨': case '反弹': return { text: 'text-red-500' }
      case '下跌': return { text: 'text-green-600' }
      default: return { text: 'text-[#513CC8]' }
    }
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: '#F8F9FB', minHeight: '100vh' }}>
      {/* Disclaimer Banner */}
      <div className="border-b border-purple-100" style={{ background: '#F0EDFA' }}>
        <div className="flex items-center gap-2 max-w-7xl mx-auto px-6 py-2.5">
          <AlertTriangle size={14} className="text-amber-500 shrink-0" />
          <p className="text-xs text-gray-600">
            <span className="font-semibold text-[#513CC8]">风险提示：</span>AI只能提供决策意向，具体买卖需要智慧参与。投资有风险，入市需谨慎。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* Search Bar */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={inputRef}
              value={code}
              onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="输入股票代码，如 600519、000001、300750"
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 transition shadow-sm"
            />
          </div>
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="px-6 py-3 text-white text-sm font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition flex items-center gap-2 shadow-md"
            style={{ background: '#513CC8' }}
          >
            {analyzing ? <Loader2 size={16} className="animate-spin" /> : <Brain size={16} />}
            {analyzing ? '分析中...' : '分析'}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel: History */}
          <div className="lg:col-span-3 space-y-4">
            {/* Current Task */}
            {analyzing && (
              <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#513CC8' }} />
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">分析任务</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border border-purple-100">
                  <Loader2 size={12} className="animate-spin" style={{ color: '#513CC8' }} />
                  <span className="text-xs text-gray-700">{code} 分析中...</span>
                </div>
              </div>
            )}

            {/* History */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={13} className="text-gray-400" />
                <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">历史记录</h3>
              </div>
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                {history.length === 0 && (
                  <p className="text-[10px] text-gray-400 text-center py-6">暂无分析记录</p>
                )}
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => selectFromHistory(item)}
                    className={`w-full text-left p-2.5 rounded-lg border transition group ${
                      currentDecision?.id === item.id 
                        ? 'bg-purple-50 border-purple-200' 
                        : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-900 truncate">{item.name || item.code}</p>
                        <p className="text-[9px] text-gray-400 mt-0.5">{item.code} · {item.trade_date}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-2 shrink-0 ${
                        item.sentiment >= 60 ? 'bg-green-50 text-green-600 border border-green-200' :
                        item.sentiment >= 40 ? 'bg-purple-50 text-[#513CC8] border border-purple-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                        {item.sentiment || '--'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-9 space-y-4">
            {currentDecision ? (
              <>
                {/* Stock Header Card */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Stock info + Insights */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                        <h2 className="text-xl font-bold text-gray-900">{currentDecision.name}</h2>
                        <span className="text-lg font-bold" style={{ color: '#513CC8' }}>{currentDecision.price?.toFixed(2)}</span>
                        <span className={`text-sm font-semibold ${currentDecision.change_pct >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                          {currentDecision.change_pct >= 0 ? '+' : ''}{currentDecision.change_pct?.toFixed(2)}%
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 mb-4">{currentDecision.code} · {currentDecision.trade_date}</p>

                      {/* KEY INSIGHTS */}
                      <div className="mb-4">
                        <p className="text-[10px] tracking-wider uppercase mb-2 font-semibold" style={{ color: '#513CC8' }}>KEY INSIGHTS</p>
                        <p className="text-xs text-gray-600 leading-relaxed">{currentDecision.insights}</p>
                      </div>

                      {/* Suggestion + Trend badges */}
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border ${getSuggestionStyle(currentDecision.suggestion).bg} ${getSuggestionStyle(currentDecision.suggestion).border}`}>
                          <Shield size={14} className={getSuggestionStyle(currentDecision.suggestion).text} />
                          <div>
                            <p className="text-[9px] text-gray-500">操作建议</p>
                            <p className={`text-sm font-bold ${getSuggestionStyle(currentDecision.suggestion).text}`}>
                              {currentDecision.suggestion || '观望'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                          <Activity size={14} className={getTrendStyle(currentDecision.trend).text} />
                          <div>
                            <p className="text-[9px] text-gray-500">趋势预测</p>
                            <p className={`text-sm font-bold ${getTrendStyle(currentDecision.trend).text}`}>
                              {currentDecision.trend || '震荡'}
                            </p>
                          </div>
                        </div>
                        {currentDecision.reason && (
                          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 rounded-lg border border-amber-200">
                            <Zap size={14} className="text-amber-600" />
                            <div>
                              <p className="text-[9px] text-gray-500">关键因素</p>
                              <p className="text-[11px] font-medium text-amber-700">{currentDecision.reason}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Sentiment Gauge */}
                    <div className="shrink-0 hidden md:block">
                      <SentimentGauge score={currentDecision.sentiment || 50} size={160} />
                    </div>
                  </div>
                </div>

                {/* Strategy Points */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h3 className="text-[10px] tracking-wider uppercase mb-4 font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
                    <Target size={14} />
                    STRATEGY POINTS <span className="text-gray-900 text-sm ml-1 normal-case">狙击点位</span>
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: '理想买入', value: currentDecision.buy_price_1, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', topColor: '#16A34A' },
                      { label: '二次买入', value: currentDecision.buy_price_2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', topColor: '#2563EB' },
                      { label: '止损价位', value: currentDecision.stop_loss, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', topColor: '#DC2626' },
                      { label: '止盈目标', value: currentDecision.take_profit, color: 'text-[#513CC8]', bg: 'bg-purple-50', border: 'border-purple-200', topColor: '#513CC8' },
                    ].map(point => (
                      <div key={point.label} className={`${point.bg} rounded-lg p-4 border ${point.border} text-center relative overflow-hidden`}>
                        <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: point.topColor }} />
                        <p className="text-[10px] text-gray-500 mb-2 mt-1">{point.label}</p>
                        <p className={`text-xl font-bold ${point.color}`}>
                          {point.value?.toFixed(2) || '--'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Gauge for mobile */}
                <div className="block md:hidden bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex justify-center">
                  <SentimentGauge score={currentDecision.sentiment || 50} size={200} />
                </div>

                {/* News Feed */}
                <NewsFeedPanel
                  code={currentDecision.code}
                  news={news}
                  loading={newsLoading}
                  onRefresh={() => loadNews(currentDecision.code)}
                />
              </>
            ) : (
              /* Empty state */
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F0EDFA' }}>
                  <Brain size={32} style={{ color: '#513CC8' }} />
                </div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">输入股票代码开始AI分析</h3>
                <p className="text-sm text-gray-400 mb-6">AI将为您提供个股分析、买卖建议和策略点位</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    { code: '600519', name: '贵州茅台' },
                    { code: '000001', name: '平安银行' },
                    { code: '300750', name: '宁德时代' },
                    { code: '601318', name: '中国平安' },
                    { code: '000858', name: '五粮液' },
                  ].map(c => (
                    <button
                      key={c.code}
                      onClick={() => { setCode(c.code); }}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 hover:text-[#513CC8] hover:border-purple-200 hover:bg-purple-50 transition"
                    >
                      <span className="font-medium">{c.code}</span>
                      <span className="text-gray-400 ml-1">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Market Review - always visible below */}
            <MarketReviewPanel review={review} loading={reviewLoading} onRefresh={handleRefreshReview} />
          </div>
        </div>
      </div>
    </div>
  )
}
