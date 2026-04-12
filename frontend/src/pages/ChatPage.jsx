import { useState, useEffect, useRef } from 'react'
import { listAgents, listConversations, createConversation, getMessages, sendMessage, deleteConversation } from '../services/api'
import { Send, Plus, Trash2, Bot, User, Loader2, MessageSquare, Stethoscope, TrendingUp, Brain } from 'lucide-react'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

const AGENT_ICONS = {
  smart_ask: MessageSquare,
  smart_diagnose: Stethoscope,
  main_flow: TrendingUp,
  quant_expert: Brain,
}

const AGENT_COLORS = {
  smart_ask: '#3b82f6',
  smart_diagnose: '#22c55e',
  main_flow: '#f59e0b',
  quant_expert: '#8b5cf6',
}

export default function ChatPage({ agentType }) {
  const [agents, setAgents] = useState([])
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConv, setSelectedConv] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    loadAgents()
    loadConversations()
  }, [agentType])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadAgents = async () => {
    try {
      const res = await listAgents()
      if (res.code === 0) {
        const filtered = (res.data || []).filter(a => a.agent_type === agentType)
        setAgents(filtered)
        if (filtered.length > 0) setSelectedAgent(filtered[0])
      }
    } catch (e) {}
  }

  const loadConversations = async () => {
    try {
      const res = await listConversations()
      if (res.code === 0) setConversations(res.data || [])
    } catch (e) {}
  }

  const loadMessages = async (convId) => {
    try {
      const res = await getMessages(convId)
      if (res.code === 0) setMessages(res.data || [])
    } catch (e) {}
  }

  const handleNewConversation = async () => {
    if (!selectedAgent) { toast.error('请先选择智能体'); return }
    try {
      const res = await createConversation({
        title: `${selectedAgent.name} 对话`,
        agent_id: selectedAgent.id,
      })
      if (res.code === 0) {
        setSelectedConv(res.data)
        setMessages([])
        loadConversations()
      }
    } catch (e) { toast.error('创建对话失败') }
  }

  const handleSend = async () => {
    if (!input.trim()) return
    if (!selectedConv) {
      await handleNewConversation()
      return
    }

    const userInput = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userInput, created_at: new Date().toISOString() }])
    setLoading(true)

    try {
      const res = await sendMessage(selectedConv.id, userInput)
      if (res.code === 0) {
        setMessages(prev => [...prev, res.data.ai_message])
      } else {
        toast.error(res.message)
      }
    } catch (e) {
      toast.error('发送消息失败')
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，请求失败，请检查AI模型配置。', created_at: new Date().toISOString() }])
    }
    setLoading(false)
  }

  const selectConversation = (conv) => {
    setSelectedConv(conv)
    loadMessages(conv.id)
  }

  const handleDeleteConv = async (id, e) => {
    e.stopPropagation()
    await deleteConversation(id)
    if (selectedConv?.id === id) {
      setSelectedConv(null)
      setMessages([])
    }
    loadConversations()
  }

  const Icon = AGENT_ICONS[agentType] || Brain
  const color = AGENT_COLORS[agentType] || '#8b5cf6'

  const EXAMPLES = {
    smart_ask: ['查询贵州茅台600519今日行情', '分析宁德时代300750的技术指标', '比亚迪002594最近资金流向如何？'],
    smart_diagnose: ['诊断贵州茅台600519', '帮我分析宁德时代300750的投资价值', '评估比亚迪002594当前是否适合买入'],
    main_flow: ['分析600519贵州茅台的主力动向', '最近哪些股票有大资金建仓迹象？', '分析300750宁德时代的筹码分布'],
    quant_expert: ['当前市场有哪些突破型机会？', '帮我分析半导体板块的热度和轮动', '600519贵州茅台的综合量化评分是多少？'],
  }

  return (
    <div className="flex h-full" style={{ background: '#0f1419' }}>
      {/* Conversation List */}
      <div className="w-64 border-r border-[#2d3548] flex flex-col" style={{ background: '#141820' }}>
        <div className="p-3 border-b border-[#2d3548]">
          <button onClick={handleNewConversation}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium text-white transition hover:scale-[1.02]"
            style={{ background: `${color}30`, color }}>
            <Plus size={16} /> 新对话
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.filter(c => {
            if (!selectedAgent) return true
            return c.agent_id === selectedAgent.id
          }).map(conv => (
            <div key={conv.id} onClick={() => selectConversation(conv)}
              className={`flex items-center justify-between p-3 cursor-pointer transition text-sm border-b border-[#2d3548]/30 ${
                selectedConv?.id === conv.id ? 'bg-[#1a1f2e]' : 'hover:bg-[#1a1f2e]/50'
              }`}>
              <div className="flex items-center gap-2 overflow-hidden">
                <Icon size={14} style={{ color }} />
                <span className="truncate text-gray-300">{conv.title}</span>
              </div>
              <button onClick={(e) => handleDeleteConv(conv.id, e)}
                className="text-gray-600 hover:text-red-400 flex-shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2d3548] flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
            <Icon size={18} style={{ color }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">{selectedAgent?.name || '智能体'}</h2>
            <p className="text-xs text-gray-500">{selectedAgent?.description?.slice(0, 60) || 'Hermes Agent 驱动'}</p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon size={32} style={{ color }} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">{selectedAgent?.name || '智能体'}</h3>
              <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">{selectedAgent?.description || '开始对话吧'}</p>
              <div className="space-y-2 max-w-md mx-auto">
                {(EXAMPLES[agentType] || []).map((ex, i) => (
                  <button key={i} onClick={() => { setInput(ex); if (!selectedConv) handleNewConversation() }}
                    className="w-full p-3 rounded-lg text-left text-sm text-gray-400 hover:text-white bg-[#1a1f2e] hover:bg-[#252d3f] transition border border-[#2d3548]">
                    💡 {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-blue-500/20' : ''
              }`} style={msg.role !== 'user' ? { background: `${color}20` } : {}}>
                {msg.role === 'user' ? <User size={16} className="text-blue-400" /> : <Icon size={16} style={{ color }} />}
              </div>
              <div className={`max-w-[70%] p-3 rounded-xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-500/20 text-white rounded-tr-none'
                  : 'bg-[#1a1f2e] text-gray-200 rounded-tl-none border border-[#2d3548]'
              }`}>
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_code]:bg-[#0f1419] [&_code]:px-1 [&_code]:rounded [&_pre]:bg-[#0f1419] [&_pre]:p-2 [&_pre]:rounded-lg [&_table]:text-xs [&_th]:p-1 [&_td]:p-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
                <p className="text-[10px] text-gray-600 mt-2">{new Date(msg.created_at).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Loader2 size={16} className="animate-spin" style={{ color }} />
              </div>
              <div className="bg-[#1a1f2e] p-3 rounded-xl rounded-tl-none border border-[#2d3548]">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}></span>
                  <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#2d3548]">
          <div className="flex items-center gap-3">
            <input
              type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={`向${selectedAgent?.name || '智能体'}提问...`}
              className="flex-1 py-3 px-4 bg-[#1a1f2e] border border-[#2d3548] rounded-xl text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none text-sm"
              disabled={loading}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white transition hover:scale-110 disabled:opacity-30"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}99)` }}>
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Hermes Agent · 数据来自Baostock/东方财富/新浪 · 所有结果需经独立验证
          </p>
        </div>
      </div>
    </div>
  )
}
