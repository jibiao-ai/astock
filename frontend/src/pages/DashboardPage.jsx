import { useState, useEffect } from 'react'
import { getDashboard, getMarketSentiment, getSectorHeat, getLimitUpBoard, getDragonTiger, getBoardLadder } from '../services/api'
import { BarChart3, TrendingUp, TrendingDown, Activity, Flame, Crown, AlertTriangle, DollarSign, Users, Zap, ArrowUp, ArrowDown } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

export default function DashboardPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [stats, setStats] = useState(null)
  const [sentiments, setSentiments] = useState([])
  const [sectors, setSectors] = useState([])
  const [limitUps, setLimitUps] = useState([])
  const [brokens, setBrokens] = useState([])
  const [dragons, setDragons] = useState([])
  const [ladder, setLadder] = useState(null)
  const [loading, setLoading] = useState(true)

  // Generate last 7 dates
  const last7Days = Array.from({length: 7}, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().slice(0, 10)
  }).reverse()

  useEffect(() => {
    loadData()
  }, [date])

  const loadData = async () => {
    setLoading(true)
    try {
      const [dashRes, sentRes, sectorRes, limitRes, brokenRes, dragonRes, ladderRes] = await Promise.allSettled([
        getDashboard(),
        getMarketSentiment({ date, days: 7 }),
        getSectorHeat({ date }),
        getLimitUpBoard({ date, type: 'limit_up' }),
        getLimitUpBoard({ date, type: 'broken' }),
        getDragonTiger({ date }),
        getBoardLadder({ date }),
      ])
      if (dashRes.status === 'fulfilled') setStats(dashRes.value.data)
      if (sentRes.status === 'fulfilled') setSentiments(sentRes.value.data || demoSentiments)
      if (sectorRes.status === 'fulfilled') setSectors(sectorRes.value.data || [])
      if (limitRes.status === 'fulfilled') setLimitUps(limitRes.value.data || [])
      if (brokenRes.status === 'fulfilled') setBrokens(brokenRes.value.data || [])
      if (dragonRes.status === 'fulfilled') setDragons(dragonRes.value.data || [])
      if (ladderRes.status === 'fulfilled') setLadder(ladderRes.value.data)
    } catch (e) { console.error(e) }
    // Use demo data if empty
    if (sentiments.length === 0) setSentiments(demoSentiments)
    if (sectors.length === 0) setSectors(demoSectors)
    if (limitUps.length === 0) setLimitUps(demoLimitUps)
    if (dragons.length === 0) setDragons(demoDragons)
    setLoading(false)
  }

  // Demo data for display (will be replaced by real API data)
  const demoSentiments = last7Days.map((d, i) => ({
    trade_date: d, score: 40 + Math.random() * 40,
    limit_up_count: 30 + Math.floor(Math.random() * 50),
    limit_down_count: 5 + Math.floor(Math.random() * 20),
    broken_count: 10 + Math.floor(Math.random() * 15),
    highest_board: 3 + Math.floor(Math.random() * 7),
    total_amount: 8000 + Math.random() * 6000,
    up_count: 1500 + Math.floor(Math.random() * 2000),
    down_count: 800 + Math.floor(Math.random() * 2000),
  }))

  const demoSectors = [
    { name: '半导体', change_pct: 3.2, net_flow: 28.5, lead_stock: '北方华创' },
    { name: '人工智能', change_pct: 2.8, net_flow: 22.1, lead_stock: '科大讯飞' },
    { name: '新能源车', change_pct: 1.9, net_flow: 15.3, lead_stock: '比亚迪' },
    { name: '军工', change_pct: 1.5, net_flow: 12.7, lead_stock: '中航沈飞' },
    { name: '白酒', change_pct: -0.8, net_flow: -8.2, lead_stock: '贵州茅台' },
    { name: '医药生物', change_pct: -1.2, net_flow: -12.5, lead_stock: '恒瑞医药' },
    { name: '房地产', change_pct: -2.1, net_flow: -18.3, lead_stock: '万科A' },
    { name: '银行', change_pct: 0.5, net_flow: 5.6, lead_stock: '招商银行' },
    { name: '光伏', change_pct: 2.1, net_flow: 16.8, lead_stock: '隆基绿能' },
    { name: '消费电子', change_pct: 1.7, net_flow: 11.2, lead_stock: '立讯精密' },
    { name: '传媒', change_pct: 3.5, net_flow: 19.4, lead_stock: '芒果超媒' },
    { name: '有色金属', change_pct: 0.8, net_flow: 6.3, lead_stock: '紫金矿业' },
  ]

  const demoLimitUps = Array.from({length: 8}, (_, i) => ({
    code: `30${String(i+1).padStart(4,'0')}`, name: ['赛力斯','中际旭创','寒武纪','拓维信息','浪潮信息','景嘉微','恒为科技','天孚通信'][i],
    price: 30 + Math.random() * 100, change_pct: 10 + Math.random() * 10,
    board_count: 5 - Math.floor(i / 2), first_time: '09:3' + i, last_time: '14:5' + i,
    open_count: Math.floor(Math.random() * 3), concept: '人工智能+算力', fund_amount: 5 + Math.random() * 20,
  }))

  const demoDragons = Array.from({length: 5}, (_, i) => ({
    code: `60${String(i+1).padStart(4,'0')}`, name: ['东方财富','赛力斯','中际旭创','寒武纪','拓维信息'][i],
    reason: '日涨幅偏离值达7%', buy_total: 10000 + Math.random() * 50000,
    sell_total: 8000 + Math.random() * 40000, net_amount: 2000 + Math.random() * 10000,
  }))

  const todaySentiment = sentiments.length > 0 ? sentiments[sentiments.length - 1] : demoSentiments[demoSentiments.length - 1]
  const displaySentiments = sentiments.length > 0 ? sentiments : demoSentiments
  const displaySectors = sectors.length > 0 ? sectors : demoSectors
  const displayLimitUps = limitUps.length > 0 ? limitUps : demoLimitUps
  const displayDragons = dragons.length > 0 ? dragons : demoDragons

  const COLORS = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">A股看板大屏</h1>
          <p className="text-xs text-gray-500 mt-1">数据来源：东方财富/新浪财经/Baostock · 实时更新</p>
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
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-6 gap-3">
        {[
          { label: '涨停', value: todaySentiment?.limit_up_count || 0, icon: ArrowUp, color: '#ef4444', suffix: '家' },
          { label: '跌停', value: todaySentiment?.limit_down_count || 0, icon: ArrowDown, color: '#22c55e', suffix: '家' },
          { label: '炸板', value: todaySentiment?.broken_count || 0, icon: AlertTriangle, color: '#f59e0b', suffix: '家' },
          { label: '最高连板', value: todaySentiment?.highest_board || 0, icon: Crown, color: '#8b5cf6', suffix: '板' },
          { label: '总成交额', value: ((todaySentiment?.total_amount || 0) / 100).toFixed(0), icon: DollarSign, color: '#3b82f6', suffix: '百亿' },
          { label: '情绪分', value: (todaySentiment?.score || 0).toFixed(0), icon: Activity, color: todaySentiment?.score >= 60 ? '#ef4444' : todaySentiment?.score >= 40 ? '#f59e0b' : '#22c55e', suffix: '分' },
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

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-3">
        {/* Sector Heat Map */}
        <div className="col-span-5 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Flame size={16} className="text-amber-400" /> 热力板块</h3>
          <div className="grid grid-cols-4 gap-1.5">
            {displaySectors.map((s, i) => {
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
                  <p className="text-[10px] text-gray-400">{s.lead_stock}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Sentiment Trend */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={16} className="text-blue-400" /> 最近5日情绪走势</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={displaySentiments.slice(-5)}>
              <defs>
                <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="trade_date" tick={{fontSize: 10, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 10, fill: '#9aa0a6'}} domain={[0, 100]} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} />
              <Area type="monotone" dataKey="score" stroke="#f59e0b" fill="url(#sentGrad)" strokeWidth={2} name="情绪分" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Total Amount Bar Chart */}
        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><DollarSign size={16} className="text-green-400" /> 成交额(亿)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={displaySentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 10, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 10, fill: '#9aa0a6'}} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} />
              <Bar dataKey="total_amount" fill="#3b82f6" radius={[4,4,0,0]} name="成交额(亿)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Limit Up / Board Ladder */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Crown size={16} className="text-red-400" /> 涨停封板 · 连板天梯</h3>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {displayLimitUps.sort((a,b) => b.board_count - a.board_count).map((s, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-[#252d3f] transition text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-red-500/20 text-red-400 flex items-center justify-center text-[10px] font-bold">
                    {s.board_count}
                  </span>
                  <span className="text-white font-medium">{s.name}</span>
                  <span className="text-gray-500">{s.code}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="stock-up font-medium">+{s.change_pct?.toFixed(2)}%</span>
                  <span className="text-gray-500">{s.concept?.split('+')[0]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Broken Board */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-yellow-400" /> 炸板个股</h3>
          <div className="space-y-1 max-h-52 overflow-y-auto">
            {(brokens.length > 0 ? brokens : demoLimitUps.slice(0, 4).map(s => ({...s, limit_type: 'broken', open_count: 2 + Math.floor(Math.random()*3)}))).map((s, i) => (
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
                  <span className="text-gray-400">{s.first_time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fund Flow by Sector */}
        <div className="col-span-4 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><BarChart3 size={16} className="text-purple-400" /> 概念板块资金流入(亿)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={displaySectors.slice(0, 8)} layout="vertical">
              <XAxis type="number" tick={{fontSize: 10, fill: '#9aa0a6'}} />
              <YAxis type="category" dataKey="name" tick={{fontSize: 10, fill: '#9aa0a6'}} width={60} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} />
              <Bar dataKey="net_flow" radius={[0,4,4,0]} name="净流入(亿)">
                {displaySectors.slice(0, 8).map((s, i) => (
                  <Cell key={i} fill={s.net_flow >= 0 ? '#ef4444' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

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
                {displayDragons.map((d, i) => (
                  <tr key={i} className="border-b border-[#2d3548]/50 hover:bg-[#252d3f]">
                    <td className="p-2">
                      <span className="text-white font-medium">{d.name}</span>
                      <span className="text-gray-500 ml-1">{d.code}</span>
                    </td>
                    <td className="p-2 text-gray-400">{d.reason}</td>
                    <td className="p-2 text-right stock-up">{(d.buy_total/10000)?.toFixed(0)}</td>
                    <td className="p-2 text-right stock-down">{(d.sell_total/10000)?.toFixed(0)}</td>
                    <td className={`p-2 text-right font-medium ${d.net_amount >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {(d.net_amount/10000)?.toFixed(0)}
                    </td>
                  </tr>
                ))}
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
                { name: '上涨', value: todaySentiment?.up_count || 2200 },
                { name: '下跌', value: todaySentiment?.down_count || 1800 },
                { name: '平盘', value: todaySentiment?.flat_count || 300 },
              ]} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value">
                <Cell fill="#ef4444" />
                <Cell fill="#22c55e" />
                <Cell fill="#6b7280" />
              </Pie>
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:12}} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>上涨 {todaySentiment?.up_count || 2200}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>下跌 {todaySentiment?.down_count || 1800}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-500"></span>平盘</span>
          </div>
        </div>

        {/* Limit Up/Down Trend */}
        <div className="col-span-3 glass-card p-4">
          <h3 className="text-sm font-semibold mb-3">涨跌停趋势</h3>
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={displaySentiments.slice(-5)}>
              <XAxis dataKey="trade_date" tick={{fontSize: 9, fill: '#9aa0a6'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9aa0a6'}} />
              <Tooltip contentStyle={{background:'#1e2536',border:'1px solid #2d3548',borderRadius:8,fontSize:11}} />
              <Bar dataKey="limit_up_count" fill="#ef4444" radius={[2,2,0,0]} name="涨停" />
              <Bar dataKey="limit_down_count" fill="#22c55e" radius={[2,2,0,0]} name="跌停" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
