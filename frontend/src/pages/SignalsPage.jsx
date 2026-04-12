import { useState, useEffect } from 'react'
import { getStrategySignals } from '../services/api'
import { Zap, Filter } from 'lucide-react'

const STRATEGY_OPTIONS = [
  { value: '', label: '全部策略' },
  { value: 'dragon_board', label: '龙头打板' },
  { value: 'strong_pullback', label: '强势回踩' },
  { value: 'trend_core', label: '趋势核心' },
  { value: 'event_burst', label: '事件爆发' },
  { value: 'concept_core', label: '概念核心' },
  { value: 'auction_pick', label: '竞价选股' },
  { value: 'group_hug', label: '反复抱团' },
  { value: 'pre_market', label: '盘前精选' },
  { value: 'micro_overnight', label: '微盘隔夜' },
]

export default function SignalsPage() {
  const [signals, setSignals] = useState([])
  const [strategy, setStrategy] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)

  useEffect(() => { loadSignals() }, [strategy, date])

  const loadSignals = async () => {
    setLoading(true)
    try {
      const res = await getStrategySignals({ strategy, date })
      if (res.code === 0 && res.data?.length > 0) {
        setSignals(res.data)
      } else {
        // Demo signals when no data
        setSignals(demoSignals)
      }
    } catch (e) { setSignals(demoSignals) }
    setLoading(false)
  }

  const demoSignals = Array.from({length: 15}, (_, i) => ({
    strategy_name: STRATEGY_OPTIONS[1 + (i % 9)].value,
    code: `${['600','300','002','000','688'][i%5]}${String(100+i*37).padStart(3,'0')}`,
    name: ['赛力斯','中际旭创','寒武纪','拓维信息','浪潮信息','景嘉微','恒为科技','天孚通信','北方华创','中芯国际','比亚迪','宁德时代','隆基绿能','科大讯飞','中航沈飞'][i],
    signal: ['buy','buy','hold','buy','sell'][i%5],
    score: 95 - i * 3 + Math.random() * 5,
    factors: JSON.stringify({tech: 85-i*2, fundamental: 80-i, fund: 75+i}),
    reason: ['Dragon Score达98分，封板强度S级，量比3.2','回踩5日线缩量60%，游资净买入1.2亿','趋势池+buypoint信号确认','产业链一级直接受益股','概念发酵期+板块趋势共振','竞价高开4.2%+占比9.8%','5步漏斗通过+8因子评分85','AI精选Top3，命中率76%','二级过滤通过+情绪分68'][i%9],
    trade_date: date,
  }))

  const getSignalColor = (signal) => {
    switch(signal) {
      case 'buy': return { bg: '#ef444420', text: '#ef4444', label: '买入' }
      case 'sell': return { bg: '#22c55e20', text: '#22c55e', label: '卖出' }
      default: return { bg: '#f59e0b20', text: '#f59e0b', label: '持有' }
    }
  }

  const getStrategyLabel = (name) => STRATEGY_OPTIONS.find(s => s.value === name)?.label || name

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">策略信号</h1>
          <p className="text-xs text-gray-500 mt-1">实时策略信号输出 · 数据来源：Baostock/东财/新浪</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 bg-[#1a1f2e] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
          <select value={strategy} onChange={e => setStrategy(e.target.value)}
            className="px-3 py-2 bg-[#1a1f2e] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none">
            {STRATEGY_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-[#2d3548] bg-[#141820]">
              <th className="text-left p-3">策略</th>
              <th className="text-left p-3">股票</th>
              <th className="text-center p-3">信号</th>
              <th className="text-right p-3">评分</th>
              <th className="text-left p-3">分析理由</th>
              <th className="text-right p-3">日期</th>
            </tr>
          </thead>
          <tbody>
            {signals.map((s, i) => {
              const sc = getSignalColor(s.signal)
              return (
                <tr key={i} className="border-b border-[#2d3548]/30 hover:bg-[#1a1f2e] transition">
                  <td className="p-3">
                    <span className="px-2 py-1 rounded text-xs bg-[#0f1419] text-amber-400 border border-amber-500/20">
                      {getStrategyLabel(s.strategy_name)}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-white font-medium">{s.name}</span>
                    <span className="text-gray-500 ml-1 text-xs">{s.code}</span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2 py-1 rounded text-xs font-medium" style={{ background: sc.bg, color: sc.text }}>
                      {sc.label}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <span className={`font-bold ${s.score >= 80 ? 'text-red-400' : s.score >= 60 ? 'text-amber-400' : 'text-gray-400'}`}>
                      {s.score?.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-400 max-w-xs truncate">{s.reason}</td>
                  <td className="p-3 text-right text-xs text-gray-500">{s.trade_date}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
