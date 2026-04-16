import { useState, useEffect, useRef, useCallback } from 'react'
import { getTodayPicks } from '../services/api'
import { Megaphone, X, Target, Eye, TrendingUp, ChevronRight, Sparkles, ExternalLink } from 'lucide-react'

export default function TodayPicksPopup() {
  const [picks, setPicks] = useState([])
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [currentIdx, setCurrentIdx] = useState(0)
  const scrollRef = useRef(null)
  const timerRef = useRef(null)

  // Load today's picks
  const loadPicks = useCallback(async () => {
    try {
      const res = await getTodayPicks()
      if (res?.code === 0 && res.data?.items?.length > 0) {
        setPicks(res.data.items)
        // Only show if not dismissed in this session
        const dismissKey = `picks_dismissed_${res.data.date}`
        if (!sessionStorage.getItem(dismissKey)) {
          setVisible(true)
        }
      }
    } catch (e) {
      console.error('Failed to load today picks:', e)
    }
  }, [])

  useEffect(() => {
    loadPicks()
    // Refresh every 5 minutes
    const interval = setInterval(loadPicks, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadPicks])

  // Auto-scroll through picks
  useEffect(() => {
    if (!visible || picks.length <= 1) return
    timerRef.current = setInterval(() => {
      setCurrentIdx(prev => (prev + 1) % picks.length)
    }, 5000)
    return () => clearInterval(timerRef.current)
  }, [visible, picks.length])

  // Scroll to current pick
  useEffect(() => {
    if (scrollRef.current) {
      const cards = scrollRef.current.children
      if (cards[currentIdx]) {
        cards[currentIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
      }
    }
  }, [currentIdx])

  const handleDismiss = () => {
    setVisible(false)
    setDismissed(true)
    const today = new Date().toISOString().slice(0, 10)
    sessionStorage.setItem(`picks_dismissed_${today}`, '1')
  }

  const handleReopen = () => {
    const today = new Date().toISOString().slice(0, 10)
    sessionStorage.removeItem(`picks_dismissed_${today}`)
    setVisible(true)
    setDismissed(false)
  }

  if (picks.length === 0) return null

  // Minimized floating button when dismissed
  if (!visible && dismissed) {
    return (
      <button onClick={handleReopen}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full shadow-xl flex items-center justify-center text-white animate-bounce hover:scale-110 transition-transform"
        style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)', boxShadow: '0 4px 20px rgba(245,158,11,0.4)' }}
        title="查看今日推荐">
        <Megaphone size={20} />
      </button>
    )
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-4xl px-4 pb-4">
        {/* Main popup card */}
        <div className="rounded-2xl shadow-2xl overflow-hidden border border-white/20"
          style={{
            background: 'linear-gradient(135deg, rgba(30,20,60,0.97), rgba(60,30,80,0.97))',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 -4px 40px rgba(81,60,200,0.3), 0 4px 20px rgba(0,0,0,0.3)'
          }}>

          {/* Header */}
          <div className="px-4 py-2.5 flex items-center justify-between"
            style={{ background: 'linear-gradient(90deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1), rgba(81,60,200,0.1))' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }}>
                <Megaphone size={14} className="text-white" />
              </div>
              <div>
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Sparkles size={12} className="text-yellow-400" />
                  今日推荐 · {picks.length} 只精选
                </span>
              </div>
              {/* Dot indicators */}
              {picks.length > 1 && (
                <div className="flex items-center gap-1 ml-3">
                  {picks.map((_, i) => (
                    <button key={i} onClick={() => setCurrentIdx(i)}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        i === currentIdx ? 'w-4 bg-yellow-400' : 'bg-white/30 hover:bg-white/50'
                      }`} />
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleDismiss}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition">
              <X size={14} />
            </button>
          </div>

          {/* Scrolling content */}
          <div ref={scrollRef} className="flex overflow-x-hidden">
            {picks.map((pick, idx) => (
              <div key={pick.id}
                className={`w-full flex-shrink-0 px-4 py-3 transition-opacity duration-500 ${
                  idx === currentIdx ? 'opacity-100' : 'opacity-0 absolute'
                }`}
                style={{ display: idx === currentIdx ? 'block' : 'none' }}>

                {/* Stock name row */}
                <div className="flex items-center gap-3 mb-2.5">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #513CC8, #7C3AED)' }}>
                    {pick.name?.[0] || 'S'}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-bold text-white">{pick.name}
                      <span className="text-xs text-white/40 font-normal ml-2">{pick.code}</span>
                    </h4>
                  </div>
                  <div className="text-[10px] text-white/30">{pick.pick_date}</div>
                </div>

                {/* Price ranges */}
                <div className="grid grid-cols-2 gap-3 mb-2.5">
                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium mb-0.5">
                      <Eye size={10} /> 建议关注区间
                    </div>
                    <p className="text-sm font-bold text-blue-300">
                      {pick.attention_low > 0 ? `${pick.attention_low.toFixed(2)} ~ ${pick.attention_high.toFixed(2)}` : '---'}
                    </p>
                  </div>
                  <div className="rounded-xl p-2.5" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div className="flex items-center gap-1 text-[10px] text-red-400 font-medium mb-0.5">
                      <Target size={10} /> 目标区间
                    </div>
                    <p className="text-sm font-bold text-red-300">
                      {pick.target_low > 0 ? `${pick.target_low.toFixed(2)} ~ ${pick.target_high.toFixed(2)}` : '---'}
                    </p>
                  </div>
                </div>

                {/* Reason */}
                {pick.reason && (
                  <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <p className="text-[11px] text-white/70 leading-relaxed">
                      <TrendingUp size={10} className="inline text-yellow-400 mr-1" />
                      {pick.reason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer with navigation hint */}
          {picks.length > 1 && (
            <div className="px-4 py-1.5 text-center border-t border-white/5">
              <span className="text-[9px] text-white/25">
                自动轮播 · 点击圆点切换 · {currentIdx + 1}/{picks.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
