import useStore from '../store/useStore'
import Sidebar from './Sidebar'
import DashboardPage from '../pages/DashboardPage'
import RealtimePage from '../pages/RealtimePage'
import ChatPage from '../pages/ChatPage'
import StrategiesPage from '../pages/StrategiesPage'
import SignalsPage from '../pages/SignalsPage'
import AgentsPage from '../pages/AgentsPage'
import AIModelsPage from '../pages/AIModelsPage'
import UsersPage from '../pages/UsersPage'
import AuditLogPage from '../pages/AuditLogPage'
import WatchlistPage from '../pages/WatchlistPage'

const pageMap = {
  'dashboard': DashboardPage,
  'realtime': RealtimePage,
  'watchlist': WatchlistPage,
  'smart-ask': () => <ChatPage agentType="smart_ask" />,
  'smart-diagnose': () => <ChatPage agentType="smart_diagnose" />,
  'main-flow': () => <ChatPage agentType="main_flow" />,
  'quant-expert': () => <ChatPage agentType="quant_expert" />,
  'strategies': StrategiesPage,
  'signals': SignalsPage,
  'agents': AgentsPage,
  'ai-models': AIModelsPage,
  'users': UsersPage,
  'audit-logs': AuditLogPage,
}

export default function MainLayout() {
  const { currentPage } = useStore()
  const PageComponent = pageMap[currentPage] || DashboardPage

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          <PageComponent />
        </div>
      </div>
    </div>
  )
}
