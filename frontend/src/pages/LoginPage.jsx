import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../services/api'
import useStore from '../store/useStore'
import toast from 'react-hot-toast'
import { TrendingUp, Lock, User, Eye, EyeOff } from 'lucide-react'

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
      style={{ background: 'linear-gradient(135deg, #0f1419 0%, #1a1f2e 40%, #1e1028 70%, #0f1419 100%)' }}>
      
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-500/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay:'1s'}}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{animationDelay:'2s'}}></div>
        
        {/* Grid lines */}
        <svg className="absolute inset-0 w-full h-full opacity-5">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#fff" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
            <TrendingUp size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">龙策 QuantMind</h1>
          <p className="text-gray-400 text-sm">A股AI量化炒股平台 · Hermes Agent 驱动</p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <h2 className="text-xl font-semibold mb-6 text-center">登录系统</h2>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">用户名</label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  className="w-full pl-10 pr-4 py-3 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition"
                />
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm text-gray-400 mb-2">密码</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full pl-10 pr-12 py-3 bg-[#0f1419] border border-[#2d3548] rounded-lg text-white placeholder-gray-600 focus:border-amber-500 focus:outline-none transition"
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPwd ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>
          <p className="text-center text-xs text-gray-600 mt-4">
            智能量化 · 数据驱动 · AI赋能投资决策
          </p>
        </div>

        <div className="text-center mt-6 text-xs text-gray-600">
          <p>Powered by Hermes Agent · DeepSeek · Baostock · 东方财富</p>
          <p className="mt-1">龙策 QuantMind v1.0 © 2026</p>
        </div>
      </div>
    </div>
  )
}
