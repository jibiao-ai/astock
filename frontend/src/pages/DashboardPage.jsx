import { useState, useEffect } from 'react'
import { getDashboard } from '../services/api'
import { BarChart3, TrendingUp, TrendingDown, Activity, Flame, Crown, AlertTriangle, DollarSign, Users, Zap, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Generate last 7 trade dates (skip weekends)
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

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await getDashboard({ date })
      if (res.code === 0) setData(res.data)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const sentiment = data?.market_sentiment || {}
  const sentiments = data?.sentiments || []
  const sectors = data?.sectors || []
  const limitUps = data?.limit_ups || []
  const brokens = data?.brokens || []
  const dragons = data?.dragon_tigers || []
  const boardLadder = data?.board_ladder || {}
  const stats = data?.stats || {}

  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']

  const getScoreColor = (score) => {
    if (score >= 70) return '#ef4444'
    if (score >= 50) return '#f59e0b'
    return '#22c55e'
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">A股看板大屏</h1>
          <p className="text-xs text-gray-500 mt-1">
            数据来源：东方财富/新浪财经/Baostock · {loading ? '加载中...' : `最后更新 ${new Date().toLocaleTimeString('zh-CN')}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {last7Days.map(d => (
            <button key={d} onClick={() => setDate(d)}
              className={`px-3 py-1.5 rounded-lg text-xs transition ${
                date === d ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-gray-500 hover:text-white hover:bg-[#1a1f2e]'
              }`}>
              {d.slice(5)}
            </button>
          ))}
          <button onClick={loadData} disabled={loading}
            className="p-2 rounded-lg text-gray-500 hover:text-amber-400 hover:bg-amber-500/10 transition ml-2">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Row - Key Metrics */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '涨停', value: sentiment.limit_up_count || 0, icon: ArrowUp, color: '#ef4444', suffix: '家' },
          { label: '跌停', value: sentiment.limit_down_count || 0, icon: ArrowDown, color: '#22c55e', suffix: '家' },
          { label: '炸板', value: sentiment.broken_count || 0, icon: AlertTriangle, color: '#f59e0b', suffix: '家' },
          { label: '最高连板', value: sentiment.highest_board || 0, icon: Crown, color: '#8b5cf6', suffix: '板' },
          { label: '总成交额', value: ((sentiment.total_amount || 0)).toFixed(0), icon: DollarSign, color: '#3b82f6', suffix: '亿' },
          { label: '情绪指数', value: (sentiment.score || 0).toFixed(0), icon: Activity, color: getScoreColor(sentiment.score), suffix: '分' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${item.color}15` }}>
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-xl font-bold" style={{ color: item.color }}>{item.value}<span className="text-xs ml-1">{item.suffix}</span></p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid - Row 1 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Sector Heat Map */}
        <div className="col-span-5 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Flame size={16} className="text-amber-400" /> 热力板块</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {sectors.slice(0, 16).map((s, i) => {
              const intensity = Math.min(Math.abs(s.change_pct) / 4, 1)
              const bg = s.change_pct >= 0
                ? `rgba(239,68,68,${0.15 + intensity * 0.5})`
                : `rgba(34,197,94,${0.15 + intensity * 0.5})`
              return (
                <div key={i} className="heat-cell rounded-lg p-2 text-center" style={{ background: bg }}>
                  <p className="text-xs font-medium truncate">{s.name}</p>
                  <p className={`text-sm font-bold ${s.change_pct >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {s.change_pct > 0 ? '+' : ''}{s.change_pct?.toFixed(2)}%
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{s.lead_stock}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* 5-Day Sentiment Trend */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={16} className="text-blue-400" /> 最近5日情绪走势</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={sentiments.slice(-5)}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="trade_date" tick={{fontSize: 10, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 10, fill: '#9aa0a6'}} domain={[0, 100]} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} 
                formatter={(v, name) => [typeof v === 'number' ? v.toFixed(1) : v, name === 'score' ? '情绪分' : name]} />
              <Area type="monotone" dataKey="score" stroke="#f59e0b" fill="url(#sentGrad)" strokeWidth={2} name="score" dot={{ fill: '#f59e0b', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Total Turnover Bar */}
        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign size={16} className="text-green-400" /> 成交额(亿)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={sentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 10, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 10, fill: '#9aa0a6'}} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(0) + '亿' : v, '成交额']} />
              <Bar dataKey="total_amount" fill="#3b82f6" radius={[4,4,0,0]} name="total_amount" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid - Row 2 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Limit Up Board / Board Ladder */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown size={16} className="text-red-400" /> 涨停封板 · 连板天梯</h3>
          {/* Board Ladder Summary */}
          {boardLadder.max_board > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {Array.from({length: boardLadder.max_board}, (_, i) => boardLadder.max_board - i).map(level => {
                const count = boardLadder.ladder?.[level] || 0
                if (count === 0) return null
                return (
                  <span key={level} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                    {level}板: {count}家
                  </span>
                )
              })}
            </div>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {limitUps.slice(0, 12).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#252d3f] transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold">
                    {s.board_count}
                  </span>
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-gray-500">{s.code}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="stock-up font-medium">+{s.change_pct?.toFixed(2)}%</span>
                  <span className="text-gray-600 text-[10px] max-w-[60px] truncate">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broken Board */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> 炸板个股</h3>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {brokens.length > 0 ? brokens.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#252d3f] transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-yellow-500/20 text-yellow-400 flex items-center justify-center text-[10px] font-bold">
                    {s.open_count}
                  </span>
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-gray-500">{s.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="stock-up">开{s.open_count}次</span>
                  <span className="text-gray-600 text-[10px] truncate">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-600 text-xs">暂无炸板数据</div>
            )}
          </div>
        </div>

        {/* Fund Flow by Sector */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-purple-400" /> 板块资金净流入(亿)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sectors.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{fontSize: 10, fill: '#9aa0a6'}} />
              <YAxis type="category" dataKey="name" tick={{fontSize: 10, fill: '#9aa0a6'}} width={60} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}}
                formatter={(v) => [typeof v === 'number' ? v.toFixed(2) + '亿' : v, '净流入']} />
              <Bar dataKey="net_flow" radius={[0,4,4,0]} name="net_flow">
                {sectors.slice(0, 8).map((s, i) => (
                  <Cell key={i} fill={s.net_flow >= 0 ? '#ef4444' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Main Grid - Row 3 */}
      <div className="grid grid-cols-12 gap-3">
        {/* Dragon Tiger Board */}
        <div className="col-span-6 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Users size={16} className="text-orange-400" /> 龙虎榜游资数据</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-[#2d3548]">
                  <th className="text-left p-2">股票</th>
                  <th className="text-left p-2">上榜原因</th>
                  <th className="text-right p-2">买入额(万)</th>
                  <th className="text-right p-2">卖出额(万)</th>
                  <th className="text-right p-2">净买入(万)</th>
                </tr>
              </thead>
              <tbody>
                {dragons.slice(0, 8).map((d, i) => (
                  <tr key={i} className="border-b border-[#2d3548]/50 hover:bg-[#252d3f]">
                    <td className="p-2">
                      <span className="text-white font-medium">{d.name}</span>
                      <span className="text-gray-500 ml-1">{d.code}</span>
                    </td>
                    <td className="p-2 text-gray-400 max-w-[120px] truncate">{d.reason}</td>
                    <td className="p-2 text-right stock-up">{(d.buy_total/10000)?.toFixed(0)}</td>
                    <td className="p-2 text-right stock-down">{(d.sell_total/10000)?.toFixed(0)}</td>
                    <td className={`p-2 text-right font-medium ${d.net_amount >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {d.net_amount >= 0 ? '+' : ''}{(d.net_amount/10000)?.toFixed(0)}
                    </td>
                  </tr>
                ))}
                {dragons.length === 0 && (
                  <tr><td colSpan={5} className="text-center p-4 text-gray-600">暂无龙虎榜数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Up/Down Distribution */}
        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Zap size={16} className="text-cyan-400" /> 涨跌分布</h3>
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie data={[
                { name: '上涨', value: sentiment.up_count || 0 },
                { name: '下跌', value: sentiment.down_count || 0 },
                { name: '平盘', value: sentiment.flat_count || 0 },
              ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>上涨 {sentiment.up_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>下跌 {sentiment.down_count || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span>平盘 {sentiment.flat_count || 0}</span>
          </div>
        </div>

        {/* Limit Up/Down 5-Day Trend */}
        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">涨跌停趋势</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={sentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 9, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9aa0a6'}} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:11}} />
              <Bar dataKey="limit_up_count" fill="#ef4444" radius={[2,2,0,0]} name="涨停" />
              <Bar dataKey="limit_down_count" fill="#22c55e" radius={[2,2,0,0]} name="跌停" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'AI智能体', value: stats.agents || 0, color: '#8b5cf6' },
          { label: '策略信号', value: stats.strategy_signals || 0, color: '#f59e0b' },
          { label: '行情数据', value: stats.stock_quotes || 0, color: '#3b82f6' },
          { label: '审计日志', value: stats.audit_logs || 0, color: '#22c55e' },
          { label: '用户数', value: stats.users || 0, color: '#ec4899' },
        ].map((item, i) => (
          <div key={i} className="glass-card p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className="text-lg font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
