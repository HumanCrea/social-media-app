import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { useToast } from '../contexts/ToastContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const { addToast } = useToast()
  
  const login = useAuthStore(state => state.login)
  const googleLogin = useAuthStore(state => state.googleLogin)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Reset any previous errors
    setLoading(true)

    try {
      await login(email, password)
      addToast({
        type: 'success',
        title: 'Welcome back!',
        message: 'You have successfully logged in'
      })
    } catch (err: any) {
      addToast({
        type: 'error',
        title: 'Login failed',
        message: err.message || 'Please check your credentials and try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleResponse = useCallback(async (response: any) => {
    console.log('🔍 GOOGLE DEBUG - Response received:', response)
    setGoogleLoading(true)
    
    try {
      console.log('🔍 GOOGLE DEBUG - Calling googleLogin with credential')
      await googleLogin(response.credential)
      console.log('🔍 GOOGLE DEBUG - Google login successful')
      addToast({
        type: 'success',
        title: 'Welcome!',
        message: 'Successfully signed in with Google'
      })
    } catch (err: any) {
      console.error('🔍 GOOGLE DEBUG - Google login failed:', err)
      addToast({
        type: 'error',
        title: 'Google login failed',
        message: err.message || 'Authentication failed'
      })
    } finally {
      setGoogleLoading(false)
    }
  }, [googleLogin, addToast])

  // Load Google Sign-In SDK
  useEffect(() => {
    const loadGoogleScript = () => {
      if (document.getElementById('google-signin-script')) {
        console.log('🔍 GOOGLE DEBUG - Script already exists')
        return
      }
      
      console.log('🔍 GOOGLE DEBUG - Loading Google script')
      const script = document.createElement('script')
      script.id = 'google-signin-script'
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      document.head.appendChild(script)
      
      script.onload = () => {
        console.log('🔍 GOOGLE DEBUG - Script loaded successfully')
        // Add a small delay to ensure Google object is fully loaded
        setTimeout(() => {
          if (window.google) {
            console.log('🔍 GOOGLE DEBUG - Google object available, initializing...')
            try {
              window.google.accounts.id.initialize({
                client_id: '1029905618491-q5cil145uba3vui0ms0q9SlmBi2u0bBg.apps.googleusercontent.com',
                callback: handleGoogleResponse
              })
              console.log('🔍 GOOGLE DEBUG - Google initialized successfully')
            } catch (error) {
              console.error('🔍 GOOGLE DEBUG - Error initializing Google:', error)
            }
          } else {
            console.error('🔍 GOOGLE DEBUG - Google object not found after script load')
          }
        }, 100)
      }
      
      script.onerror = () => {
        console.error('🔍 GOOGLE DEBUG - Failed to load Google script')
      }
    }
    
    loadGoogleScript()
  }, [handleGoogleResponse])

  const handleGoogleLogin = () => {
    console.log('🔍 GOOGLE DEBUG - Google login clicked')
    console.log('🔍 GOOGLE DEBUG - Window.google available:', !!window.google)
    
    if (window.google) {
      console.log('🔍 GOOGLE DEBUG - Prompting Google login')
      window.google.accounts.id.prompt()
    } else {
      console.error('🔍 GOOGLE DEBUG - Google not loaded')
      addToast({
        type: 'error',
        title: 'Google Sign-In not loaded',
        message: 'Please refresh the page and try again'
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/register"
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              create a new account
            </Link>
          </p>
        </div>
        
        {/* Debug Info */}
        <div className="bg-gray-100 p-3 rounded text-xs text-gray-600 mb-4">
          <strong>Debug Info:</strong><br/>
          Local Storage: {localStorage.getItem('auth-storage') ? '✅ Found' : '❌ Empty'}<br/>
          Google SDK: {typeof window.google !== 'undefined' ? '✅ Loaded' : '❌ Not Loaded'}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="input mt-1"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="input mt-1"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>
        </form>

        {/* Divider */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <div className="mt-6 space-y-2">
            <button
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full inline-flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Connecting...' : 'Sign in with Google'}
            </button>
            
            {/* Debug Buttons */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => {
                  localStorage.clear()
                  window.location.reload()
                }}
                className="flex-1 py-1 px-2 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Clear Storage
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('🔍 DEBUG - localStorage:', localStorage.getItem('auth-storage'))
                  console.log('🔍 DEBUG - window.google:', typeof window.google, window.google)
                }}
                className="flex-1 py-1 px-2 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                Log State
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}