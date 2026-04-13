import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'
import { Lock, User, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const { setAuth } = useStore()
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) { toast.error('请输入用户名和密码'); return }
    setLoading(true)
    try {
      const res = await login(username, password)
      if (res.code === 0) {
        setAuth(res.data.token, res.data.user)
        toast.success('登录成功')
        navigate('/')
      } else {
        toast.error(res.message || '登录失败')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '登录失败，请检查用户名和密码')
    }
    setLoading(false)
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #F8F9FC 0%, #F0EDFA 40%, #E8E0FF 70%, #F8F9FC 100%)' }}>
      
      {/* Subtle animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse"
          style={{ background: 'rgba(81,60,200,0.06)' }}></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse"
          style={{ background: 'rgba(81,60,200,0.04)', animationDelay: '1s' }}></div>
        
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#513CC8" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl mb-4 shadow-lg"
            style={{ background: '#513CC8', boxShadow: '0 8px 32px rgba(81,60,200,0.3)' }}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 5C9.9 5 5 9.9 5 16s4.9 11 11 11c2.4 0 4.7-.8 6.5-2.1l2.6 2.6c.4.4 1.1.4 1.6 0 .4-.4.4-1.1 0-1.6l-2.6-2.6C25.2 21.5 27 18.9 27 16c0-6.1-4.9-11-11-11z" fill="none" stroke="white" strokeWidth="2.2"/>
              <path d="M18 10l-4 6.5h3l-1 5.5 4.5-7h-3l1-5z" fill="white"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold mb-2" style={{ color: '#513CC8' }}>QuantMind</h1>
          <p className="text-gray-400 text-sm">A股AI量化炒股平台</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100"
          style={{ boxShadow: '0 20px 60px rgba(81,60,200,0.08), 0 4px 16px rgba(0,0,0,0.04)' }}>
          <h2 className="text-xl font-semibold mb-6 text-center text-gray-900">登录系统</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm text-gray-500 mb-2">用户名</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none transition"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-500 mb-2">密码</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:border-[#513CC8] focus:ring-2 focus:ring-[#513CC8]/10 focus:outline-none transition"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg disabled:opacity-50"
              style={{ background: '#513CC8', boxShadow: '0 4px 14px rgba(81,60,200,0.35)' }}>
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-400 mt-4">
            智能量化 · 数据驱动 · AI赋能投资决策
          </p>
        </div>

        <div className="text-center mt-6 text-xs text-gray-400">
          <p>Powered by Hermes Agent · DeepSeek · Baostock · 东方财富</p>
          <p className="mt-1">QuantMind v1.0 &copy; 2026</p>
        </div>
      </div>
    </div>
  )
}
