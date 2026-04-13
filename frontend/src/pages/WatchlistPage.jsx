import { useState, useEffect, useCallback } from 'react'
import { getWatchlistQuotes, addWatchlistItem, removeWatchlistItem, getStockQuote } from '../services/api'
import { Plus, Trash2, RefreshCw, Star, Search, TrendingUp, TrendingDown, ArrowUpDown } from 'lucide-react'
import toast from 'react-hot-toast'

export default function WatchlistPage() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addCode, setAddCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const loadStocks = useCallback(async () => {
    try {
      const res = await getWatchlistQuotes()
      if (res.code === 0) setStocks(res.data || [])
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
    setRefreshing(false)
  }, [])

  useEffect(() => { loadStocks() }, [loadStocks])

  const handleAdd = async () => {
    const code = addCode.replace(/\D/g, '')
    if (!code || code.length !== 6) {
      toast.error('请输入6位股票代码')
      return
    }
    setAdding(true)
    try {
      // First fetch the stock name
      let name = ''
      try {
        const quoteRes = await getStockQuote({ code, source: 'eastmoney' })
        if (quoteRes.code === 0 && quoteRes.data?.name) {
          name = quoteRes.data.name
        }
      } catch (e) {}
      
      const res = await addWatchlistItem({ code, name })
      if (res.code === 0) {
        toast.success(`已添加 ${name || code} 到自选`)
        setAddCode('')
        loadStocks()
      } else {
        toast.error(res.message || '添加失败')
      }
    } catch (e) {
      toast.error('添加失败')
    }
    setAdding(false)
  }

  const handleRemove = async (code, name) => {
    if (!confirm(`确定删除自选股 ${name}(${code}) ?`)) return
    try {
      const res = await removeWatchlistItem(code)
      if (res.code === 0) {
        toast.success(`已删除 ${name}`)
        setStocks(prev => prev.filter(s => s.code !== code))
        setSelected(prev => { const n = new Set(prev); n.delete(code); return n })
      } else {
        toast.error(res.message || '删除失败')
      }
    } catch (e) {
      toast.error('删除失败')
    }
  }

  const handleBatchRemove = async () => {
    if (selected.size === 0) return
    if (!confirm(`确定删除选中的 ${selected.size} 只股票?`)) return
    for (const code of selected) {
      try {
        await removeWatchlistItem(code)
      } catch (e) {}
    }
    toast.success(`已删除 ${selected.size} 只股票`)
    setSelected(new Set())
    loadStocks()
  }

  const toggleSelect = (code) => {
    setSelected(prev => {
      const n = new Set(prev)
      if (n.has(code)) n.delete(code)
      else n.add(code)
      return n
    })
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadStocks()
  }

  const formatAmount = (v) => {
    if (!v || v === 0) return '---'
    if (Math.abs(v) >= 10000) return (v / 10000).toFixed(2) + '亿'
    return v.toFixed(0) + '万'
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">自选个股</h1>
          <p className="text-xs text-gray-400 mt-1">对接东方财富 · 实时涨幅 · 主力/散户资金 · 5日收盘价</p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button onClick={handleBatchRemove}
              className="px-3 py-2 rounded-xl text-xs font-medium text-red-500 bg-red-50 hover:bg-red-100 transition flex items-center gap-1 border border-red-100">
              <Trash2 size={14} />
              删除选中 ({selected.size})
            </button>
          )}
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 rounded-lg text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA] transition">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Add Stock */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={addCode} onChange={e => setAddCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="输入股票代码添加自选 如 600519"
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none text-sm"
            />
          </div>
          <button onClick={handleAdd} disabled={adding}
            className="px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition hover:shadow-lg"
            style={{ background: '#513CC8', boxShadow: '0 2px 8px rgba(81,60,200,0.3)' }}>
            {adding ? <RefreshCw size={16} className="animate-spin" /> : <Plus size={16} />}
            添加自选
          </button>
        </div>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <span className="text-xs text-gray-400">快速添加:</span>
          {[
            { code: '600519', name: '贵州茅台' },
            { code: '000001', name: '平安银行' },
            { code: '300750', name: '宁德时代' },
            { code: '002594', name: '比亚迪' },
            { code: '600036', name: '招商银行' },
          ].map(s => (
            <button key={s.code} onClick={() => setAddCode(s.code)}
              className="px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 transition border border-gray-200">
              {s.name} {s.code}
            </button>
          ))}
        </div>
      </div>

      {/* Stocks Table */}
      {loading ? (
        <div className="glass-card p-8 text-center text-gray-400">
          <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
          加载中...
        </div>
      ) : stocks.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#F0EDFA' }}>
            <Star size={32} style={{ color: '#513CC8' }} />
          </div>
          <h3 className="text-lg text-gray-700 mb-2 font-medium">暂无自选股</h3>
          <p className="text-sm text-gray-400">在上方输入股票代码添加到自选列表</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left p-3 w-8">
                  <input type="checkbox"
                    checked={selected.size === stocks.length && stocks.length > 0}
                    onChange={() => {
                      if (selected.size === stocks.length) setSelected(new Set())
                      else setSelected(new Set(stocks.map(s => s.code)))
                    }}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="text-left p-3 text-xs text-gray-500 font-medium">股票</th>
                <th className="text-right p-3 text-xs text-gray-500 font-medium">现价</th>
                <th className="text-right p-3 text-xs text-gray-500 font-medium">涨跌幅</th>
                <th className="text-right p-3 text-xs text-gray-500 font-medium">主力净额</th>
                <th className="text-right p-3 text-xs text-gray-500 font-medium">散户净额</th>
                <th className="text-center p-3 text-xs text-gray-500 font-medium">近5日收盘</th>
                <th className="text-center p-3 text-xs text-gray-500 font-medium w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((s, i) => {
                const isUp = (s.change_pct || 0) >= 0
                return (
                  <tr key={s.code} className={`border-b border-gray-50 hover:bg-gray-50 transition ${selected.has(s.code) ? 'bg-[#F0EDFA]/30' : ''}`}>
                    <td className="p-3">
                      <input type="checkbox" checked={selected.has(s.code)} onChange={() => toggleSelect(s.code)}
                        className="rounded border-gray-300" />
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-1 h-8 rounded-full ${isUp ? 'bg-red-400' : 'bg-green-400'}`}></div>
                        <div>
                          <p className="font-medium text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className={`p-3 text-right font-semibold ${isUp ? 'stock-up' : 'stock-down'}`}>
                      {s.price ? s.price.toFixed(2) : '---'}
                    </td>
                    <td className={`p-3 text-right font-medium ${isUp ? 'stock-up' : 'stock-down'}`}>
                      <span className="px-2 py-0.5 rounded text-xs" 
                        style={{ background: isUp ? 'rgba(239,68,68,0.08)' : 'rgba(34,197,94,0.08)' }}>
                        {isUp ? '+' : ''}{(s.change_pct || 0).toFixed(2)}%
                      </span>
                    </td>
                    <td className={`p-3 text-right text-xs ${(s.main_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {formatAmount(s.main_net)}
                    </td>
                    <td className={`p-3 text-right text-xs ${(s.retail_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                      {formatAmount(s.retail_net)}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {(s.five_day_close || []).map((d, j) => (
                          <div key={j} className="text-center">
                            <div className="text-[10px] text-gray-400">{d.date?.slice(5)}</div>
                            <div className="text-xs font-medium text-gray-600">{d.close?.toFixed(2)}</div>
                          </div>
                        ))}
                        {(!s.five_day_close || s.five_day_close.length === 0) && (
                          <span className="text-xs text-gray-300">---</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => handleRemove(s.code, s.name)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div className="px-4 py-2 bg-gray-50/50 text-xs text-gray-400 flex items-center justify-between border-t border-gray-100">
            <span>共 {stocks.length} 只自选股</span>
            <span>数据来源：东方财富 · 自动刷新</span>
          </div>
        </div>
      )}
    </div>
  )
}
