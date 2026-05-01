import { Component } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Component error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full min-h-[400px]" style={{ background: '#F8F9FB' }}>
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 shadow-sm max-w-md">
            <AlertTriangle size={40} className="mx-auto mb-4 text-amber-500" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">页面加载异常</h3>
            <p className="text-sm text-gray-500 mb-4">
              组件渲染出错，请刷新页面重试。
            </p>
            <p className="text-xs text-gray-400 mb-4 font-mono bg-gray-50 p-2 rounded overflow-hidden text-ellipsis">
              {this.state.error?.message || '未知错误'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="px-5 py-2.5 text-white text-sm font-semibold rounded-lg hover:opacity-90 transition flex items-center gap-2 mx-auto"
              style={{ background: '#513CC8' }}
            >
              <RefreshCw size={14} />
              刷新页面
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
