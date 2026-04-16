import { useState, useEffect, useCallback } from 'react'
import { listStockPicks, createStockPick, updateStockPick, deleteStockPick } from '../services/api'
import { Plus, Trash2, RefreshCw, Megaphone, Edit3, X, Target, Eye, TrendingUp, Calendar, Check } from 'lucide-react'
import toast from 'react-hot-toast'

export default function StockPickPage() {
  const [picks, setPicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10))
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    code: '', name: '', attention_low: '', attention_high: '',
    target_low: '', target_high: '', reason: '', pick_date: new Date().toISOString().slice(0, 10)
  })

  const loadPicks = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listStockPicks({ date: filterDate, page_size: 100 })
      if (res?.code === 0) setPicks(res.data?.items || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [filterDate])

  useEffect(() => { loadPicks() }, [loadPicks])

  const resetForm = () => {
    setForm({
      code: '', name: '', attention_low: '', attention_high: '',
      target_low: '', target_high: '', reason: '', pick_date: new Date().toISOString().slice(0, 10)
    })
    setEditing(null)
  }

  const handleCreate = () => { resetForm(); setShowForm(true) }

  const handleEdit = (pick) => {
    setForm({
      code: pick.code, name: pick.name,
      attention_low: pick.attention_low || '', attention_high: pick.attention_high || '',
      target_low: pick.target_low || '', target_high: pick.target_high || '',
      reason: pick.reason || '', pick_date: pick.pick_date || new Date().toISOString().slice(0, 10)
    })
    setEditing(pick)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.code) { toast.error('请输入股票代码'); return }
    const payload = {
      ...form,
      attention_low: parseFloat(form.attention_low) || 0,
      attention_high: parseFloat(form.attention_high) || 0,
      target_low: parseFloat(form.target_low) || 0,
      target_high: parseFloat(form.target_high) || 0,
    }
    try {
      if (editing) {
        const res = await updateStockPick(editing.id, payload)
        if (res?.code === 0) { toast.success('更新成功'); setShowForm(false); loadPicks() }
        else toast.error(res?.message || '更新失败')
      } else {
        const res = await createStockPick(payload)
        if (res?.code === 0) { toast.success('推荐已发布'); setShowForm(false); loadPicks() }
        else toast.error(res?.message || '创建失败')
      }
    } catch (e) { toast.error('操作失败') }
  }

  const handleDelete = async (pick) => {
    if (!confirm(`确定删除推荐 ${pick.name}(${pick.code})?`)) return
    try {
      const res = await deleteStockPick(pick.id)
      if (res?.code === 0) { toast.success('已删除'); loadPicks() }
    } catch (e) { toast.error('删除失败') }
  }

  const handleToggleActive = async (pick) => {
    try {
      const res = await updateStockPick(pick.id, { is_active: !pick.is_active })
      if (res?.code === 0) { loadPicks() }
    } catch (e) { toast.error('操作失败') }
  }

  return (
    <div className="p-4 space-y-4 min-h-screen" style={{ background: '#F8F9FC' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
            <Megaphone size={24} className="text-orange-500" /> 今日推荐管理
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Admin专属 · 录入推荐个股后会以弹窗滚屏方式推送给所有用户
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-200 text-xs focus:outline-none focus:border-[#513CC8]" />
          <button onClick={loadPicks} className="p-2 rounded-lg text-gray-400 hover:text-[#513CC8] hover:bg-[#F0EDFA] transition">
            <RefreshCw size={16} />
          </button>
          <button onClick={handleCreate}
            className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition hover:shadow-lg"
            style={{ background: '#513CC8', boxShadow: '0 2px 8px rgba(81,60,200,0.3)' }}>
            <Plus size={16} /> 发布推荐
          </button>
        </div>
      </div>

      {/* Picks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-400">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2" /> 加载中...
          </div>
        ) : picks.length === 0 ? (
          <div className="col-span-full glass-card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: '#FFF7ED' }}>
              <Megaphone size={32} className="text-orange-500" />
            </div>
            <h3 className="text-lg text-gray-700 mb-2 font-medium">暂无推荐记录</h3>
            <p className="text-sm text-gray-400 mb-4">点击「发布推荐」按钮录入今日推荐个股</p>
            <button onClick={handleCreate}
              className="px-5 py-2.5 rounded-xl text-sm text-white font-medium"
              style={{ background: '#513CC8' }}>
              <Plus size={16} className="inline mr-1" /> 发布推荐
            </button>
          </div>
        ) : picks.map(pick => (
          <div key={pick.id} className={`glass-card p-4 relative overflow-hidden transition-all hover:shadow-lg ${!pick.is_active ? 'opacity-60' : ''}`}>
            {/* Active badge */}
            {pick.is_active && (
              <div className="absolute top-0 right-0 px-3 py-1 text-[9px] font-bold text-white rounded-bl-xl"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
                推送中
              </div>
            )}

            {/* Stock header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #513CC8, #7C3AED)' }}>
                {pick.name?.[0] || 'S'}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-gray-800">{pick.name}</h3>
                <p className="text-[11px] text-gray-400">{pick.code} · {pick.pick_date}</p>
              </div>
            </div>

            {/* Price ranges */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-blue-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-blue-600 font-medium mb-1">
                  <Eye size={10} /> 建议关注区间
                </div>
                <p className="text-sm font-bold text-blue-700">
                  {pick.attention_low > 0 ? `${pick.attention_low.toFixed(2)} - ${pick.attention_high.toFixed(2)}` : '---'}
                </p>
              </div>
              <div className="bg-red-50 rounded-xl p-2.5">
                <div className="flex items-center gap-1 text-[10px] text-red-600 font-medium mb-1">
                  <Target size={10} /> 目标区间
                </div>
                <p className="text-sm font-bold text-red-700">
                  {pick.target_low > 0 ? `${pick.target_low.toFixed(2)} - ${pick.target_high.toFixed(2)}` : '---'}
                </p>
              </div>
            </div>

            {/* Reason */}
            {pick.reason && (
              <div className="bg-gray-50 rounded-xl p-2.5 mb-3">
                <p className="text-[11px] text-gray-600 leading-relaxed line-clamp-3">{pick.reason}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
              <button onClick={() => handleToggleActive(pick)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium transition ${
                  pick.is_active ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'
                }`}>
                <Check size={12} /> {pick.is_active ? '推送中' : '已暂停'}
              </button>
              <button onClick={() => handleEdit(pick)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium text-[#513CC8] bg-[#F0EDFA] hover:bg-[#E5E0F5] transition">
                <Edit3 size={12} /> 编辑
              </button>
              <button onClick={() => handleDelete(pick)}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-medium text-red-500 bg-red-50 hover:bg-red-100 transition">
                <Trash2 size={12} /> 删除
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #F0EDFA, #FFF7ED)' }}>
              <div>
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Megaphone size={20} className="text-orange-500" />
                  {editing ? '编辑推荐' : '发布今日推荐'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">录入推荐个股信息，将自动推送给所有用户</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-white/60 transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Stock code & name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">股票代码 *</label>
                  <input type="text" value={form.code} onChange={e => setForm({...form, code: e.target.value})}
                    placeholder="如 600519"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium mb-1 block">股票名称</label>
                  <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                    placeholder="如 贵州茅台"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10" />
                </div>
              </div>

              {/* Attention range */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                  <Eye size={12} className="text-blue-500" /> 建议关注区间
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={form.attention_low}
                    onChange={e => setForm({...form, attention_low: e.target.value})}
                    placeholder="下限价格"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10" />
                  <input type="number" step="0.01" value={form.attention_high}
                    onChange={e => setForm({...form, attention_high: e.target.value})}
                    placeholder="上限价格"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/10" />
                </div>
              </div>

              {/* Target range */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                  <Target size={12} className="text-red-500" /> 目标区间
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input type="number" step="0.01" value={form.target_low}
                    onChange={e => setForm({...form, target_low: e.target.value})}
                    placeholder="目标下限"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10" />
                  <input type="number" step="0.01" value={form.target_high}
                    onChange={e => setForm({...form, target_high: e.target.value})}
                    placeholder="目标上限"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/10" />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 flex items-center gap-1">
                  <Calendar size={12} /> 推荐日期
                </label>
                <input type="date" value={form.pick_date} onChange={e => setForm({...form, pick_date: e.target.value})}
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10" />
              </div>

              {/* Reason */}
              <div>
                <label className="text-xs text-gray-500 font-medium mb-1 block">推荐理由</label>
                <textarea value={form.reason} onChange={e => setForm({...form, reason: e.target.value})}
                  rows={3} placeholder="输入推荐逻辑和理由..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 resize-none" />
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
              <button onClick={() => setShowForm(false)}
                className="px-5 py-2.5 rounded-xl text-sm text-gray-500 bg-white border border-gray-200 hover:bg-gray-50 transition">
                取消
              </button>
              <button onClick={handleSave}
                className="px-5 py-2.5 rounded-xl text-sm text-white font-medium transition hover:shadow-lg"
                style={{ background: '#513CC8' }}>
                {editing ? '保存修改' : '发布推荐'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
