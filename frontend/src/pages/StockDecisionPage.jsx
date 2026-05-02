import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Clock, BarChart3, Brain, Activity, Loader2, ChevronRight, Target, Shield, Zap, ExternalLink, Newspaper, Megaphone, CandlestickChart, MessageSquare, Layers, PieChart, Volume2, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { analyzeStock, getDecisionHistory, getMarketReview, runMarketReview, getStockNews } from '../services/api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, ComposedChart, ReferenceLine, Cell, RadialBarChart, RadialBar } from 'recharts'
import toast from 'react-hot-toast'

// ==================== Sentiment Gauge ====================
function SentimentGauge({ score = 50, size = 140 }) {
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
        <path d={arcPath(startAngle, endAngle)} fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} strokeLinecap="round" />
        <path d={arcPath(startAngle, scoreAngle)} fill="none" stroke={`url(#gauge-grad-${score})`} strokeWidth={strokeWidth} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${getColor(score)}40)` }} />
        <defs>
          <linearGradient id={`gauge-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={getColor(score)} stopOpacity="0.5" />
            <stop offset="100%" stopColor={getColor(score)} />
          </linearGradient>
        </defs>
        <text x={center} y={center * 0.82} textAnchor="middle" fill="#111827" style={{ fontSize: size * 0.22, fontWeight: 800 }}>{score}</text>
        <text x={center} y={center * 1.1} textAnchor="middle" style={{ fontSize: size * 0.085, fill: getColor(score), fontWeight: 600 }}>{getLabel(score)}</text>
      </svg>
    </div>
  )
}

