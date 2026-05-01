import { useState, useEffect } from 'react'
import { getSystemSettings, updateSystemSettings, listAIProviders, createAIProvider, updateAIProvider, testAIProvider, getPushConfigs, updatePushConfig, testPushNotification } from '../services/api'
import { Settings, Key, Database, Save, Eye, EyeOff, CheckCircle, AlertCircle, RefreshCw, Brain, Bell, Send, Mail, MessageSquare, Zap, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('ai-model')
  const [loading, setLoading] = useState(true)
  // Tushare
  const [tushareToken, setTushareToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [tokenEdited, setTokenEdited] = useState(false)
  const [saving, setSaving] = useState(false)
  // AI Models
  const [aiProviders, setAiProviders] = useState([])
  const [aiSaving, setAiSaving] = useState(false)
  // Push
  const [pushConfigs, setPushConfigs] = useState([])
  const [pushSaving, setPushSaving] = useState(false)
  // Decision AI config
  const [decisionConfig, setDecisionConfig] = useState({ base_url: '', api_key: '', model: '' })
  const [decisionEdited, setDecisionEdited] = useState(false)

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [settingsRes, providersRes, pushRes] = await Promise.allSettled([
        getSystemSettings(),
        listAIProviders(),
        getPushConfigs()
      ])
      if (settingsRes.status === 'fulfilled') {
        const data = settingsRes.value?.data?.data || settingsRes.value?.data || {}
        setTushareToken(data.tushare_token || '')
        setDecisionConfig({
          base_url: data.ai_decision_base_url || '',
          api_key: data.ai_decision_api_key || '',
          model: data.ai_decision_model || 'deepseek-chat'
        })
      }
      if (providersRes.status === 'fulfilled') {
        setAiProviders(providersRes.value?.data || [])
      }
      if (pushRes.status === 'fulfilled') {
        setPushConfigs(pushRes.value?.data || [])
      }
    } catch (e) { /* silent */ }
    setLoading(false)
  }

  const handleSaveToken = async () => {
    setSaving(true)
    try {
      await updateSystemSettings({ tushare_token: tushareToken.trim() })
      toast.success('Tushare Token 已更新')
      setTokenEdited(false)
    } catch (e) {
      toast.error('保存失败')
    }
    setSaving(false)
  }

  const handleSaveDecisionAI = async () => {
    setAiSaving(true)
    try {
      await updateSystemSettings({
        ai_decision_base_url: decisionConfig.base_url,
        ai_decision_api_key: decisionConfig.api_key,
        ai_decision_model: decisionConfig.model
      })
      toast.success('AI决策模型配置已保存')
      setDecisionEdited(false)
    } catch (e) {
      toast.error('保存失败')
    }
    setAiSaving(false)
  }

  const handleUpdatePush = async (channel, data) => {
    setPushSaving(true)
    try {
      await updatePushConfig(channel, data)
      toast.success('推送配置已保存')
      loadAll()
    } catch (e) {
      toast.error('保存失败')
    }
    setPushSaving(false)
  }

  const handleTestPush = async (channel) => {
    try {
      await testPushNotification(channel)
      toast.success('测试推送已发送')
    } catch (e) {
      toast.error('测试失败: ' + (e.response?.data?.message || '网络错误'))
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

  const tabs = [
    { key: 'ai-model', label: 'AI模型', icon: Brain },
    { key: 'push', label: '推送通知', icon: Bell },
    { key: 'data-source', label: '数据源', icon: Database },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0EDFA' }}>
          <Settings size={20} style={{ color: '#513CC8' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">系统设置</h1>
          <p className="text-sm text-gray-500">配置AI模型、推送通知和数据源</p>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* AI Model Config */}
      {activeTab === 'ai-model' && (
        <div className="space-y-6">
          {/* DeepSeek / SiliconFlow Config */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Brain size={18} style={{ color: '#513CC8' }} />
              <h2 className="text-base font-semibold text-gray-900">AI买卖决策模型</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                DeepSeek / 硅基流动
              </span>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                配置用于股票买卖决策分析的AI大模型。支持 DeepSeek、硅基流动（SiliconFlow）等兼容 OpenAI 格式的API。
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">API Base URL</label>
                  <input
                    value={decisionConfig.base_url}
                    onChange={e => { setDecisionConfig(p => ({...p, base_url: e.target.value})); setDecisionEdited(true) }}
                    placeholder="https://api.deepseek.com 或 https://api.siliconflow.cn"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">模型名称</label>
                  <input
                    value={decisionConfig.model}
                    onChange={e => { setDecisionConfig(p => ({...p, model: e.target.value})); setDecisionEdited(true) }}
                    placeholder="deepseek-chat"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Key</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={decisionConfig.api_key}
                    onChange={e => { setDecisionConfig(p => ({...p, api_key: e.target.value})); setDecisionEdited(true) }}
                    placeholder="sk-..."
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveDecisionAI}
                  disabled={aiSaving || !decisionEdited}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    decisionEdited ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {aiSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  保存配置
                </button>
                {!decisionEdited && decisionConfig.api_key && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={14} /> 已配置
                  </span>
                )}
              </div>

              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-start gap-2">
                  <AlertCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-700 space-y-1">
                    <p><strong>DeepSeek：</strong>Base URL: <code className="bg-blue-100 px-1 rounded">https://api.deepseek.com</code>，模型: <code className="bg-blue-100 px-1 rounded">deepseek-chat</code></p>
                    <p><strong>硅基流动：</strong>Base URL: <code className="bg-blue-100 px-1 rounded">https://api.siliconflow.cn</code>，模型: <code className="bg-blue-100 px-1 rounded">deepseek-ai/DeepSeek-V3</code></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Push Notification Config */}
      {activeTab === 'push' && (
        <div className="space-y-4">
          {/* WeChat Work */}
          <PushConfigCard
            title="企业微信"
            icon={<MessageSquare size={18} className="text-green-600" />}
            description="通过企业微信群机器人推送买卖决策和大盘复盘"
            channel="wechat_work"
            config={pushConfigs.find(c => c.channel === 'wechat_work') || {}}
            onSave={handleUpdatePush}
            onTest={handleTestPush}
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
            helpText="在企业微信群 → 群设置 → 群机器人 → 添加机器人 → 获取Webhook地址"
          />

          {/* Feishu */}
          <PushConfigCard
            title="飞书"
            icon={<Zap size={18} className="text-blue-600" />}
            description="通过飞书群机器人推送交易决策和市场分析"
            channel="feishu"
            config={pushConfigs.find(c => c.channel === 'feishu') || {}}
            onSave={handleUpdatePush}
            onTest={handleTestPush}
            placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
            helpText="在飞书群 → 设置 → 群机器人 → 自定义机器人 → 获取Webhook地址"
          />

          {/* Email */}
          <PushConfigCard
            title="邮箱推送"
            icon={<Mail size={18} className="text-orange-600" />}
            description="通过邮件发送每日复盘和买卖决策提醒"
            channel="email"
            config={pushConfigs.find(c => c.channel === 'email') || {}}
            onSave={handleUpdatePush}
            onTest={handleTestPush}
            placeholder="接收邮箱地址"
            helpText="配置SMTP发件信息后即可推送邮件通知"
            isEmail
          />
        </div>
      )}

      {/* Data Source */}
      {activeTab === 'data-source' && (
        <div className="space-y-6">
          {/* Tushare Token */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Key size={18} style={{ color: '#513CC8' }} />
              <h2 className="text-base font-semibold text-gray-900">Tushare Pro</h2>
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                主数据源
              </span>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">
                提供A股日线/周线/涨跌停/龙虎榜/资金流向等专业行情数据，确保看板大屏和买卖决策数据准确。
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">API Token</label>
                <div className="relative">
                  <input
                    type={showToken ? 'text' : 'password'}
                    value={tushareToken}
                    onChange={e => { setTushareToken(e.target.value); setTokenEdited(true) }}
                    placeholder="请输入 Tushare Pro Token"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveToken}
                  disabled={saving || !tokenEdited}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    tokenEdited ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                  保存 Token
                </button>
                {!tokenEdited && tushareToken && (
                  <span className="flex items-center gap-1 text-xs text-green-600">
                    <CheckCircle size={14} /> 已配置
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Data Source Info */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
              <Database size={18} style={{ color: '#513CC8' }} />
              <h2 className="text-base font-semibold text-gray-900">数据源优先级</h2>
            </div>
            <div className="p-6 space-y-3">
              {[
                { name: 'Tushare Pro', badge: '主数据源', badgeColor: 'bg-purple-50 text-purple-600 border-purple-200', desc: '日K/周K/涨跌停/龙虎榜/资金流向/连板', dot: 'bg-purple-500' },
                { name: '东方财富', badge: '实时数据', badgeColor: 'bg-blue-50 text-blue-600 border-blue-200', desc: '分时图/指数/涨停池/筹码峰', dot: 'bg-blue-500' },
                { name: 'MySQL缓存', badge: '持久化', badgeColor: 'bg-green-50 text-green-600 border-green-200', desc: '历史数据/情绪/连板天梯/热力概念', dot: 'bg-green-500' },
              ].map(ds => (
                <div key={ds.name} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className={`w-2 h-2 rounded-full ${ds.dot} shrink-0`} />
                  <span className="text-sm font-medium text-gray-900 w-24">{ds.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${ds.badgeColor}`}>{ds.badge}</span>
                  <span className="text-xs text-gray-500 ml-auto">{ds.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Push Config Card Component ====================
function PushConfigCard({ title, icon, description, channel, config, onSave, onTest, placeholder, helpText, isEmail }) {
  const [enabled, setEnabled] = useState(config.enabled || false)
  const [webhookURL, setWebhookURL] = useState(config.webhook_url || '')
  const [extra, setExtra] = useState(config.extra || '')
  const [edited, setEdited] = useState(false)

  useEffect(() => {
    setEnabled(config.enabled || false)
    setWebhookURL(config.webhook_url || '')
    setExtra(config.extra || '')
  }, [config])

  const handleSave = () => {
    onSave(channel, { enabled, webhook_url: webhookURL, extra })
    setEdited(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        {icon}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={e => { setEnabled(e.target.checked); setEdited(true) }}
            className="sr-only peer"
          />
          <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-purple-600 transition after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5"></div>
        </label>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            {isEmail ? '收件邮箱' : 'Webhook URL'}
          </label>
          <input
            value={webhookURL}
            onChange={e => { setWebhookURL(e.target.value); setEdited(true) }}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {isEmail && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">SMTP配置 (JSON)</label>
            <textarea
              value={extra}
              onChange={e => { setExtra(e.target.value); setEdited(true) }}
              placeholder='{"smtp_host":"smtp.qq.com","smtp_port":"465","email_from":"xxx@qq.com","email_pass":"授权码"}'
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        <p className="text-xs text-gray-500">{helpText}</p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={!edited}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              edited ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save size={14} /> 保存
          </button>
          <button
            onClick={() => onTest(channel)}
            disabled={!webhookURL}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send size={14} /> 发送测试
          </button>
        </div>
      </div>
    </div>
  )
}
