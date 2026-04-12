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
        style: { background: '#1e2536', color: '#e8eaed', border: '1px solid #2d3548' }
      }} />
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/*" element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
