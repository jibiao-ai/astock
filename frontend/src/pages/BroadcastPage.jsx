import { useState, useEffect, useRef, useCallback } from 'react'
import { getBroadcastMarket, getBroadcastFinance, getBroadcastSearch } from '../services/api'
import { 
  Radio, Search, RefreshCw, TrendingUp, AlertTriangle, Globe, Building2,
  DollarSign, PieChart, BarChart3, FileText, Shield, Layers, Activity,
  ChevronRight, ChevronDown, X, Loader2
} from 'lucide-react'

// ==================== Scrolling Ticker Component ====================
function ScrollingTicker({ items, speed = 30 }) {
  const containerRef = useRef(null)
  const contentRef = useRef(null)
  const [animationDuration, setAnimationDuration] = useState(60)

  useEffect(() => {
    if (contentRef.current) {
      const width = contentRef.current.scrollWidth
      setAnimationDuration(Math.max(width / speed, 20))
    }
  }, [items, speed])

  if (!items || items.length === 0) return null

  return (
    <div ref={containerRef} className="overflow-hidden whitespace-nowrap relative bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 py-2.5 px-3">
      <div
        ref={contentRef}
        className="inline-block animate-scroll"
        style={{ animation: `scroll ${animationDuration}s linear infinite` }}
      >
        {items.map((item, idx) => (
          <span key={idx} className="inline-flex items-center mx-3 text-sm">
            {item.icon && <span className="mr-1">{item.icon}</span>}
            <span className={`font-medium ${item.color || 'text-gray-700'}`}>{item.text}</span>
            {item.badge && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${item.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                {item.badge}
              </span>
            )}
            {idx < items.length - 1 && <span className="mx-3 text-gray-300">|</span>}
          </span>
        ))}
        {/* Duplicate for seamless scrolling */}
        {items.map((item, idx) => (
          <span key={`dup-${idx}`} className="inline-flex items-center mx-3 text-sm">
            {item.icon && <span className="mr-1">{item.icon}</span>}
            <span className={`font-medium ${item.color || 'text-gray-700'}`}>{item.text}</span>
            {item.badge && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${item.badgeColor || 'bg-gray-100 text-gray-600'}`}>
                {item.badge}
              </span>
            )}
            {idx < items.length - 1 && <span className="mx-3 text-gray-300">|</span>}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  )
}

// ==================== Market Broadcast Tab ====================
function MarketBroadcastTab() {
  const [category, setCategory] = useState('overview')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const categories = [
    { key: 'overview', label: '市场概览', icon: <TrendingUp size={14} /> },
    { key: 'st', label: 'ST风险股', icon: <AlertTriangle size={14} /> },
    { key: 'hsgt', label: '沪深港通', icon: <Globe size={14} /> },
    { key: 'company', label: '上市公司', icon: <Building2 size={14} /> },
  ]

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await getBroadcastMarket({ category, keyword })
      if (res?.code === 0) {
        setData(res.data)
      }
    } catch (e) {
      console.error('Broadcast market error:', e)
    } finally {
      setLoading(false)
    }
  }, [category, keyword])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSearch = (e) => {
    e.preventDefault()
    setKeyword(searchInput)
  }

  // Build scrolling items from overview data
  const getScrollItems = () => {
    if (!data) return []
    if (category === 'overview') {
      const items = []
      if (data.total_stocks) items.push({ text: `A股总数: ${data.total_stocks}`, color: 'text-indigo-600' })
      if (data.st_count) items.push({ text: `ST股票: ${data.st_count}只`, color: 'text-red-500', badge: '风险', badgeColor: 'bg-red-100 text-red-600' })
      if (data.hsgt_count) items.push({ text: `港通标的: ${data.hsgt_count}只`, color: 'text-blue-600' })
      if (data.ipo_count) items.push({ text: `近30日新股: ${data.ipo_count}只`, color: 'text-green-600', badge: 'IPO', badgeColor: 'bg-green-100 text-green-600' })
      if (data.recent_ipos) {
        data.recent_ipos.slice(0, 8).forEach(ipo => {
          items.push({ text: `${ipo.name}(${ipo.code}) ${ipo.industry}`, color: 'text-emerald-600' })
        })
      }
      return items
    }
    if (data?.items?.length > 0) {
      return data.items.slice(0, 20).map(item => ({
        text: `${item.name || item.code}${item.type_name ? ' [' + item.type_name + ']' : ''}`,
        color: category === 'st' ? 'text-red-500' : 'text-blue-600'
      }))
    }
    return []
  }

  return (
    <div className="space-y-4">
      {/* Scrolling Ticker */}
      <ScrollingTicker items={getScrollItems()} />

      {/* Category Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => { setCategory(cat.key); setKeyword(''); setSearchInput('') }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                ${category === cat.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="搜索代码/名称..." 
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 w-40" />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setKeyword('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
          </div>
          <button type="submit" className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
            搜索
          </button>
          <button type="button" onClick={fetchData} className="p-1.5 text-gray-400 hover:text-indigo-500 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
          <span className="ml-2 text-sm text-gray-500">加载中...</span>
        </div>
      ) : (
        <div>
          {category === 'overview' && data && <OverviewContent data={data} />}
          {category === 'st' && data && <STContent data={data} />}
          {category === 'hsgt' && data && <HSGTContent data={data} />}
          {category === 'company' && data && <CompanyContent data={data} />}
        </div>
      )}
    </div>
  )
}

function OverviewContent({ data }) {
  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="A股总数" value={data.total_stocks} icon={<TrendingUp size={16} />} color="indigo" />
        <StatCard label="ST股票" value={`${data.st_count}只`} icon={<AlertTriangle size={16} />} color="red" />
        <StatCard label="港通标的" value={`${data.hsgt_count}只`} icon={<Globe size={16} />} color="blue" />
        <StatCard label="近期新股" value={`${data.ipo_count}只`} icon={<Activity size={16} />} color="green" />
      </div>
      
      {/* Recent IPOs */}
      {data.recent_ipos?.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <Activity size={14} className="text-green-500" /> 近期上市新股
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {data.recent_ipos.map((ipo, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg hover:bg-green-50 transition">
                <div>
                  <span className="text-sm font-medium text-gray-800">{ipo.name}</span>
                  <span className="ml-2 text-xs text-gray-500">{ipo.code}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">{ipo.industry}</span>
                  <span className="ml-2 text-xs text-green-600">{ipo.list_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function STContent({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500" /> ST风险股列表
          <span className="text-xs text-gray-400">(共{data.total}只)</span>
        </h4>
        {data.trade_date && <span className="text-xs text-gray-400">日期: {data.trade_date}</span>}
      </div>
      {data.items?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
          {data.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-100">
              <div>
                <span className="text-sm font-medium text-red-700">{item.name}</span>
                <span className="ml-2 text-xs text-gray-500">{item.code}</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded">{item.type_name || item.type}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-gray-400">暂无数据</div>
      )}
    </div>
  )
}

function HSGTContent({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <Globe size={14} className="text-blue-500" /> 沪深港通标的
          <span className="text-xs text-gray-400">(共{data.total}只)</span>
        </h4>
        {data.trade_date && <span className="text-xs text-gray-400">日期: {data.trade_date}</span>}
      </div>
      {data.type_groups && (
        <div className="flex flex-wrap gap-2 mb-3">
          {Object.entries(data.type_groups).map(([type, count]) => (
            <span key={type} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full border border-blue-100">
              {type}: {count}只
            </span>
          ))}
        </div>
      )}
      {data.items?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[500px] overflow-y-auto">
          {data.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
              <div>
                <span className="text-sm font-medium text-gray-800">{item.name}</span>
                <span className="ml-2 text-xs text-gray-500">{item.code}</span>
              </div>
              <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">{item.type_name}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-gray-400">暂无数据</div>
      )}
    </div>
  )
}

function CompanyContent({ data }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <Building2 size={14} className="text-purple-500" /> 上市公司信息
      </h4>
      {data.message && !data.items?.length && (
        <div className="text-center py-8 text-sm text-gray-400">{data.message}</div>
      )}
      {data.items?.length > 0 && (
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {data.items.map((item, idx) => (
            <div key={idx} className="p-3 bg-gray-50 rounded-lg hover:bg-purple-50 transition border border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-gray-800">{item.name}</span>
                  <span className="text-xs text-gray-500">{item.code}</span>
                  <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded">{item.market}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{item.industry}</span>
                  <span className="text-xs text-gray-400">{item.area}</span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-4 text-xs text-gray-400">
                <span>上市: {item.list_date}</span>
                {item.is_hs !== 'N' && <span className="text-blue-500">港通标的</span>}
                {item.act_name && <span>实控人: {item.act_name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== Financial Broadcast Tab ====================
function FinancialBroadcastTab() {
  const [category, setCategory] = useState('forecast')
  const [tsCode, setTsCode] = useState('')
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchTimeoutRef = useRef(null)

  const categories = [
    { key: 'forecast', label: '业绩预告', icon: <FileText size={14} />, needsCode: false },
    { key: 'express', label: '业绩快报', icon: <Activity size={14} />, needsCode: false },
    { key: 'income', label: '利润表', icon: <DollarSign size={14} />, needsCode: true },
    { key: 'balance', label: '资产负债', icon: <PieChart size={14} />, needsCode: true },
    { key: 'cashflow', label: '现金流量', icon: <BarChart3 size={14} />, needsCode: true },
    { key: 'indicator', label: '财务指标', icon: <TrendingUp size={14} />, needsCode: true },
    { key: 'audit', label: '审计意见', icon: <Shield size={14} />, needsCode: true },
    { key: 'mainbz', label: '主营构成', icon: <Layers size={14} />, needsCode: true },
  ]

  const currentCat = categories.find(c => c.key === category)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = { category }
      if (tsCode) params.ts_code = tsCode
      if (keyword) params.keyword = keyword
      const res = await getBroadcastFinance(params)
      if (res?.code === 0) {
        setData(res.data)
      }
    } catch (e) {
      console.error('Broadcast finance error:', e)
    } finally {
      setLoading(false)
    }
  }, [category, tsCode, keyword])

  useEffect(() => { fetchData() }, [fetchData])

  // Auto-search suggestions
  const handleInputChange = (val) => {
    setSearchInput(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    if (val.length >= 1) {
      searchTimeoutRef.current = setTimeout(async () => {
        try {
          const res = await getBroadcastSearch({ keyword: val })
          if (res?.code === 0 && res.data?.items) {
            setSuggestions(res.data.items)
            setShowSuggestions(true)
          }
        } catch (e) {}
      }, 300)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const selectStock = (stock) => {
    setTsCode(stock.ts_code)
    setSearchInput(`${stock.name}(${stock.code})`)
    setKeyword(stock.name)
    setShowSuggestions(false)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (!currentCat.needsCode) {
      setKeyword(searchInput)
    }
    setShowSuggestions(false)
  }

  // Build scrolling items
  const getScrollItems = () => {
    if (!data?.items?.length) return []
    return data.items.slice(0, 15).map(item => {
      if (category === 'forecast') {
        const typeColor = item.type === '预增' ? 'text-red-500' : item.type === '预减' ? 'text-green-600' : 'text-gray-700'
        return { text: `${item.name}(${item.code}) ${item.type} ${item.p_change_max > 0 ? '+' : ''}${item.p_change_max?.toFixed(0)}%`, color: typeColor }
      }
      if (category === 'express') {
        return { text: `${item.name}(${item.code}) EPS:${item.diluted_eps?.toFixed(2)} 营收同比:${item.yoy_sales?.toFixed(1)}%`, color: 'text-indigo-600' }
      }
      return { text: `${item.end_date || ''} ${item.code || ''} ${item.name || ''}`, color: 'text-gray-700' }
    })
  }

  return (
    <div className="space-y-4">
      {/* Scrolling Ticker */}
      <ScrollingTicker items={getScrollItems()} speed={25} />

      {/* Category Tabs + Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1">
          {categories.map(cat => (
            <button key={cat.key} onClick={() => { setCategory(cat.key); if (!cat.needsCode) { setTsCode(''); } }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all
                ${category === cat.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="relative flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchInput} onChange={e => handleInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder={currentCat?.needsCode ? "输入股票代码/名称..." : "搜索代码..."} 
              className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-400 w-44" />
            {searchInput && (
              <button type="button" onClick={() => { setSearchInput(''); setKeyword(''); setTsCode('') }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={12} />
              </button>
            )}
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                {suggestions.map((s, idx) => (
                  <button key={idx} type="button" onClick={() => selectStock(s)}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between">
                    <span><span className="font-medium">{s.name}</span> <span className="text-gray-400">{s.code}</span></span>
                    <span className="text-gray-400">{s.industry}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="px-3 py-1.5 text-xs bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition">
            查询
          </button>
          <button type="button" onClick={fetchData} className="p-1.5 text-gray-400 hover:text-indigo-500 transition">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-indigo-400" />
          <span className="ml-2 text-sm text-gray-500">加载中...</span>
        </div>
      ) : (
        <div>
          {data?.message && !data?.items?.length && (
            <div className="text-center py-10 text-sm text-gray-400 bg-white rounded-xl border border-gray-100">
              {data.message}
            </div>
          )}
          {category === 'forecast' && data?.items?.length > 0 && <ForecastTable items={data.items} />}
          {category === 'express' && data?.items?.length > 0 && <ExpressTable items={data.items} />}
          {category === 'income' && data?.items?.length > 0 && <IncomeTable items={data.items} name={data.name} />}
          {category === 'balance' && data?.items?.length > 0 && <BalanceTable items={data.items} name={data.name} />}
          {category === 'cashflow' && data?.items?.length > 0 && <CashflowTable items={data.items} name={data.name} />}
          {category === 'indicator' && data?.items?.length > 0 && <IndicatorTable items={data.items} name={data.name} />}
          {category === 'audit' && data?.items?.length > 0 && <AuditTable items={data.items} name={data.name} />}
          {category === 'mainbz' && data?.items?.length > 0 && <MainbzTable items={data.items} name={data.name} />}
        </div>
      )}
    </div>
  )
}

// ==================== Financial Tables ====================
function ForecastTable({ items }) {
  const getTypeStyle = (type) => {
    if (type === '预增' || type === '扭亏') return 'bg-red-100 text-red-700'
    if (type === '预减' || type === '首亏' || type === '续亏') return 'bg-green-100 text-green-700'
    if (type === '略增') return 'bg-orange-100 text-orange-700'
    if (type === '略减') return 'bg-teal-100 text-teal-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">股票</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">公告日</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-center text-gray-500 font-medium">类型</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">变动幅度</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">预计净利润(万)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="ml-1 text-gray-400">{item.code}</span>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.ann_date}</td>
                <td className="px-3 py-2 text-gray-600">{item.end_date}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(item.type)}`}>{item.type}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.p_change_max > 0 ? 'text-red-500' : 'text-green-600'}>
                    {item.p_change_min?.toFixed(0)}% ~ {item.p_change_max?.toFixed(0)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-600">
                  {item.net_profit_min?.toFixed(0)} ~ {item.net_profit_max?.toFixed(0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpressTable({ items }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">股票</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">公告日</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营收(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">净利润(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">EPS</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">ROE%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营收同比%</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="font-medium text-gray-800">{item.name}</span>
                  <span className="ml-1 text-gray-400">{item.code}</span>
                </td>
                <td className="px-3 py-2 text-gray-600">{item.ann_date}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">{fmtNum(item.revenue)}</td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">{fmtNum(item.n_income)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.diluted_eps?.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.diluted_roe?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.yoy_sales > 0 ? 'text-red-500' : 'text-green-600'}>{item.yoy_sales?.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IncomeTable({ items, name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
        <span className="text-sm font-medium text-indigo-700">{name} - 利润表</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">每股收益</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业总收入(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业收入(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业利润(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">净利润(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">归母净利(万)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-right font-mono">{item.basic_eps?.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.total_revenue)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.revenue)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.operate_profit)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.n_income)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.n_income_attr_p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function BalanceTable({ items, name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <span className="text-sm font-medium text-blue-700">{name} - 资产负债表</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">总资产(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">总负债(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">股东权益(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">货币资金(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">应收账款(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">存货(万)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.total_assets)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.total_liab)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.total_equity)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.money_cap)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.accounts_recv)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.inventories)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CashflowTable({ items, name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-green-50 border-b border-green-100">
        <span className="text-sm font-medium text-green-700">{name} - 现金流量表</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">经营活动(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">投资活动(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">筹资活动(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">自由现金流(万)</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.n_cashflow_act >= 0 ? 'text-red-500' : 'text-green-600'}>{fmtNum(item.n_cashflow_act)}</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.n_cashflow_inv)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.n_cashflow_fnc)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.free_cashflow >= 0 ? 'text-red-500' : 'text-green-600'}>{fmtNum(item.free_cashflow)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function IndicatorTable({ items, name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-purple-50 border-b border-purple-100">
        <span className="text-sm font-medium text-purple-700">{name} - 财务指标</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">EPS</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">ROE%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">毛利率%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">净利率%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">资产负债率%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">流动比率</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">净利润增长%</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营收增长%</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-right font-mono">{item.eps?.toFixed(3)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.roe?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.grossprofit_margin?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.netprofit_margin?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.debt_to_assets?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">{item.current_ratio?.toFixed(2)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.netprofit_yoy > 0 ? 'text-red-500' : 'text-green-600'}>{item.netprofit_yoy?.toFixed(1)}%</span>
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  <span className={item.or_yoy > 0 ? 'text-red-500' : 'text-green-600'}>{item.or_yoy?.toFixed(1)}%</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function AuditTable({ items, name }) {
  const getResultStyle = (result) => {
    if (result?.includes('标准无保留')) return 'bg-green-100 text-green-700'
    if (result?.includes('保留')) return 'bg-orange-100 text-orange-700'
    if (result?.includes('否定')) return 'bg-red-100 text-red-700'
    return 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
        <span className="text-sm font-medium text-amber-700">{name} - 审计意见</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">公告日</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">审计结果</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">事务所</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">签字审计师</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-gray-600">{item.ann_date}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${getResultStyle(item.audit_result)}`}>{item.audit_result}</span>
                </td>
                <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{item.audit_agency}</td>
                <td className="px-3 py-2 text-gray-600">{item.audit_sign}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function MainbzTable({ items, name }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-2 bg-teal-50 border-b border-teal-100">
        <span className="text-sm font-medium text-teal-700">{name} - 主营业务构成</span>
      </div>
      <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">报告期</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">业务项目</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业收入(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业利润(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">营业成本(万)</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">利润率%</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-700 font-medium">{item.end_date}</td>
                <td className="px-3 py-2 text-gray-800">{item.bz_item}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.bz_sales)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.bz_profit)}</td>
                <td className="px-3 py-2 text-right font-mono">{fmtNum(item.bz_cost)}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {item.bz_sales > 0 ? ((item.bz_profit / item.bz_sales) * 100).toFixed(1) + '%' : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ==================== Utility Components ====================
function StatCard({ label, value, icon, color }) {
  const colors = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    red: 'bg-red-50 border-red-100 text-red-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    green: 'bg-green-50 border-green-100 text-green-600',
  }
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.indigo}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-70">{label}</span>
        {icon}
      </div>
      <div className="mt-1 text-lg font-bold">{value || '-'}</div>
    </div>
  )
}

function fmtNum(val) {
  if (val === null || val === undefined || isNaN(val)) return '-'
  if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(2) + '亿'
  if (Math.abs(val) >= 10000) return (val / 10000).toFixed(1) + '万'
  return val.toFixed(2)
}

// ==================== Main Page Component ====================
export default function BroadcastPage() {
  const [activeTab, setActiveTab] = useState('market')

  return (
    <div className="p-4 md:p-6 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#513CC8' }}>
            <Radio size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">股市播报</h1>
            <p className="text-xs text-gray-400">市场动态 & 个股财务滚动播报</p>
          </div>
        </div>
        
        {/* Tab Switch */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button onClick={() => setActiveTab('market')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
              ${activeTab === 'market' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <TrendingUp size={14} /> 市场播报
          </button>
          <button onClick={() => setActiveTab('finance')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2
              ${activeTab === 'finance' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <DollarSign size={14} /> 财务播报
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'market' ? <MarketBroadcastTab /> : <FinancialBroadcastTab />}
    </div>
  )
}
