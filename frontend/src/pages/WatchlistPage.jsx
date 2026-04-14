import { useState, useEffect, useCallback } from 'react'
import { getWatchlistQuotes, addWatchlistItem, removeWatchlistItem, getStockQuote, getTrendChart, getChipDistribution, getStockFundFlow, getDragonTigerHotMoney } from '../services/api'
import { Plus, Trash2, RefreshCw, Star, Search, TrendingUp, TrendingDown, ArrowUpDown, X, BarChart3, Activity, DollarSign, Users, LineChart } from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, LineChart as RLineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ComposedChart, ReferenceLine } from 'recharts'
import toast from 'react-hot-toast'

export default function WatchlistPage() {
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [addCode, setAddCode] = useState('')
  const [adding, setAdding] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)
  // Stock detail panel
  const [detailStock, setDetailStock] = useState(null)
  const [detailTab, setDetailTab] = useState('trend')
  const [trendData, setTrendData] = useState(null)
  const [chipData, setChipData] = useState(null)
  const [fundFlowData, setFundFlowData] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

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

  // Load detail data when stock or tab changes
  useEffect(() => {
    if (detailStock) {
      loadDetailData(detailStock.code, detailTab)
    }
  }, [detailStock, detailTab])

  const loadDetailData = async (code, tab) => {
    setDetailLoading(true)
    try {
      if (tab === 'trend') {
        const res = await getTrendChart({ code })
        if (res.code === 0) setTrendData(res.data)
      } else if (tab === 'chip') {
        const res = await getChipDistribution({ code })
        if (res.code === 0) setChipData(res.data)
      } else if (tab === 'fundflow') {
        const res = await getStockFundFlow({ code })
        if (res.code === 0) setFundFlowData(res.data)
      }
    } catch (e) {
      console.error(e)
    }
    setDetailLoading(false)
  }

  const handleAdd = async () => {
    const code = addCode.replace(/\D/g, '')
    if (!code || code.length !== 6) {
      toast.error('请输入6位股票代码')
      return
    }
    setAdding(true)
    try {
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
        if (detailStock?.code === code) setDetailStock(null)
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
    if (detailStock && selected.has(detailStock.code)) setDetailStock(null)
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

  const tooltipStyle = { background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: 11, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }

  // Detail tabs
  const detailTabs = [
    { key: 'trend', label: '分时走势', icon: Activity },
    { key: 'chip', label: '资金流向(筹码)', icon: BarChart3 },
    { key: 'fundflow', label: '主力/散户资金', icon: DollarSign },
  ]

  // Render detail chart based on tab
  const renderDetailChart = () => {
    if (detailLoading) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-400">
          <RefreshCw size={20} className="animate-spin mr-2" /> 加载中...
        </div>
      )
    }

    if (detailTab === 'trend' && trendData) {
      const trends = trendData.trends || []
      const preClose = trendData.pre_close || 0
      if (trends.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">暂无分时数据（非交易时段）</div>
      }
      return (
        <div>
          <div className="flex items-center gap-4 mb-2 text-xs text-gray-500">
            <span>昨收: <b className="text-gray-700">{preClose.toFixed(2)}</b></span>
            <span>最新: <b className={trends[trends.length-1]?.price >= preClose ? 'text-red-500' : 'text-green-500'}>
              {trends[trends.length-1]?.price?.toFixed(2)}
            </b></span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.split(' ')?.[1]?.slice(0,5) || v} interval={Math.floor(trends.length / 6)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} domain={['auto', 'auto']} />
              <Tooltip contentStyle={tooltipStyle}
                labelFormatter={v => v?.split(' ')?.[1]?.slice(0,5) || v}
                formatter={(v, name) => {
                  if (name === '价格') return [v?.toFixed(2), '价格']
                  if (name === '均价') return [v?.toFixed(2), '均价']
                  return [v, name]
                }} />
              <ReferenceLine y={preClose} stroke="#9CA3AF" strokeDasharray="3 3" label={{ value: '昨收', position: 'right', fontSize: 9, fill: '#9CA3AF' }} />
              <Area type="monotone" dataKey="price" stroke="#EF4444" fill="rgba(239,68,68,0.08)" strokeWidth={1.5} name="价格" dot={false} />
              <Line type="monotone" dataKey="avg" stroke="#F59E0B" strokeWidth={1} name="均价" dot={false} strokeDasharray="4 2" />
            </ComposedChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={trends}>
              <XAxis dataKey="time" tick={{fontSize: 8, fill: '#9CA3AF'}} tickFormatter={v => v?.split(' ')?.[1]?.slice(0,5) || v} interval={Math.floor(trends.length / 6)} />
              <YAxis tick={{fontSize: 8, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [(v || 0).toFixed(0), '成交量']} />
              <Bar dataKey="volume" fill="#CBD5E1" radius={[1,1,0,0]} name="成交量" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (detailTab === 'chip' && chipData) {
      const klines = chipData.klines || []
      if (klines.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">暂无资金流向(筹码)数据</div>
      }
      return (
        <div>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 主力流入</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> 主力流出</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 散户流入</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 散户流出</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={klines.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => {
                const labels = { main_in: '主力流入', main_out: '主力流出', retail_in: '散户流入', retail_out: '散户流出' }
                return [(v || 0).toFixed(2) + '万', labels[name] || name]
              }} />
              <Bar dataKey="main_in" fill="#EF4444" name="main_in" radius={[2,2,0,0]} />
              <Bar dataKey="main_out" fill="#22C55E" name="main_out" radius={[2,2,0,0]} />
              <Bar dataKey="retail_in" fill="#3B82F6" name="retail_in" radius={[2,2,0,0]} />
              <Bar dataKey="retail_out" fill="#F59E0B" name="retail_out" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <ResponsiveContainer width="100%" height={140}>
            <RLineChart data={klines.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => {
                const labels = { main_net: '主力净流入', retail_net: '散户净流入' }
                return [(v || 0).toFixed(2) + '万', labels[name] || name]
              }} />
              <ReferenceLine y={0} stroke="#D1D5DB" />
              <Line type="monotone" dataKey="main_net" stroke="#EF4444" strokeWidth={2} name="main_net" dot={{ r: 2 }} />
              <Line type="monotone" dataKey="retail_net" stroke="#3B82F6" strokeWidth={2} name="retail_net" dot={{ r: 2 }} />
            </RLineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    if (detailTab === 'fundflow' && fundFlowData) {
      const klines = fundFlowData.klines || []
      if (klines.length === 0) {
        return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">暂无主力/散户资金数据</div>
      }
      return (
        <div>
          <div className="flex items-center gap-3 mb-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> 主力净流入</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> 散户净流入</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500"></span> 超大单</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-500"></span> 大单</span>
          </div>
          {/* Bar chart for main_net and retail_net */}
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={klines}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => {
                const labels = { main_net: '主力净流入', retail_net: '散户净流入' }
                return [typeof v === 'number' ? v.toFixed(2) : v, labels[name] || name]
              }} />
              <ReferenceLine y={0} stroke="#D1D5DB" />
              <Bar dataKey="main_net" name="main_net" radius={[3,3,0,0]}>
                {klines.map((entry, index) => (
                  <rect key={index} fill={(entry.main_net || 0) >= 0 ? '#EF4444' : '#22C55E'} />
                ))}
              </Bar>
              <Bar dataKey="retail_net" name="retail_net" radius={[3,3,0,0]}>
                {klines.map((entry, index) => (
                  <rect key={index} fill={(entry.retail_net || 0) >= 0 ? '#3B82F6' : '#93C5FD'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {/* Line chart for super_big, big, mid */}
          <ResponsiveContainer width="100%" height={140}>
            <RLineChart data={klines}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{fontSize: 9, fill: '#9CA3AF'}} tickFormatter={v => v?.slice(5)} />
              <YAxis tick={{fontSize: 9, fill: '#9CA3AF'}} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v, name) => {
                const labels = { super_big: '超大单', big: '大单', mid: '中单' }
                return [typeof v === 'number' ? v.toFixed(2) : v, labels[name] || name]
              }} />
              <ReferenceLine y={0} stroke="#D1D5DB" />
              <Line type="monotone" dataKey="super_big" stroke="#7C3AED" strokeWidth={2} name="super_big" dot={{ r: 2 }} />
              <Line type="monotone" dataKey="big" stroke="#F59E0B" strokeWidth={2} name="big" dot={{ r: 2 }} />
              <Line type="monotone" dataKey="mid" stroke="#06B6D4" strokeWidth={2} name="mid" dot={{ r: 2 }} />
            </RLineChart>
          </ResponsiveContainer>
        </div>
      )
    }

    return <div className="flex items-center justify-center h-64 text-gray-400 text-sm">暂无数据</div>
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">自选个股</h1>
          <p className="text-xs text-gray-400 mt-1">对接东方财富 · 实时涨幅 · 主力/散户资金 · 5日收盘价 · 点击查看详情</p>
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

      {/* Main content: Table + Detail Panel */}
      <div className="grid grid-cols-12 gap-4">
        {/* Stocks Table */}
        <div className={detailStock ? 'col-span-7' : 'col-span-12'}>
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
                    {!detailStock && <th className="text-center p-3 text-xs text-gray-500 font-medium">近5日收盘</th>}
                    <th className="text-center p-3 text-xs text-gray-500 font-medium w-16">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s, i) => {
                    const isUp = (s.change_pct || 0) >= 0
                    const isActive = detailStock?.code === s.code
                    return (
                      <tr key={s.code}
                        className={`border-b border-gray-50 transition cursor-pointer ${
                          isActive ? 'bg-[#F0EDFA]/60 border-l-2 border-l-[#513CC8]' :
                          selected.has(s.code) ? 'bg-[#F0EDFA]/30 hover:bg-[#F0EDFA]/40' :
                          'hover:bg-gray-50'
                        }`}
                        onClick={() => setDetailStock(isActive ? null : s)}
                      >
                        <td className="p-3" onClick={e => e.stopPropagation()}>
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
                        {!detailStock && (
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
                        )}
                        <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
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
                <span>共 {stocks.length} 只自选股 · 点击行查看详细图表</span>
                <span>数据来源：东方财富 · 自动刷新</span>
              </div>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {detailStock && (
          <div className="col-span-5">
            <div className="glass-card p-4 sticky top-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-8 rounded-full ${(detailStock.change_pct || 0) >= 0 ? 'bg-red-400' : 'bg-green-400'}`}></div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{detailStock.name}</h3>
                    <p className="text-xs text-gray-400">{detailStock.code}</p>
                  </div>
                  <span className={`text-lg font-bold ml-2 ${(detailStock.change_pct || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>
                    {detailStock.price?.toFixed(2)}
                  </span>
                  <span className={`text-sm px-2 py-0.5 rounded ${(detailStock.change_pct || 0) >= 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                    {(detailStock.change_pct || 0) >= 0 ? '+' : ''}{(detailStock.change_pct || 0).toFixed(2)}%
                  </span>
                </div>
                <button onClick={() => setDetailStock(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
                  <X size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-50 rounded-xl p-1">
                {detailTabs.map(tab => (
                  <button key={tab.key}
                    onClick={() => setDetailTab(tab.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      detailTab === tab.key ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                    }`}
                    style={detailTab === tab.key ? { background: '#513CC8' } : {}}>
                    <tab.icon size={13} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Chart area */}
              <div className="min-h-[300px]">
                {renderDetailChart()}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-4 gap-2 mt-4 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">最高</p>
                  <p className="text-xs font-bold stock-up">{detailStock.high?.toFixed(2) || '---'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">最低</p>
                  <p className="text-xs font-bold stock-down">{detailStock.low?.toFixed(2) || '---'}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">主力净额</p>
                  <p className={`text-xs font-bold ${(detailStock.main_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>{formatAmount(detailStock.main_net)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-gray-400">散户净额</p>
                  <p className={`text-xs font-bold ${(detailStock.retail_net || 0) >= 0 ? 'stock-up' : 'stock-down'}`}>{formatAmount(detailStock.retail_net)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
