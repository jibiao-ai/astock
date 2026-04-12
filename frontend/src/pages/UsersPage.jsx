import { useState, useEffect } from 'react'
import { listUsers, createUser, updateUser, deleteUser } from '../services/api'
import { Users, Plus, Edit3, Trash2, Save, X, Shield, User } from 'lucide-react'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ username: '', password: '', display_name: '', email: '', role: 'user', is_active: true })

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      const res = await listUsers()
      if (res.code === 0) setUsers(res.data || [])
    } catch (e) {}
  }

  const handleSave = async () => {
    try {
      if (editing) {
        await updateUser(editing, form)
        toast.success('更新成功')
      } else {
        if (!form.username || !form.password) { toast.error('请填写用户名和密码'); return }
        await createUser(form)
        toast.success('创建成功')
      }
      setShowForm(false); setEditing(null); load()
    } catch (e) { toast.error('操作失败') }
  }

  const handleDelete = async (id) => {
    if (!confirm('确认删除？')) return
    await deleteUser(id); toast.success('已删除'); load()
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#0f1419' }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text">用户管理</h1>
          <p className="text-xs text-gray-500 mt-1">管理平台用户和角色权限</p>
        </div>
        <button onClick={() => { setForm({ username: '', password: '', display_name: '', email: '', role: 'user', is_active: true }); setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
          <Plus size={16}/> 新建用户
        </button>
      </div>

      <div className="glass-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-[#2d3548] bg-[#141820]">
              <th className="text-left p-3">用户</th>
              <th className="text-left p-3">邮箱</th>
              <th className="text-center p-3">角色</th>
              <th className="text-center p-3">状态</th>
              <th className="text-right p-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-[#2d3548]/30 hover:bg-[#1a1f2e]">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-amber-500 to-red-500 flex items-center justify-center text-xs text-white font-bold">
                      {u.display_name?.[0] || u.username?.[0]}
                    </div>
                    <div>
                      <p className="text-white font-medium">{u.display_name || u.username}</p>
                      <p className="text-[10px] text-gray-500">@{u.username}</p>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-gray-400">{u.email || '-'}</td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {u.role === 'admin' ? '管理员' : '用户'}
                  </span>
                </td>
                <td className="p-3 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs ${u.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {u.is_active ? '正常' : '禁用'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex justify-end gap-1">
                    <button onClick={() => { setForm(u); setEditing(u.id); setShowForm(true) }}
                      className="p-1.5 rounded text-gray-500 hover:text-blue-400"><Edit3 size={14}/></button>
                    <button onClick={() => handleDelete(u.id)}
                      className="p-1.5 rounded text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="glass-card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">{editing ? '编辑用户' : '新建用户'}</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">用户名</label>
                <input value={form.username} onChange={e => setForm({...form, username: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">密码{editing ? '(留空不修改)' : ''}</label>
                <input type="password" value={form.password || ''} onChange={e => setForm({...form, password: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">显示名</label>
                <input value={form.display_name} onChange={e => setForm({...form, display_name: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">邮箱</label>
                <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">角色</label>
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}
                  className="w-full px-3 py-2 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white text-sm focus:border-amber-500 focus:outline-none">
                  <option value="user">用户</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 bg-[#1a1f2e]">取消</button>
                <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm text-white" style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
