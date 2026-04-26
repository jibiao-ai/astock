import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings } from '../services/api'
import { Settings, Key, Database, Save, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [settings, setSettings] = useState({})
  const [tushareToken, setTushareToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tokenEdited, setTokenEdited] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await getSystemSettings()
      const data = res.data?.data || {}
      setSettings(data)
      setTushareToken(data.tushare_token || '')
      setTokenEdited(false)
    } catch (err) {
      toast.error('加载设置失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveToken = async () => {
    if (!tushareToken.trim()) {
      toast.error('请输入Tushare Token')
      return
    }
    setSaving(true)
    try {
      await updateSystemSettings({ tushare_token: tushareToken.trim() })
      toast.success('Tushare Token 已更新')
      setTokenEdited(false)
      loadSettings()
    } catch (err) {
      toast.error('保存失败: ' + (err.response?.data?.message || err.message))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <RefreshCw className="animate-spin text-gray-400" size={24} />
        <span className="ml-2 text-gray-500">加载设置...</span>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0EDFA' }}>
          <Settings size={20} style={{ color: '#513CC8' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-500">配置数据源和系统参数</p>
        </div>
      </div>

      {/* Tushare Token Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Key size={18} style={{ color: '#513CC8' }} />
          <h2 className="text-base font-semibold text-gray-900">Tushare 数据接口</h2>
          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
            商用数据源
          </span>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Tushare Pro 提供专业的 A 股行情数据，包括日线、周线、分钟线、基本面指标等。
            配置 Token 后，系统将优先使用 Tushare 获取数据，确保价格准确无误。
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">API Token</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={tushareToken}
                onChange={(e) => { setTushareToken(e.target.value); setTokenEdited(true) }}
                placeholder="请输入 Tushare Pro Token"
                className="w-full px-4 py-2.5 pr-20 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono"
              />
              <button
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition"
                title={showToken ? '隐藏' : '显示'}
              >
                {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveToken}
              disabled={saving || !tokenEdited}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
                ${tokenEdited
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}
            >
              {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? '保存中...' : '保存 Token'}
            </button>
            {!tokenEdited && settings.tushare_token && (
              <span className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle size={14} /> Token 已配置
              </span>
            )}
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-blue-700 space-y-1">
                <p>
                  <strong>获取 Token：</strong>访问{' '}
                  <a href="https://tushare.pro/register" target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-blue-900">tushare.pro</a>
                  {' '}注册并在个人中心获取 Token。
                </p>
                <p>
                  <strong>接口文档：</strong>
                  <a href="https://tushare.pro/document/2?doc_id=14" target="_blank" rel="noopener noreferrer"
                    className="underline hover:text-blue-900">https://tushare.pro/document/2?doc_id=14</a>
                </p>
                <p><strong>数据范围：</strong>日线、周线、月线K线、基本面指标（PE/PB/市值）、股票列表等。</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Source Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Database size={18} style={{ color: '#513CC8' }} />
          <h2 className="text-base font-semibold text-gray-900">数据源说明</h2>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 border border-purple-100">
              <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">Tushare Pro</span>
                <span className="ml-2 text-xs text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">主数据源</span>
              </div>
              <span className="text-xs text-gray-500">日K / 周K / 月K / 基本面</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">东方财富</span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">备用</span>
              </div>
              <span className="text-xs text-gray-500">分时 / 资金流 / 筹码峰</span>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">同花顺</span>
                <span className="ml-2 text-xs text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">备用</span>
              </div>
              <span className="text-xs text-gray-500">市场热榜</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            系统优先使用 Tushare Pro 获取行情数据，确保价格准确。当 Tushare 不可用时，自动切换到备用数据源。
          </p>
        </div>
      </div>
    </div>
  )
}
