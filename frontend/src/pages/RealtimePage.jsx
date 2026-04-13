import { useState } from 'react'
import { getStockQuote, getKLine, getSectorList } from '../services/api'
import { Search, TrendingUp, RefreshCw, Database } from 'lucide-react'
import toast from 'react-hot-toast'

const SOURCES = [
  { key: 'sina', label: '新浪财经', color: '#EF4444' },
  { key: 'tencent', label: '腾讯财经', color: '#3B82F6' },
  { key: 'eastmoney', label: '东方财富', color: '#F59E0B' },
  { key: 'tdx', label: '通达信', color: '#22C55E' },
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
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">实时行情</h1>
          <p className="text-xs text-gray-400 mt-1">多通道数据接入：新浪 · 腾讯 · 东财 · 通达信</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={code} onChange={e => setCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchQuote()}
              placeholder="输入股票代码 如 600519、000001、300750"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none text-sm"
            />
          </div>
          
          {/* Source Tabs */}
          <div className="flex gap-1">
            {SOURCES.map(s => (
              <button key={s.key} onClick={() => setSource(s.key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition ${
                  source === s.key
                    ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200'
                }`}
                style={source === s.key ? { background: s.color } : {}}>
                {s.label}
              </button>
            ))}
          </div>

          <button onClick={fetchQuote} disabled={loading}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition hover:shadow-lg"
            style={{ background: '#513CC8', boxShadow: '0 2px 8px rgba(81,60,200,0.3)' }}>
            {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
            查询行情
          </button>
        </div>

        {searchHistory.length > 0 && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-gray-400">最近查询:</span>
            {searchHistory.map(h => (
              <button key={h.code} onClick={() => { setCode(h.code); }}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 transition border border-gray-200">
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
                <h2 className="text-2xl font-bold text-gray-900">{quote.name || '---'}</h2>
                <span className="text-gray-400">{quote.code}</span>
                <span className="px-2 py-0.5 rounded text-xs font-medium" 
                  style={{ background: SOURCES.find(s => s.key === source)?.color + '10', color: SOURCES.find(s => s.key === source)?.color }}>
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
            <div className="text-right text-xs text-gray-400">
              <p>数据来源: {SOURCES.find(s => s.key === source)?.label}</p>
              <p>日期: {quote.trade_date}</p>
              <p className="flex items-center gap-1 justify-end mt-1 text-[#513CC8]">
                <Database size={12} /> 已存储至数据库
              </p>
            </div>
          </div>

          {/* Quote Details Grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '今开', value: quote.open?.toFixed(2), color: quote.open >= quote.pre_close ? '#EF4444' : '#22C55E' },
              { label: '最高', value: quote.high?.toFixed(2), color: '#EF4444' },
              { label: '最低', value: quote.low?.toFixed(2), color: '#22C55E' },
              { label: '昨收', value: quote.pre_close?.toFixed(2), color: '#9CA3AF' },
              { label: '成交量', value: quote.volume ? (quote.volume / 10000).toFixed(0) + '万手' : '---', color: '#3B82F6' },
              { label: '成交额', value: quote.amount ? (quote.amount / 100000000).toFixed(2) + '亿' : '---', color: '#F59E0B' },
              { label: '换手率', value: quote.turnover ? quote.turnover.toFixed(2) + '%' : '---', color: '#513CC8' },
              { label: '市值', value: quote.market_cap ? (quote.market_cap / 100000000).toFixed(0) + '亿' : '---', color: '#EC4899' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className="text-sm font-semibold" style={{ color: item.color }}>{item.value || '---'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Access */}
      {!quote && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F0EDFA' }}>
            <TrendingUp size={32} style={{ color: '#513CC8' }} />
          </div>
          <h3 className="text-lg text-gray-700 mb-2 font-medium">输入股票代码查询实时行情</h3>
          <p className="text-sm text-gray-400 mb-6">支持沪深A股代码，如 600519(贵州茅台)、000001(平安银行)、300750(宁德时代)</p>
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
                className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:text-gray-900 bg-white hover:bg-gray-50 transition border border-gray-200 hover:border-gray-300 shadow-sm">
                {s.name} <span className="text-gray-400">{s.code}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
