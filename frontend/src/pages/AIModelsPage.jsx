import { useState, useEffect } from 'react'
import { listAIProviders, updateAIProvider, testAIProvider, createAIProvider } from '../services/api'
import { Database, Check, X, Loader2, Eye, EyeOff, Plus, TestTube } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AIModelsPage() {
  const [providers, setProviders] = useState([])
  const [testing, setTesting] = useState(null)
  const [showKeys, setShowKeys] = useState({})
  const [showAdd, setShowAdd] = useState(false)
  const [newProvider, setNewProvider] = useState({ name: '', label: '', base_url: '', api_key: '', model: '', category: 'llm', is_enabled: true })

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await listAIProviders()
      if (res.code === 0) setProviders(res.data || [])
    } catch (e) {}
  }

  const handleUpdate = async (provider) => {
    try {
      await updateAIProvider(provider.id, provider)
      toast.success(`${provider.label} 已更新`)
      load()
    } catch (e) { toast.error('更新失败') }
  }

  const handleTest = async (id) => {
    setTesting(id)
    try {
      const res = await testAIProvider(id)
      if (res.code === 0) toast.success('连接成功！')
      else toast.error(res.message)
    } catch (e) { toast.error('测试失败') }
    setTesting(null)
  }

  const handleSetDefault = async (provider) => {
    await updateAIProvider(provider.id, { ...provider, is_default: true })
    toast.success(`${provider.label} 已设为默认`)
    load()
  }

  const handleAddProvider = async () => {
    try {
      await createAIProvider(newProvider)
      toast.success('添加成功')
      setShowAdd(false)
      setNewProvider({ name: '', label: '', base_url: '', api_key: '', model: '', category: 'llm', is_enabled: true })
      load()
    } catch (e) { toast.error('添加失败') }
  }

  const updateField = (id, field, value) => {
    setProviders(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  const CATEGORY_COLORS = { llm: '#3b82f6', finance: '#f59e0b' }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">AI模型管理</h1>
          <p className="text-xs text-gray-500 mt-1">页面化配置国内外多家模型厂商API · 所有参数在页面填写</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
          <Plus size={16} /> 添加提供商
        </button>
      </div>

      <div className="space-y-3">
        {providers.map(p => (
          <div key={p.id} className={`glass-card p-4 ${p.is_default ? 'ring-1 ring-amber-500/50' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                  style={{ background: `${CATEGORY_COLORS[p.category] || '#3b82f6'}20` }}>
                  <Database size={16} style={{ color: CATEGORY_COLORS[p.category] || '#3b82f6' }} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">{p.label}</h3>
                    {p.is_default && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-400">默认</span>}
                    <span className="px-1.5 py-0.5 rounded text-[10px]" 
                      style={{ background: `${CATEGORY_COLORS[p.category]}20`, color: CATEGORY_COLORS[p.category] }}>
                      {p.category === 'finance' ? '金融API' : 'LLM'}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500">{p.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleTest(p.id)} disabled={testing === p.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition">
                  {testing === p.id ? <Loader2 size={12} className="animate-spin" /> : <TestTube size={12} />}
                  测试连接
                </button>
                {!p.is_default && (
                  <button onClick={() => handleSetDefault(p)}
                    className="px-3 py-1.5 rounded-lg text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition">
                    设为默认
                  </button>
                )}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={p.is_enabled} onChange={e => {
                    updateField(p.id, 'is_enabled', e.target.checked)
                    handleUpdate({ ...p, is_enabled: e.target.checked })
                  }} className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#2d3548] peer-checked:bg-green-500/30 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:peer-checked:bg-green-400 after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">Base URL</label>
                <input value={p.base_url} onChange={e => updateField(p.id, 'base_url', e.target.value)}
                  onBlur={() => handleUpdate(p)}
                  className="w-full px-2.5 py-1.5 bg-[#0f1419] border border-[#2d3548] rounded text-xs text-white focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">API Key</label>
                <div className="relative">
                  <input type={showKeys[p.id] ? 'text' : 'password'} value={p.api_key} 
                    onChange={e => updateField(p.id, 'api_key', e.target.value)}
                    onBlur={() => handleUpdate(p)}
                    placeholder="在此填写API密钥"
                    className="w-full px-2.5 py-1.5 pr-8 bg-[#0f1419] border border-[#2d3548] rounded text-xs text-white focus:border-amber-500 focus:outline-none" />
                  <button onClick={() => setShowKeys({...showKeys, [p.id]: !showKeys[p.id]})}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                    {showKeys[p.id] ? <EyeOff size={12}/> : <Eye size={12}/>}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 mb-1 block">模型</label>
                <input value={p.model} onChange={e => updateField(p.id, 'model', e.target.value)}
                  onBlur={() => handleUpdate(p)}
                  className="w-full px-2.5 py-1.5 bg-[#0f1419] border border-[#2d3548] rounded text-xs text-white focus:border-amber-500 focus:outline-none" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Provider Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-card p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">添加AI模型提供商</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              {[
                { key: 'name', label: '标识名(英文)', placeholder: 'e.g. openai' },
                { key: 'label', label: '显示名称', placeholder: 'e.g. OpenAI GPT-4' },
                { key: 'base_url', label: 'Base URL', placeholder: 'e.g. https://api.openai.com/v1' },
                { key: 'api_key', label: 'API Key', placeholder: '填写API密钥' },
                { key: 'model', label: '模型名', placeholder: 'e.g. gpt-4o' },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                  <input value={newProvider[f.key]} onChange={e => setNewProvider({...newProvider, [f.key]: e.target.value})}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
                </div>
              ))}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">类别</label>
                <select value={newProvider.category} onChange={e => setNewProvider({...newProvider, category: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none">
                  <option value="llm">大语言模型(LLM)</option>
                  <option value="finance">金融数据API</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white bg-[#1a1f2e]">取消</button>
                <button onClick={handleAddProvider} className="px-4 py-2 rounded-lg text-sm text-white"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
