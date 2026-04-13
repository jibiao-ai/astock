import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import useStore from './store/useStore'
import LoginPage from './pages/LoginPage'
import MainLayout from './components/MainLayout'

function App() {
  const { isAuthenticated } = useStore()

  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{
        style: { background: '#FFFFFF', color: '#1A1A2E', border: '1px solid #E5E7EB', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }
      }} />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
