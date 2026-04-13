import { useState, useEffect } from 'react'
import { listAgents, createAgent, updateAgent, deleteAgent, listSkills } from '../services/api'
import { Bot, Plus, Edit3, Trash2, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgentsPage() {
  const [agents, setAgents] = useState([])
  const [skills, setSkills] = useState([])
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', system_prompt: '', model: 'deepseek-chat', temperature: 0.3, max_tokens: 4096, agent_type: 'custom', icon: 'Bot' })

  useEffect(() => { load() }, [])

  const load = async () => {
    const [agRes, skRes] = await Promise.allSettled([listAgents(), listSkills()])
    if (agRes.status === 'fulfilled' && agRes.value.code === 0) setAgents(agRes.value.data || [])
    if (skRes.status === 'fulfilled' && skRes.value.code === 0) setSkills(skRes.value.data || [])
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateAgent(editing, form)
        toast.success('更新成功')
      } else {
        await createAgent(form)
        toast.success('创建成功')
      }
      setShowForm(false)
      setEditing(null)
      load()
    } catch (e) { toast.error('操作失败') }
  }

  const handleEdit = (agent) => {
    setForm(agent)
    setEditing(agent.id)
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除此智能体？')) return
    await deleteAgent(id)
    toast.success('已删除')
    load()
  }

  const TYPES = ['smart_ask', 'smart_diagnose', 'main_flow', 'quant_expert', 'custom']
  const TYPE_LABELS = { smart_ask: '智能问股', smart_diagnose: '智能诊股', main_flow: '主力动向', quant_expert: '量化专家', custom: '自定义' }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">智能体管理</h1>
          <p className="text-xs text-gray-400 mt-1">Hermes Agent · 管理AI智能体配置和技能绑定</p>
        </div>
        <button onClick={() => { setForm({ name: '', description: '', system_prompt: '', model: 'deepseek-chat', temperature: 0.3, max_tokens: 4096, agent_type: 'custom', icon: 'Bot' }); setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white font-medium shadow-md"
          style={{ background: '#513CC8', boxShadow: '0 2px 8px rgba(81,60,200,0.3)' }}>
          <Plus size={16} /> 新建智能体
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {agents.map(agent => (
          <div key={agent.id} className="glass-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#F0EDFA' }}>
                  <Bot size={20} style={{ color: '#513CC8' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">{TYPE_LABELS[agent.agent_type] || agent.agent_type}</span>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(agent)} className="p-1.5 rounded text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA]"><Edit3 size={14}/></button>
                <button onClick={() => handleDelete(agent.id)} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={14}/></button>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3 line-clamp-2">{agent.description}</p>
            <div className="flex items-center gap-2 text-[10px] text-gray-400">
              <span>模型: {agent.model}</span>
              <span>·</span>
              <span>温度: {agent.temperature}</span>
              <span>·</span>
              <span>MaxTokens: {agent.max_tokens}</span>
            </div>
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">已注册技能</h2>
        <div className="grid grid-cols-4 gap-2">
          {skills.map(skill => (
            <div key={skill.id} className="glass-card p-3">
              <h4 className="text-xs font-medium text-gray-900 mb-1">{skill.name}</h4>
              <p className="text-[10px] text-gray-400 line-clamp-2">{skill.description}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded mt-1 inline-block" style={{ background: '#F0EDFA', color: '#513CC8' }}>{skill.type}</span>
            </div>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{editing ? '编辑智能体' : '新建智能体'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">名称</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">类型</label>
                  <select value={form.agent_type} onChange={e => setForm({...form, agent_type: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none">
                    {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">描述</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={2}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">系统提示词</label>
                <textarea value={form.system_prompt} onChange={e => setForm({...form, system_prompt: e.target.value})} rows={6}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none font-mono" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">模型</label>
                  <input value={form.model} onChange={e => setForm({...form, model: e.target.value})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">温度 ({form.temperature})</label>
                  <input type="range" min="0" max="1" step="0.1" value={form.temperature} onChange={e => setForm({...form, temperature: parseFloat(e.target.value)})}
                    className="w-full accent-[#513CC8]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Max Tokens</label>
                  <input type="number" value={form.max_tokens} onChange={e => setForm({...form, max_tokens: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:text-gray-700 bg-gray-50 border border-gray-200">取消</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-xl text-sm text-white flex items-center gap-2 font-medium"
                  style={{ background: '#513CC8' }}>
                  <Save size={14} /> 保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
