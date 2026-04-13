import { useState, useEffect } from 'react'
import { getDashboard, getConceptHeat, getLimitUpDownDetails, getSectorFundFlow } from '../services/api'
import { BarChart3, TrendingUp, TrendingDown, Activity, Flame, Crown, AlertTriangle, DollarSign, Users, Zap, ArrowUp, ArrowDown, RefreshCw, Lightbulb, Eye } from 'lucide-react'
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
      const [dashRes, conceptRes, limitUpRes, limitDownRes, sectorFlowRes, conceptFlowRes] = await Promise.all([
        getDashboard({ date }).catch(() => null),
        getConceptHeat().catch(() => null),
        getLimitUpDownDetails({ type: 'up' }).catch(() => null),
        getLimitUpDownDetails({ type: 'down' }).catch(() => null),
        getSectorFundFlow({ category: 'sector' }).catch(() => null),
        getSectorFundFlow({ category: 'concept' }).catch(() => null),
      ])
      if (dashRes?.code === 0) setData(dashRes.data)
      if (conceptRes?.code === 0) setConceptData(conceptRes.data || [])
      if (limitUpRes?.code === 0) setLimitUpStocks(limitUpRes.data?.stocks || [])
      if (limitDownRes?.code === 0) setLimitDownStocks(limitDownRes.data?.stocks || [])
      if (sectorFlowRes?.code === 0) setSectorFlows(sectorFlowRes.data?.flows || [])
      if (conceptFlowRes?.code === 0) setConceptFlows(conceptFlowRes.data?.flows || [])
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

  const currentFlows = flowTab === 'sector' ? sectorFlows : conceptFlows
  const currentLimitStocks = limitTab === 'up' ? limitUpStocks : limitDownStocks

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">A股看板大屏</h1>
          <p className="text-xs text-gray-400 mt-1">
            实时数据来源：东方财富 / 腾讯财经 · {loading ? '加载中...' : `最后更新 ${new Date().toLocaleTimeString('zh-CN')}`}
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

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '涨停', value: sentiment.limit_up_count || limitUpStocks.length || 0, icon: ArrowUp, color: '#EF4444', suffix: '家' },
          { label: '跌停', value: sentiment.limit_down_count || limitDownStocks.length || 0, icon: ArrowDown, color: '#22C55E', suffix: '家' },
          { label: '炸板', value: sentiment.broken_count || 0, icon: AlertTriangle, color: '#F59E0B', suffix: '家' },
          { label: '最高连板', value: sentiment.highest_board || 0, icon: Crown, color: '#513CC8', suffix: '板' },
          { label: '总成交额', value: ((sentiment.total_amount || 0)).toFixed(0), icon: DollarSign, color: '#3B82F6', suffix: '亿' },
          { label: '情绪指数', value: (sentiment.score || 0).toFixed(0), icon: Activity, color: getScoreColor(sentiment.score), suffix: '分' },
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
        {/* Real-time Limit-up / Limit-down stocks */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <Eye size={16} style={{ color: '#EF4444' }} /> 实时涨跌停个股
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setLimitTab('up')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${limitTab === 'up' ? 'text-white bg-red-500' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}>
                涨停 {limitUpStocks.length}
              </button>
              <button onClick={() => setLimitTab('down')}
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
                {currentLimitStocks.slice(0, 15).map((s, i) => (
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
                  <tr><td colSpan={6} className="text-center p-4 text-gray-400">暂无实时数据（非交易时段）</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector/Concept Fund Flow with amounts */}
        <div className="col-span-6 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-800">
              <DollarSign size={16} style={{ color: '#3B82F6' }} /> 资金流向(实时金额)
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setFlowTab('sector')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition ${flowTab === 'sector' ? 'text-white' : 'text-gray-500 bg-gray-50 border border-gray-200'}`}
                style={flowTab === 'sector' ? { background: '#513CC8' } : {}}>
                板块
              </button>
              <button onClick={() => setFlowTab('concept')}
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
                {currentFlows.slice(0, 12).map((f, i) => (
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
        </div>
      </div>

      {/* Row 3: Traditional data */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Crown size={16} className="text-red-500" /> 涨停封板 · 连板天梯</h3>
          {boardLadder.max_board > 0 && (
            <div className="flex items-center gap-1 mb-2 flex-wrap">
              {Array.from({length: boardLadder.max_board}, (_, i) => boardLadder.max_board - i).map(level => {
                const count = boardLadder.ladder?.[level] || 0
                if (count === 0) return null
                return (
                  <span key={level} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 border border-red-100">
                    {level}板: {count}家
                  </span>
                )
              })}
            </div>
          )}
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {limitUps.slice(0, 12).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-50 text-red-500 flex items-center justify-center text-[10px] font-bold border border-red-100">
                    {s.board_count}
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
          </div>
        </div>

        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><AlertTriangle size={16} className="text-yellow-500" /> 炸板个股</h3>
          <div className="space-y-1 max-h-56 overflow-y-auto">
            {brokens.length > 0 ? brokens.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center text-[10px] font-bold border border-yellow-100">
                    {s.open_count}
                  </span>
                  <span className="text-gray-800 font-medium">{s.name}</span>
                  <span className="text-gray-400">{s.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="stock-up">开{s.open_count}次</span>
                  <span className="text-gray-400 text-[10px] truncate">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            )) : (
              <div className="text-center py-4 text-gray-400 text-xs">暂无炸板数据</div>
            )}
          </div>
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

      {/* Row 4: Dragon Tiger + Charts */}
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-6 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Users size={16} className="text-orange-500" /> 龙虎榜游资数据</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left p-2">股票</th>
                  <th className="text-left p-2">上榜原因</th>
                  <th className="text-right p-2">买入额(万)</th>
                  <th className="text-right p-2">卖出额(万)</th>
                  <th className="text-right p-2">净买入(万)</th>
                </tr>
              </thead>
              <tbody>
                {dragons.slice(0, 8).map((d, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="p-2">
                      <span className="text-gray-800 font-medium">{d.name}</span>
                      <span className="text-gray-400 ml-1">{d.code}</span>
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
                  <tr><td colSpan={5} className="text-center p-4 text-gray-400">暂无龙虎榜数据</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 text-gray-800"><Zap size={16} style={{ color: '#513CC8' }} /> 涨跌分布</h3>
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
