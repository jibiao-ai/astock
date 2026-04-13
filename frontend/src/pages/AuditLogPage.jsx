import { useState, useEffect } from 'react'
import { getAuditLogs } from '../services/api'
import { Shield, Filter, ChevronLeft, ChevronRight } from 'lucide-react'

const MODULE_OPTIONS = ['', 'login', 'agent', 'market', 'strategy', 'data', 'admin', 'audit', 'other']
const MODULE_LABELS = { login: '登录', agent: '智能体', market: '行情', strategy: '策略', data: '数据', admin: '管理', audit: '审计', other: '其他' }
const MODULE_COLORS = { login: '#3B82F6', agent: '#513CC8', market: '#EF4444', strategy: '#F59E0B', data: '#22C55E', admin: '#EC4899', audit: '#06B6D4', other: '#6B7280' }

export default function AuditLogPage() {
  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [module, setModule] = useState('')
  const [username, setUsername] = useState('')

  useEffect(() => { load() }, [page, module, username])

  const load = async () => {
    try {
      const res = await getAuditLogs({ page, page_size: 20, module, username: username || undefined })
      if (res.code === 0) {
        setLogs(res.data?.items || [])
        setTotal(res.data?.total || 0)
      }
    } catch (e) {}
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">审计日志</h1>
          <p className="text-xs text-gray-400 mt-1">用户登录 · 智能体调用 · 数据访问 · 策略执行 · 全链路审计</p>
        </div>
        <div className="flex items-center gap-3">
          <input value={username} onChange={e => { setUsername(e.target.value); setPage(1) }}
            placeholder="搜索用户名"
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none w-40" />
          <select value={module} onChange={e => { setModule(e.target.value); setPage(1) }}
            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 text-sm focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none">
            <option value="">全部模块</option>
            {MODULE_OPTIONS.filter(m => m).map(m => (
              <option key={m} value={m}>{MODULE_LABELS[m] || m}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-100 bg-gray-50/50">
              <th className="text-left p-3 font-medium">时间</th>
              <th className="text-left p-3 font-medium">用户</th>
              <th className="text-center p-3 font-medium">模块</th>
              <th className="text-center p-3 font-medium">操作</th>
              <th className="text-left p-3 font-medium">目标</th>
              <th className="text-left p-3 font-medium">详情</th>
              <th className="text-center p-3 font-medium">状态</th>
              <th className="text-right p-3 font-medium">耗时</th>
              <th className="text-right p-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </td>
                <td className="p-3 text-gray-800 text-xs font-medium">{log.username || '-'}</td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium"
                    style={{ background: `${MODULE_COLORS[log.module] || '#6B7280'}10`, color: MODULE_COLORS[log.module] || '#6B7280' }}>
                    {MODULE_LABELS[log.module] || log.module}
                  </span>
                </td>
                <td className="p-3 text-center text-xs text-gray-500">{log.action}</td>
                <td className="p-3 text-xs text-gray-500 max-w-[120px] truncate">{log.target}</td>
                <td className="p-3 text-xs text-gray-400 max-w-[200px] truncate">{log.detail}</td>
                <td className="p-3 text-center">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${log.status === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}>
                    {log.status === 'success' ? '成功' : '失败'}
                  </span>
                </td>
                <td className="p-3 text-right text-xs text-gray-400">{log.duration}ms</td>
                <td className="p-3 text-right text-xs text-gray-400">{log.ip}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr><td colSpan={9} className="text-center p-8 text-gray-400">暂无审计日志</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">共 {total} 条记录</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 bg-white border border-gray-200 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-gray-500">第 {page} / {totalPages || 1} 页</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 bg-white border border-gray-200 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
