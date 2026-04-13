import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' }
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res.data,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const login = (username, password) => api.post('/login', { username, password })

// Dashboard
export const getDashboard = (params) => api.get('/dashboard', { params })
export const getProfile = () => api.get('/profile')

// Market
export const getMarketSentiment = (params) => api.get('/market/sentiment', { params })
export const getSectorHeat = (params) => api.get('/market/sector-heat', { params })
export const getLimitUpBoard = (params) => api.get('/market/limit-up', { params })
export const getDragonTiger = (params) => api.get('/market/dragon-tiger', { params })
export const getBoardLadder = (params) => api.get('/market/board-ladder', { params })
export const getStockQuote = (params) => api.get('/market/quote', { params })
export const getKLine = (params) => api.get('/market/kline', { params })
export const getSectorList = (params) => api.get('/market/sectors', { params })
export const getTrendChart = (params) => api.get('/market/trend', { params })
export const getTrendChart5Day = (params) => api.get('/market/trend5day', { params })
export const getChipDistribution = (params) => api.get('/market/chip', { params })
export const getStockFundFlow = (params) => api.get('/market/fund-flow', { params })
export const getConceptHeat = () => api.get('/market/concept-heat')
export const getLimitUpDownDetails = (params) => api.get('/market/limit-details', { params })
export const getSectorFundFlow = (params) => api.get('/market/sector-fund-flow', { params })

// Watchlist
export const getWatchlist = () => api.get('/watchlist')
export const addWatchlistItem = (data) => api.post('/watchlist', data)
export const removeWatchlistItem = (code) => api.delete(`/watchlist/${code}`)
export const getWatchlistQuotes = () => api.get('/watchlist/quotes')

// Agents
export const listAgents = () => api.get('/agents')
export const getAgent = (id) => api.get(`/agents/${id}`)
export const createAgent = (data) => api.post('/agents', data)
export const updateAgent = (id, data) => api.put(`/agents/${id}`, data)
export const deleteAgent = (id) => api.delete(`/agents/${id}`)

// Skills
export const listSkills = () => api.get('/skills')
export const getAgentSkills = (id) => api.get(`/agents/${id}/skills`)
export const bindAgentSkill = (data) => api.post('/agent-skills', data)

// Conversations
export const listConversations = () => api.get('/conversations')
export const createConversation = (data) => api.post('/conversations', data)
export const deleteConversation = (id) => api.delete(`/conversations/${id}`)
export const getMessages = (id) => api.get(`/conversations/${id}/messages`)
export const sendMessage = (id, content) => api.post(`/conversations/${id}/messages`, { content })

// AI Providers
export const listAIProviders = () => api.get('/ai-providers')
export const updateAIProvider = (id, data) => api.put(`/ai-providers/${id}`, data)
export const testAIProvider = (id) => api.post(`/ai-providers/${id}/test`)
export const createAIProvider = (data) => api.post('/ai-providers', data)

// Strategies
export const getStrategyList = () => api.get('/strategies')
export const getStrategySignals = (params) => api.get('/strategy-signals', { params })

// Users
export const listUsers = () => api.get('/users')
export const createUser = (data) => api.post('/users', data)
export const updateUser = (id, data) => api.put(`/users/${id}`, data)
export const deleteUser = (id) => api.delete(`/users/${id}`)

// Audit
export const getAuditLogs = (params) => api.get('/audit-logs', { params })

export default api
