import useStore from '../store/useStore'
import { 
  LayoutDashboard, TrendingUp, Brain, MessageSquare, Stethoscope, 
  Crown, BarChart3, Settings, Users, Shield, ChevronLeft, ChevronRight,
  Activity, Zap, Bot, Database, FileText
} from 'lucide-react'

const menuItems = [
  { key: 'dashboard', label: '看板大屏', icon: LayoutDashboard, group: '市场总览' },
  { key: 'realtime', label: '实时行情', icon: TrendingUp, group: '市场总览' },
  { key: 'smart-ask', label: '智能问股', icon: MessageSquare, group: 'AI智能体' },
  { key: 'smart-diagnose', label: '智能诊股', icon: Stethoscope, group: 'AI智能体' },
  { key: 'main-flow', label: '主力动向', icon: Activity, group: 'AI智能体' },
  { key: 'quant-expert', label: '量化专家', icon: Brain, group: 'AI智能体' },
  { key: 'strategies', label: '策略中心', icon: Crown, group: '量化策略' },
  { key: 'signals', label: '策略信号', icon: Zap, group: '量化策略' },
  { key: 'agents', label: '智能体管理', icon: Bot, group: '系统管理' },
  { key: 'ai-models', label: 'AI模型管理', icon: Database, group: '系统管理' },
  { key: 'users', label: '用户管理', icon: Users, group: '系统管理' },
  { key: 'audit-logs', label: '审计日志', icon: Shield, group: '系统管理' },
]

export default function Sidebar() {
  const { currentPage, setCurrentPage, sidebarCollapsed, toggleSidebar, user, logout } = useStore()

  const groups = [...new Set(menuItems.map(i => i.group))]

  return (
    <div className={`h-full flex flex-col border-r border-[#2d3548] transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}
      style={{ background: '#141820' }}>
      
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-[#2d3548]">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
          <TrendingUp size={18} className="text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="ml-3 overflow-hidden">
            <h1 className="text-sm font-bold gradient-text whitespace-nowrap">龙策 QuantMind</h1>
            <p className="text-[10px] text-gray-500 whitespace-nowrap">AI量化平台</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="flex-1 overflow-y-auto py-2">
        {groups.map(group => (
          <div key={group}>
            {!sidebarCollapsed && (
              <div className="px-4 py-2 text-[10px] text-gray-600 uppercase tracking-wider">{group}</div>
            )}
            {menuItems.filter(i => i.group === group).map(item => {
              const Icon = item.icon
              const active = currentPage === item.key
              return (
                <button key={item.key} onClick={() => setCurrentPage(item.key)}
                  className={`w-full flex items-center px-3 py-2.5 mx-1 rounded-lg transition-all text-sm
                    ${active 
                      ? 'bg-gradient-to-r from-amber-500/20 to-red-500/10 text-amber-400 border-l-2 border-amber-500' 
                      : 'text-gray-400 hover:text-white hover:bg-[#1a1f2e]'}`}
                  title={item.label}>
                  <Icon size={18} className={`flex-shrink-0 ${sidebarCollapsed ? 'mx-auto' : ''}`} />
                  {!sidebarCollapsed && <span className="ml-3 whitespace-nowrap">{item.label}</span>}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-[#2d3548] p-3">
        {!sidebarCollapsed && user && (
          <div className="flex items-center mb-2 px-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-center text-xs text-white font-bold">
              {user.display_name?.[0] || user.username?.[0] || 'U'}
            </div>
            <div className="ml-2 overflow-hidden">
              <p className="text-xs text-white truncate">{user.display_name || user.username}</p>
              <p className="text-[10px] text-gray-500">{user.role === 'admin' ? '管理员' : '用户'}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-1">
          <button onClick={toggleSidebar} className="flex-1 flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-white hover:bg-[#1a1f2e] transition">
            {sidebarCollapsed ? <ChevronRight size={16}/> : <ChevronLeft size={16}/>}
          </button>
          {!sidebarCollapsed && (
            <button onClick={logout} className="flex-1 flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition text-xs">
              退出
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