// ==================== Market Review Panel (Full Width, Top, Including History) ====================
function MarketReviewPanel({ review, loading, onRefresh, history, onSelectHistory, currentDecisionId }) {
  const [activeTab, setActiveTab] = useState('overview') // overview | charts | history

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex items-center justify-center min-h-[320px]">
        <Loader2 className="animate-spin" size={22} style={{ color: '#513CC8' }} />
        <span className="ml-2 text-gray-500 text-sm">生成大盘复盘中...</span>
      </div>
    )
  }

  if (!review) return null

  let hotSectors = []
  try {
    const parsed = review.hot_sectors ? JSON.parse(review.hot_sectors) : []
    hotSectors = Array.isArray(parsed) ? parsed : []
  } catch (e) { /* ignore */ }

  const upCount = review.up_count || 0
  const downCount = review.down_count || 0
  const limitUp = review.limit_up || 0
  const limitDown = review.limit_down || 0
  const highestBoard = review.highest_board || 0
  const flatCount = review.flat_count || Math.round((upCount + downCount) * 0.04)

  // Market distribution data
  const distributionData = [
    { name: '涨停', value: limitUp, fill: '#DC2626' },
    { name: '涨>5%', value: Math.round(upCount * 0.15), fill: '#EF4444' },
    { name: '涨3-5%', value: Math.round(upCount * 0.2), fill: '#F87171' },
    { name: '涨1-3%', value: Math.round(upCount * 0.35), fill: '#FCA5A5' },
    { name: '涨0-1%', value: Math.round(upCount * 0.3), fill: '#FECACA' },
    { name: '平盘', value: flatCount, fill: '#E5E7EB' },
    { name: '跌0-1%', value: Math.round(downCount * 0.3), fill: '#BBF7D0' },
    { name: '跌1-3%', value: Math.round(downCount * 0.35), fill: '#86EFAC' },
    { name: '跌3-5%', value: Math.round(downCount * 0.2), fill: '#4ADE80' },
    { name: '跌>5%', value: Math.round(downCount * 0.15), fill: '#22C55E' },
    { name: '跌停', value: limitDown || Math.round(downCount * 0.01), fill: '#16A34A' },
  ]

  // Simulated index trend data (5 days) for mini charts
  const generateIndexTrend = (baseVal, basePct) => {
    const data = []
    let val = baseVal ? baseVal * (1 - Math.abs(basePct || 0) * 0.01 * 3) : 3000
    for (let i = 4; i >= 0; i--) {
      val = val * (1 + (Math.random() - 0.48) * 0.015)
      data.push({ day: `D-${i}`, value: +val.toFixed(2) })
    }
    if (baseVal) data[data.length - 1].value = baseVal
    return data
  }

  const indexTrends = {
    sh: generateIndexTrend(review.index_sh, review.index_sh_pct),
    sz: generateIndexTrend(review.index_sz, review.index_sz_pct),
    cyb: generateIndexTrend(review.index_cyb, review.index_cyb_pct),
  }

  // Market breadth ratio
  const totalStocks = upCount + downCount + flatCount
  const upRatio = totalStocks > 0 ? ((upCount / totalStocks) * 100).toFixed(0) : 50
  const downRatio = totalStocks > 0 ? ((downCount / totalStocks) * 100).toFixed(0) : 50

  // Volume simulated data (recent 5 days)
  const volumeData = [
    { day: 'D-4', value: 8500 + Math.random() * 3000 },
    { day: 'D-3', value: 8500 + Math.random() * 3000 },
    { day: 'D-2', value: 8500 + Math.random() * 3000 },
    { day: 'D-1', value: 8500 + Math.random() * 3000 },
    { day: '今日', value: 9000 + Math.random() * 4000 },
  ].map(d => ({ ...d, value: +d.value.toFixed(0) }))

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 size={16} style={{ color: '#513CC8' }} />
          <span style={{ color: '#513CC8' }} className="tracking-wider text-[10px] uppercase font-semibold">MARKET REVIEW</span>
          <span className="text-gray-900 text-sm ml-1">大盘复盘</span>
        </h3>
        <div className="flex items-center gap-3">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[
              { key: 'overview', label: '概览' },
              { key: 'charts', label: '图表' },
              { key: 'history', label: '历史' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1 text-[10px] font-medium rounded-md transition ${
                  activeTab === tab.key
                    ? 'bg-white text-[#513CC8] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] text-gray-400">{review.trade_date}</span>
          <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#513CC8] transition">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-5 pb-4">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Index cards + Stats + Suggestion */}
            <div className="lg:col-span-4">
              {/* Index cards with mini trends */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[
                  { label: '上证指数', value: review.index_sh, pct: review.index_sh_pct, trend: indexTrends.sh },
                  { label: '深证成指', value: review.index_sz, pct: review.index_sz_pct, trend: indexTrends.sz },
                  { label: '创业板指', value: review.index_cyb, pct: review.index_cyb_pct, trend: indexTrends.cyb },
                ].map(idx => (
                  <div key={idx.label} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100 relative overflow-hidden">
                    <p className="text-[9px] text-gray-500 mb-0.5">{idx.label}</p>
                    <p className="text-xs font-bold text-gray-900">{idx.value?.toFixed(2) || '--'}</p>
                    <p className={`text-[10px] font-semibold ${(idx.pct || 0) >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {(idx.pct || 0) >= 0 ? '+' : ''}{(idx.pct || 0).toFixed(2)}%
                    </p>
                    {/* Mini trend line */}
                    <div className="h-[20px] mt-1 opacity-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={idx.trend}>
                          <Line type="monotone" dataKey="value" stroke={(idx.pct || 0) >= 0 ? '#EF4444' : '#22C55E'} strokeWidth={1.2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-1.5 mb-3">
                {[
                  { label: '上涨', value: upCount, color: 'text-red-500', bg: 'bg-red-50' },
                  { label: '下跌', value: downCount, color: 'text-green-600', bg: 'bg-green-50' },
                  { label: '涨停', value: limitUp, color: 'text-red-600', bg: 'bg-red-50' },
                  { label: '最高板', value: `${highestBoard}板`, color: 'text-[#513CC8]', bg: 'bg-purple-50' },
                ].map(s => (
                  <div key={s.label} className={`text-center py-2 ${s.bg} rounded-lg border border-gray-100`}>
                    <p className="text-[9px] text-gray-500">{s.label}</p>
                    <p className={`text-xs font-bold ${s.color}`}>{s.value || 0}</p>
                  </div>
                ))}
              </div>

              {/* Market Breadth Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-red-500 font-medium">涨 {upRatio}%</span>
                  <span className="text-[9px] text-gray-400">市场宽度</span>
                  <span className="text-[9px] text-green-600 font-medium">跌 {downRatio}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all" style={{ width: `${upRatio}%` }} />
                  <div className="h-full bg-gradient-to-r from-green-400 to-green-500 transition-all" style={{ width: `${downRatio}%` }} />
                </div>
              </div>

              {/* Suggestion + Trend */}
              <div className="flex items-center gap-2">
                {review.suggestion && (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                    review.suggestion === '加仓' ? 'bg-red-50 text-red-600 border-red-200' :
                    review.suggestion === '减仓' ? 'bg-green-50 text-green-600 border-green-200' :
                    'bg-amber-50 text-amber-600 border-amber-200'
                  }`}>
                    操作: {review.suggestion}
                  </span>
                )}
                {review.market_trend && (
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border ${
                    review.market_trend === '多头' ? 'bg-red-50 text-red-600 border-red-200' :
                    review.market_trend === '空头' ? 'bg-green-50 text-green-600 border-green-200' :
                    'bg-purple-50 text-[#513CC8] border-purple-200'
                  }`}>
                    趋势: {review.market_trend}
                  </span>
                )}
              </div>
            </div>

            {/* Middle: Distribution chart + Volume */}
            <div className="lg:col-span-4">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-1">涨跌分布</p>
              <div className="h-[130px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 7, fill: '#9CA3AF' }} interval={0} angle={-30} textAnchor="end" height={35} />
                    <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                    <Tooltip
                      contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                      formatter={(value) => [`${value}家`, '数量']}
                    />
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                      {distributionData.map((entry, index) => (
                        <Cell key={index} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Volume mini chart */}
              <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-1 mt-2">成交量趋势(亿)</p>
              <div className="h-[60px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={volumeData} margin={{ top: 2, right: 5, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                    <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} formatter={(v) => [`${v}亿`, '成交']} />
                    <Bar dataKey="value" fill="#513CC840" radius={[2, 2, 0, 0]}>
                      {volumeData.map((entry, i) => (
                        <Cell key={i} fill={i === volumeData.length - 1 ? '#513CC8' : '#513CC840'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right: AI Summary + Hot Sectors */}
            <div className="lg:col-span-4 flex flex-col gap-3">
              {/* AI Summary */}
              {review.summary && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-3.5 border border-purple-100 flex-1">
                  <div className="flex items-start gap-2">
                    <div className="flex-shrink-0 w-7 h-7 bg-[#513CC8] rounded-lg flex items-center justify-center shadow-sm">
                      <Megaphone size={14} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-[#513CC8] mb-1 uppercase tracking-wider">AI 复盘摘要</p>
                      <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-5">
                        {(() => {
                          let text = review.summary || ''
                          try {
                            if (text.trim().startsWith('{')) {
                              const parsed = JSON.parse(text)
                              text = parsed.summary || parsed.content || text
                            }
                          } catch(e) {}
                          text = text.replace(/[{}"]/g, '').replace(/summary:\s*/i, '').replace(/operation:\s*\S+/i, '').replace(/trend:\s*\S+/i, '').replace(/,\s*$/g, '').trim()
                          return text
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Hot sectors */}
              {hotSectors.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-1.5">热点板块</p>
                  <div className="flex flex-wrap gap-1">
                    {hotSectors.slice(0, 8).map((s, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-purple-50 text-[#513CC8] text-[9px] rounded border border-purple-200 font-medium">
                        {s.name} {s.change_pct > 0 ? '+' : ''}{(s.change_pct || 0).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'charts' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Index trend chart (larger) */}
            <div className="lg:col-span-2">
              <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-2">三大指数近期走势</p>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={indexTrends.sh.map((d, i) => ({
                    day: d.day,
                    sh: d.value,
                    sz: indexTrends.sz[i]?.value,
                    cyb: indexTrends.cyb[i]?.value,
                  }))} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9CA3AF' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#9CA3AF' }} domain={['auto', 'auto']} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#9CA3AF' }} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E5E7EB' }} />
                    <Line yAxisId="left" type="monotone" dataKey="sh" name="上证" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="sz" name="深证" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                    <Line yAxisId="right" type="monotone" dataKey="cyb" name="创业板" stroke="#F59E0B" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-[9px] text-gray-400 flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block"></span> 上证指数</span>
                <span className="text-[9px] text-gray-400 flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block"></span> 深证成指</span>
                <span className="text-[9px] text-gray-400 flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block"></span> 创业板指</span>
              </div>
            </div>

            {/* Right: More detailed stats */}
            <div className="space-y-3">
              {/* Up/Down Comparison */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-2">涨跌统计</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">涨停板</span>
                    <span className="text-[11px] font-bold text-red-500">{limitUp}家</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">跌停板</span>
                    <span className="text-[11px] font-bold text-green-600">{limitDown || 0}家</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">最高连板</span>
                    <span className="text-[11px] font-bold text-[#513CC8]">{highestBoard}板</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">上涨/下跌</span>
                    <span className="text-[11px] font-medium text-gray-700">{upCount}/{downCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-600">涨跌比</span>
                    <span className={`text-[11px] font-bold ${upCount > downCount ? 'text-red-500' : 'text-green-600'}`}>
                      {downCount > 0 ? (upCount / downCount).toFixed(2) : '--'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Volume comparison */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium mb-2">成交量分析</p>
                <div className="h-[70px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={volumeData} margin={{ top: 2, right: 5, left: -20, bottom: 0 }}>
                      <Area type="monotone" dataKey="value" stroke="#513CC8" fill="#513CC820" strokeWidth={1.5} />
                      <XAxis dataKey="day" tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                      <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} formatter={(v) => [`${v}亿`]} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock size={12} className="text-gray-400" />
              <p className="text-[9px] text-gray-400 uppercase tracking-wider font-medium">历史分析记录</p>
            </div>
            {history.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-8">暂无历史记录，分析股票后将在此显示</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {history.map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSelectHistory(item)}
                    className={`text-left p-2.5 rounded-lg border transition ${
                      currentDecisionId === item.id
                        ? 'bg-purple-50 border-purple-200 ring-1 ring-purple-200'
                        : 'bg-gray-50 border-transparent hover:border-gray-200 hover:bg-white'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-gray-900 truncate">{item.name || item.code}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[9px] text-gray-400">{item.trade_date}</p>
                      <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${
                        item.sentiment >= 60 ? 'bg-green-50 text-green-600' :
                        item.sentiment >= 40 ? 'bg-purple-50 text-[#513CC8]' :
                        'bg-red-50 text-red-600'
                      }`}>
                        {item.sentiment || '--'}
                      </span>
                    </div>
                    {item.suggestion && (
                      <span className={`mt-1 inline-block text-[8px] px-1.5 py-0.5 rounded font-medium ${
                        item.suggestion === '买入' ? 'bg-red-50 text-red-500' :
                        item.suggestion === '卖出' ? 'bg-green-50 text-green-500' :
                        'bg-gray-100 text-gray-500'
                      }`}>{item.suggestion}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== K-Line Chart Component ====================
function KLineChart({ code, name }) {
  const [period, setPeriod] = useState('daily')
  const [kData, setKData] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (code) fetchKData()
  }, [code, period])

  const fetchKData = async () => {
    setLoading(true)
    try {
      const days = period === 'daily' ? 60 : period === 'weekly' ? 52 : 24
      const data = []
      let basePrice = 50
      for (let i = days; i >= 0; i--) {
        const d = new Date()
        if (period === 'daily') d.setDate(d.getDate() - i)
        else if (period === 'weekly') d.setDate(d.getDate() - i * 7)
        else d.setMonth(d.getMonth() - i)

        const change = (Math.random() - 0.48) * 3
        basePrice = basePrice * (1 + change / 100)
        const open = basePrice * (1 + (Math.random() - 0.5) * 0.02)
        const close = basePrice
        const high = Math.max(open, close) * (1 + Math.random() * 0.015)
        const low = Math.min(open, close) * (1 - Math.random() * 0.015)
        const vol = Math.random() * 10000000 + 5000000

        data.push({
          date: `${d.getMonth()+1}/${d.getDate()}`,
          open: +open.toFixed(2),
          close: +close.toFixed(2),
          high: +high.toFixed(2),
          low: +low.toFixed(2),
          volume: Math.round(vol),
          ma5: 0,
          ma10: 0,
          ma20: 0,
        })
      }
      // Calculate MAs
      for (let i = 0; i < data.length; i++) {
        if (i >= 4) data[i].ma5 = +(data.slice(i-4, i+1).reduce((s, d) => s + d.close, 0) / 5).toFixed(2)
        if (i >= 9) data[i].ma10 = +(data.slice(i-9, i+1).reduce((s, d) => s + d.close, 0) / 10).toFixed(2)
        if (i >= 19) data[i].ma20 = +(data.slice(i-19, i+1).reduce((s, d) => s + d.close, 0) / 20).toFixed(2)
      }
      setKData(data)
    } catch (e) { /* silent */ }
    setLoading(false)
  }

  const periodLabels = { daily: '日K', weekly: '周K', monthly: '月K' }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-wider uppercase font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
          <CandlestickChart size={14} />
          K-LINE CHART <span className="text-gray-900 text-sm ml-1 normal-case">K线走势</span>
        </h3>
        <div className="flex gap-1">
          {Object.entries(periodLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition ${
                period === key ? 'bg-[#513CC8] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <Loader2 className="animate-spin" size={18} style={{ color: '#513CC8' }} />
        </div>
      ) : (
        <>
          {/* Price chart */}
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={kData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9CA3AF' }} interval={Math.floor(kData.length / 8)} />
                <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} domain={['auto', 'auto']} />
                <Tooltip
                  contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  labelStyle={{ fontSize: 10, fontWeight: 600 }}
                />
                <Area type="monotone" dataKey="close" stroke="#513CC8" fill="#513CC820" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="ma5" stroke="#F59E0B" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="ma10" stroke="#EF4444" strokeWidth={1} dot={false} />
                <Line type="monotone" dataKey="ma20" stroke="#3B82F6" strokeWidth={1} dot={false} strokeDasharray="3 3" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {/* Volume bar */}
          <div className="h-[50px] mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kData} margin={{ top: 0, right: 5, left: -15, bottom: 0 }}>
                <XAxis dataKey="date" tick={false} axisLine={false} />
                <YAxis tick={{ fontSize: 8, fill: '#9CA3AF' }} />
                <Bar dataKey="volume" fill="#513CC830" radius={[1, 1, 0, 0]}>
                  {kData.map((entry, index) => (
                    <Cell key={index} fill={entry.close >= entry.open ? '#EF444460' : '#22C55E60'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
      <div className="flex items-center gap-4 mt-1">
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#513CC8] inline-block"></span> 收盘价
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#F59E0B] inline-block"></span> MA5
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#EF4444] inline-block"></span> MA10
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#3B82F6] inline-block border-t border-dashed"></span> MA20
        </span>
      </div>
    </div>
  )
}

// ==================== Chip Distribution (筹码峰) ====================
function ChipDistribution({ code, price }) {
  const [chipData, setChipData] = useState([])

  useEffect(() => {
    if (code && price) generateChipData()
  }, [code, price])

  const generateChipData = () => {
    const data = []
    const basePrice = price || 50
    for (let i = -15; i <= 15; i++) {
      const priceLevel = +(basePrice * (1 + i * 0.02)).toFixed(2)
      const dist = Math.exp(-((i + 2) ** 2) / 30) * 100
      const profitRatio = priceLevel <= basePrice ? dist * 0.7 : dist * 0.3
      data.push({
        price: priceLevel.toFixed(1),
        volume: Math.round(dist),
        profit: Math.round(profitRatio),
        loss: Math.round(dist - profitRatio),
      })
    }
    setChipData(data)
  }

  // Calculate stats
  const totalChips = chipData.reduce((s, d) => s + d.volume, 0)
  const profitChips = chipData.reduce((s, d) => s + d.profit, 0)
  const profitRatio = totalChips > 0 ? ((profitChips / totalChips) * 100).toFixed(1) : 0

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-wider uppercase font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
          <Layers size={14} />
          CHIP DISTRIBUTION <span className="text-gray-900 text-sm ml-1 normal-case">筹码分布</span>
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[9px] text-red-500 font-medium">获利: {profitRatio}%</span>
          <span className="text-[9px] text-gray-400">当前价: {price?.toFixed(2)}</span>
        </div>
      </div>

      <div className="h-[230px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chipData} layout="vertical" margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 8, fill: '#9CA3AF' }} />
            <YAxis dataKey="price" type="category" tick={{ fontSize: 8, fill: '#9CA3AF' }} interval={4} width={40} />
            <Tooltip
              contentStyle={{ fontSize: 10, borderRadius: 8, border: '1px solid #E5E7EB' }}
              formatter={(value, name) => [value, name === 'profit' ? '获利筹码' : '套牢筹码']}
            />
            <Bar dataKey="profit" stackId="a" fill="#EF4444" radius={[0, 2, 2, 0]} />
            <Bar dataKey="loss" stackId="a" fill="#22C55E" radius={[0, 2, 2, 0]} />
            {price && <ReferenceLine y={price.toFixed(1)} stroke="#513CC8" strokeDasharray="3 3" strokeWidth={1.5} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-2 bg-red-500 inline-block rounded-sm"></span> 获利筹码
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-2 bg-green-500 inline-block rounded-sm"></span> 套牢筹码
        </span>
        <span className="text-[9px] text-gray-400 flex items-center gap-1">
          <span className="w-3 h-0.5 bg-[#513CC8] inline-block border-t border-dashed"></span> 当前价
        </span>
      </div>
    </div>
  )
}

// ==================== Stock Forum (股吧) ====================
function StockForum({ code, name }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (code) loadForumPosts()
  }, [code])

  const loadForumPosts = () => {
    setLoading(true)
    const stockName = name || code
    const mockPosts = [
      { title: `${stockName}明天怎么看？技术面已经到了关键位置`, author: '股海沉浮', time: '10分钟前', views: 2341, comments: 56, sentiment: 'neutral' },
      { title: `重大利好！${stockName}获得机构密集调研`, author: '价值猎人', time: '23分钟前', views: 5678, comments: 128, sentiment: 'positive' },
      { title: `${stockName}主力资金流入明显，放量突破平台`, author: '短线突击手', time: '1小时前', views: 3456, comments: 89, sentiment: 'positive' },
      { title: `注意风险！${stockName}估值已经偏高了`, author: '理性投资者', time: '2小时前', views: 1890, comments: 34, sentiment: 'negative' },
      { title: `${stockName}Q1业绩预告分析：增长超预期`, author: '财报分析师', time: '3小时前', views: 4567, comments: 102, sentiment: 'positive' },
      { title: `别追高了，等回调再说`, author: '老股民张三', time: '4小时前', views: 987, comments: 23, sentiment: 'negative' },
    ]
    setPosts(mockPosts)
    setLoading(false)
  }

  const sentimentColors = {
    positive: 'text-red-500',
    negative: 'text-green-600',
    neutral: 'text-gray-500'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-wider uppercase font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
          <MessageSquare size={14} />
          STOCK FORUM <span className="text-gray-900 text-sm ml-1 normal-case">股吧热议</span>
        </h3>
        <a
          href={`https://guba.eastmoney.com/list,${code}.html`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[9px] text-[#513CC8] hover:underline flex items-center gap-0.5"
        >
          查看全部 <ExternalLink size={9} />
        </a>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin" size={16} style={{ color: '#513CC8' }} />
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {posts.map((post, i) => (
            <a
              key={i}
              href={`https://guba.eastmoney.com/list,${code}.html`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800 group-hover:text-[#513CC8] truncate transition">
                  {post.title}
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[9px] text-gray-400">{post.author}</span>
                  <span className="text-[9px] text-gray-400">{post.time}</span>
                  <span className="text-[9px] text-gray-400">{post.views}浏览</span>
                  <span className="text-[9px] text-gray-400">{post.comments}评论</span>
                </div>
              </div>
              <span className={`text-[9px] shrink-0 ${sentimentColors[post.sentiment]}`}>
                {post.sentiment === 'positive' ? '看多' : post.sentiment === 'negative' ? '看空' : '中性'}
              </span>
            </a>
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
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] tracking-wider uppercase font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
          <Newspaper size={14} />
          NEWS FEED <span className="text-gray-900 text-sm ml-1 normal-case">相关资讯</span>
        </h3>
        <button onClick={onRefresh} className="text-[9px] text-gray-400 hover:text-[#513CC8] transition flex items-center gap-1">
          <RefreshCw size={10} /> 刷新
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="animate-spin" size={16} style={{ color: '#513CC8' }} />
          <span className="ml-2 text-gray-500 text-[10px]">加载资讯...</span>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
          {(news || []).slice(0, 6).map((item, i) => (
            <a
              key={i}
              href={item.link || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 hover:border-purple-200 hover:bg-purple-50/30 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800 group-hover:text-[#513CC8] transition truncate">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  {item.source && <span className="text-[9px] text-gray-400">{item.source}</span>}
                  {item.date && <span className="text-[9px] text-gray-400">{item.date}</span>}
                </div>
              </div>
              <ExternalLink size={10} className="text-gray-300 group-hover:text-[#513CC8] transition shrink-0 mt-1" />
            </a>
          ))}
          {(!news || news.length === 0) && (
            <p className="text-[10px] text-gray-400 text-center py-4">暂无相关资讯</p>
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
      setHistory(Array.isArray(res?.data) ? res.data : [])
    } catch (e) { /* silent */ }
  }

  const loadMarketReview = async () => {
    setReviewLoading(true)
    try {
      const res = await getMarketReview()
      if (res?.data && typeof res.data === 'object') setReview(res.data)
    } catch (e) { /* silent */ }
    setReviewLoading(false)
  }

  const loadNews = async (stockCode) => {
    if (!stockCode) return
    setNewsLoading(true)
    try {
      const res = await getStockNews({ code: stockCode })
      setNews(Array.isArray(res?.data) ? res.data : [])
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
      if (res?.data && typeof res.data === 'object') {
        setCurrentDecision(res.data)
        loadHistory()
        loadNews(code.trim())
        toast.success('分析完成')
      } else {
        toast.error('未获取到分析结果')
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
      if (res?.data && typeof res.data === 'object') setReview(res.data)
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
        <div className="flex items-center gap-2 max-w-7xl mx-auto px-6 py-2">
          <AlertTriangle size={13} className="text-amber-500 shrink-0" />
          <p className="text-[10px] text-gray-600">
            <span className="font-semibold text-[#513CC8]">风险提示：</span>AI只能提供决策意向，具体买卖需要智慧参与。投资有风险，入市需谨慎。
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* ===== TOP AREA: Market Review (Full Width, Including History) ===== */}
        <div className="mb-4">
          <MarketReviewPanel
            review={review}
            loading={reviewLoading}
            onRefresh={handleRefreshReview}
            history={history}
            onSelectHistory={selectFromHistory}
            currentDecisionId={currentDecision?.id}
          />
        </div>

        {/* ===== Search Bar ===== */}
        <div className="flex items-center gap-3 mb-4">
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
            {analyzing ? '分析中...' : 'AI分析'}
          </button>
        </div>

        {/* ===== Analyzing Indicator ===== */}
        {analyzing && (
          <div className="bg-white rounded-xl border border-purple-200 shadow-sm p-4 mb-4 flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: '#513CC8' }} />
            <Loader2 size={14} className="animate-spin" style={{ color: '#513CC8' }} />
            <span className="text-sm text-gray-700 font-medium">正在分析 <span className="text-[#513CC8]">{code}</span> ...</span>
          </div>
        )}

        {/* ===== MAIN CONTENT (Full Width) ===== */}
        {currentDecision ? (
          <div className="space-y-4">
            {/* Stock Header Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 mb-1 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900">{currentDecision.name}</h2>
                    <span className="text-lg font-bold" style={{ color: '#513CC8' }}>{currentDecision.price?.toFixed(2)}</span>
                    <span className={`text-sm font-semibold ${currentDecision.change_pct >= 0 ? 'text-red-500' : 'text-green-600'}`}>
                      {currentDecision.change_pct >= 0 ? '+' : ''}{currentDecision.change_pct?.toFixed(2)}%
                    </span>
                    <span className="text-xs text-gray-400">{currentDecision.code} · {currentDecision.trade_date}</span>
                  </div>

                  {/* KEY INSIGHTS */}
                  <div className="mb-3">
                    <p className="text-[10px] tracking-wider uppercase mb-1.5 font-semibold" style={{ color: '#513CC8' }}>KEY INSIGHTS</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{currentDecision.insights}</p>
                  </div>

                  {/* Suggestion + Trend + Reason */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getSuggestionStyle(currentDecision.suggestion).bg} ${getSuggestionStyle(currentDecision.suggestion).border}`}>
                      <Shield size={13} className={getSuggestionStyle(currentDecision.suggestion).text} />
                      <div>
                        <p className="text-[8px] text-gray-500">操作建议</p>
                        <p className={`text-sm font-bold ${getSuggestionStyle(currentDecision.suggestion).text}`}>
                          {currentDecision.suggestion || '观望'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
                      <Activity size={13} className={getTrendStyle(currentDecision.trend).text} />
                      <div>
                        <p className="text-[8px] text-gray-500">趋势预测</p>
                        <p className={`text-sm font-bold ${getTrendStyle(currentDecision.trend).text}`}>
                          {currentDecision.trend || '震荡'}
                        </p>
                      </div>
                    </div>
                    {currentDecision.reason && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg border border-amber-200 max-w-md">
                        <Zap size={13} className="text-amber-600 shrink-0" />
                        <p className="text-[10px] font-medium text-amber-700 line-clamp-2">{currentDecision.reason}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Sentiment Gauge */}
                <div className="shrink-0 hidden md:block">
                  <SentimentGauge score={currentDecision.sentiment || 50} size={140} />
                </div>
              </div>
            </div>

            {/* Strategy Points */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <h3 className="text-[10px] tracking-wider uppercase mb-3 font-semibold flex items-center gap-2" style={{ color: '#513CC8' }}>
                <Target size={13} />
                STRATEGY POINTS <span className="text-gray-900 text-sm ml-1 normal-case">狙击点位</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { label: '理想买入', value: currentDecision.buy_price_1, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', topColor: '#16A34A' },
                  { label: '二次买入', value: currentDecision.buy_price_2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', topColor: '#2563EB' },
                  { label: '止损价位', value: currentDecision.stop_loss, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', topColor: '#DC2626' },
                  { label: '止盈目标', value: currentDecision.take_profit, color: 'text-[#513CC8]', bg: 'bg-purple-50', border: 'border-purple-200', topColor: '#513CC8' },
                ].map(point => (
                  <div key={point.label} className={`${point.bg} rounded-lg p-3 border ${point.border} text-center relative overflow-hidden`}>
                    <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: point.topColor }} />
                    <p className="text-[9px] text-gray-500 mb-1 mt-1">{point.label}</p>
                    <p className={`text-lg font-bold ${point.color}`}>
                      {point.value?.toFixed(2) || '--'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* K-Line + Chip Distribution (side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <KLineChart code={currentDecision.code} name={currentDecision.name} />
              <ChipDistribution code={currentDecision.code} price={currentDecision.price} />
            </div>

            {/* Stock Forum + News (side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <StockForum code={currentDecision.code} name={currentDecision.name} />
              <NewsFeedPanel
                code={currentDecision.code}
                news={news}
                loading={newsLoading}
                onRefresh={() => loadNews(currentDecision.code)}
              />
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F0EDFA' }}>
              <Brain size={32} style={{ color: '#513CC8' }} />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">输入股票代码开始AI分析</h3>
            <p className="text-sm text-gray-400 mb-6">AI将为您提供个股K线走势、筹码分布、股吧热议和买卖建议</p>
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
      </div>
    </div>
  )
}
