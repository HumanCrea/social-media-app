import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useSocketStore } from './store/socketStore'
import { useEffect } from 'react'
import ErrorBoundary from './components/ErrorBoundary'

// Auth pages
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyEmail from './pages/VerifyEmail'

// Main app pages
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import Notifications from './pages/Notifications'
import Search from './pages/Search'
import HashtagPage from './pages/HashtagPage'
import Bookmarks from './pages/Bookmarks'
import ShortVideos from './pages/ShortVideos'
import Achievements from './pages/Achievements'

function App() {
  const { user, token, initializeAuth } = useAuthStore()
  const { connect, disconnect } = useSocketStore()

  useEffect(() => {
    // Initialize auth on app start
    console.log('🔍 APP DEBUG - Initializing auth...')
    initializeAuth()
  }, [initializeAuth])

  // Debug auth state
  useEffect(() => {
    console.log('🔍 APP DEBUG - Auth state changed:')
    console.log('🔍 APP DEBUG - User:', !!user, user?.username)
    console.log('🔍 APP DEBUG - Token:', !!token, typeof token)
    console.log('🔍 APP DEBUG - Will redirect to login:', (!user || !token))
  }, [user, token])

  useEffect(() => {
    // Connect to socket when authenticated
    if (user && token) {
      connect(token)
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, token, connect, disconnect])

  // Show loading state while initializing
  if (token === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // If not authenticated, show auth pages
  if (!user || !token) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    )
  }

  // Authenticated app
  return (
    <ErrorBoundary>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile/:username?" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/search" element={<Search />} />
          <Route path="/hashtag/:hashtag" element={<HashtagPage />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/videos" element={<ShortVideos />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundary>
  )
}

export default App