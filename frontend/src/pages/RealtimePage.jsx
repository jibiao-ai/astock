import { useState } from 'react'
import { getStockQuote, getKLine, getSectorList } from '../services/api'
import { Search, TrendingUp, RefreshCw, Database } from 'lucide-react'
import toast from 'react-hot-toast'

const SOURCES = [
  { key: 'sina', label: '新浪财经', color: '#ef4444' },
  { key: 'tencent', label: '腾讯财经', color: '#3b82f6' },
  { key: 'eastmoney', label: '东方财富', color: '#f59e0b' },
  { key: 'tdx', label: '通达信', color: '#22c55e' },
]

export default function RealtimePage() {
  const [code, setCode] = useState('')
  const [source, setSource] = useState('sina')
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchHistory, setSearchHistory] = useState([])

  const fetchQuote = async () => {
    if (!code) { toast.error('请输入股票代码'); return }
    setLoading(true)
    try {
      const res = await getStockQuote({ code: code.replace(/\D/g, ''), source })
      if (res.code === 0) {
        setQuote(res.data)
        setSearchHistory(prev => {
          const filtered = prev.filter(h => h.code !== res.data.code)
          return [{ code: res.data.code, name: res.data.name }, ...filtered].slice(0, 10)
        })
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error('获取行情失败')
    }
    setLoading(false)
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">实时行情</h1>
          <p className="text-xs text-gray-500 mt-1">多通道数据接入：新浪 · 腾讯 · 东财 · 通达信</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text" value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchQuote()}
              placeholder="输入股票代码 如 600519、000001、300750"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none text-sm"
            />
          </div>
          
          {/* Source Tabs */}
          <div className="flex gap-1">
            {SOURCES.map(s => (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                  source === s.key
                    ? 'text-white' : 'text-gray-500 hover:text-white hover:bg-[#1a1f2e]'
                }`}
                style={source === s.key ? { background: `${s.color}20`, color: s.color, border: `1px solid ${s.color}30` } : {}}>
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={fetchQuote} disabled={loading}
            className="px-4 py-2.5 rounded-lg text-sm font-medium text-white flex items-center gap-2 transition hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            查询行情
          </button>
        </div>

        {/* Search History */}
        {searchHistory.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-600">最近查询:</span>
            {searchHistory.map(h => (
              <button key={h.code} onClick={() => { setCode(h.code); }}
                className="px-2 py-1 rounded text-xs text-gray-400 hover:text-white bg-[#1a1f2e] hover:bg-[#252d3f] transition">
                {h.name} {h.code}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quote Display */}
      {quote && (
        <div className="glass-card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-white">{quote.name || '---'}</h2>
                <span className="text-gray-500">{quote.code}</span>
                <span className="px-2 py-0.5 rounded text-xs" 
                  style={{ background: SOURCES.find(s => s.key === source)?.color + '20', color: SOURCES.find(s => s.key === source)?.color }}>
                  {SOURCES.find(s => s.key === source)?.label}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className={`text-4xl font-bold ${quote.change >= 0 ? 'stock-up' : 'stock-down'}`}>
                  {quote.price?.toFixed(2) || '---'}
                </span>
                <span className={`text-lg ${quote.change >= 0 ? 'stock-up' : 'stock-down'}`}>
                  {quote.change >= 0 ? '+' : ''}{quote.change?.toFixed(2)}
                </span>
                <span className={`text-lg ${quote.change_pct >= 0 ? 'stock-up' : 'stock-down'}`}>
                  ({quote.change_pct >= 0 ? '+' : ''}{quote.change_pct?.toFixed(2)}%)
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-gray-500">
              <p>数据来源: {SOURCES.find(s => s.key === source)?.label}</p>
              <p>日期: {quote.trade_date}</p>
              <p className="flex items-center gap-1 justify-end mt-1">
                <Database size={12} /> 已存储至MySQL
              </p>
            </div>
          </div>

          {/* Quote Details Grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '今开', value: quote.open?.toFixed(2), color: quote.open >= quote.pre_close ? '#ef4444' : '#22c55e' },
              { label: '最高', value: quote.high?.toFixed(2), color: '#ef4444' },
              { label: '最低', value: quote.low?.toFixed(2), color: '#22c55e' },
              { label: '昨收', value: quote.pre_close?.toFixed(2), color: '#9aa0a6' },
              { label: '成交量', value: quote.volume ? (quote.volume / 10000).toFixed(0) + '万手' : '---', color: '#3b82f6' },
              { label: '成交额', value: quote.amount ? (quote.amount / 100000000).toFixed(2) + '亿' : '---', color: '#f59e0b' },
              { label: '换手率', value: quote.turnover ? quote.turnover.toFixed(2) + '%' : '---', color: '#8b5cf6' },
              { label: '市值', value: quote.market_cap ? (quote.market_cap / 100000000).toFixed(0) + '亿' : '---', color: '#ec4899' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg bg-[#0f1419] border border-[#2d3548]">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="text-sm font-semibold" style={{ color: item.color }}>{item.value || '---'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access */}
      {!quote && (
        <div className="glass-card p-8 text-center">
          <TrendingUp size={48} className="mx-auto text-gray-600 mb-4" />
          <h3 className="text-lg text-gray-400 mb-2">输入股票代码查询实时行情</h3>
          <p className="text-sm text-gray-600 mb-6">支持沪深A股代码，如 600519(贵州茅台)、000001(平安银行)、300750(宁德时代)</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {[
              { code: '600519', name: '贵州茅台' },
              { code: '000001', name: '平安银行' },
              { code: '300750', name: '宁德时代' },
              { code: '600036', name: '招商银行' },
              { code: '002594', name: '比亚迪' },
              { code: '688981', name: '中芯国际' },
            ].map(s => (
              <button key={s.code} onClick={() => setCode(s.code)}
                className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-[#1a1f2e] hover:bg-[#252d3f] transition border border-[#2d3548]">
                {s.name} <span className="text-gray-600">{s.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
