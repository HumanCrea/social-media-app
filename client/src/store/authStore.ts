import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

export interface User {
  id: string
  email: string
  username: string
  displayName: string
  bio?: string
  avatar?: string
  coverImage?: string
  createdAt: string
  _count?: {
    posts: number
    followers: number
    following: number
  }
}

interface AuthState {
  user: User | null
  token: string | null | undefined
  login: (email: string, password: string) => Promise<void>
  googleLogin: (token: string) => Promise<void>
  register: (data: RegisterData) => Promise<{message: string, user?: any}>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  initializeAuth: () => void
}

interface RegisterData {
  email: string
  username: string
  displayName: string
  password: string
}

// Temporarily hardcode Railway URL to eliminate env variable issues
const API_URL = 'https://social-media-app-production-5216.up.railway.app/api'
console.log('🔍 AUTH STORE DEBUG - API_URL (hardcoded):', API_URL)
console.log('🔍 AUTH STORE DEBUG - ENV VITE_API_URL:', (import.meta as any).env?.VITE_API_URL)

// Add axios request interceptor for debugging
axios.interceptors.request.use(
  (config) => {
    const hasAuth = config.headers?.Authorization
    console.log('🔍 AXIOS REQUEST - URL:', config.url, hasAuth ? '✅ Auth' : '❌ No Auth')
    if (!hasAuth && config.url?.includes('/api/')) {
      console.warn('🔍 AXIOS WARNING - API request without auth token!')
    }
    return config
  },
  (error) => {
    console.error('🔍 AXIOS REQUEST ERROR:', error)
    return Promise.reject(error)
  }
)

// Add axios response interceptor for debugging
axios.interceptors.response.use(
  (response) => {
    const isError = response.data && typeof response.data === 'object' && 'error' in response.data
    console.log('🔍 AXIOS RESPONSE - URL:', response.config.url, 
      isError ? '❌ Error' : '✅ Success', 
      isError ? response.data.error : `(${typeof response.data})`)
    return response
  },
  (error) => {
    console.error('🔍 AXIOS RESPONSE ERROR - URL:', error.config?.url, '- Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: undefined,

      login: async (email: string, password: string) => {
        try {
          const response = await axios.post(`${API_URL}/auth/login`, {
            email,
            password,
          })
          
          const { user, token } = response.data
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({ user, token })
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Login failed')
        }
      },

      googleLogin: async (token: string) => {
        try {
          console.log('🔍 GOOGLE LOGIN DEBUG - Making request to:', `${API_URL}/auth/google`)
          console.log('🔍 GOOGLE LOGIN DEBUG - Token length:', token?.length)
          
          const response = await axios.post(`${API_URL}/auth/google`, {
            token,
          })
          
          console.log('🔍 GOOGLE LOGIN DEBUG - Response:', response.data)
          const { user, token: authToken } = response.data
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${authToken}`
          
          set({ user, token: authToken })
          console.log('🔍 GOOGLE LOGIN DEBUG - Login successful')
        } catch (error: any) {
          console.error('🔍 GOOGLE LOGIN DEBUG - Error:', error)
          console.error('🔍 GOOGLE LOGIN DEBUG - Response error:', error.response?.data)
          throw new Error(error.response?.data?.error || 'Google login failed')
        }
      },

      register: async (data: RegisterData) => {
        try {
          const url = `${API_URL}/auth/register`
          console.log('🔍 REGISTER DEBUG - Making request to:', url)
          console.log('🔍 REGISTER DEBUG - Data:', data)
          
          const response = await axios.post(url, data)
          
          console.log('🔍 REGISTER DEBUG - Response:', response.data)
          
          // Registration now returns a message about email verification, not a token
          const { message, user } = response.data
          
          // Don't set token since email verification is required
          // User will get token after email verification and login
          
          return { message, user }
        } catch (error: any) {
          console.log('🔍 REGISTER DEBUG - Error:', error)
          console.log('🔍 REGISTER DEBUG - Error response:', error.response)
          throw new Error(error.response?.data?.error || 'Registration failed')
        }
      },

      logout: () => {
        // Clear axios default header
        delete axios.defaults.headers.common['Authorization']
        
        set({ user: null, token: null })
      },

      updateProfile: async (data: Partial<User>) => {
        try {
          const response = await axios.put(`${API_URL}/users/profile`, data)
          
          set(state => ({
            user: state.user ? { ...state.user, ...response.data } : null
          }))
        } catch (error: any) {
          throw new Error(error.response?.data?.error || 'Profile update failed')
        }
      },

      initializeAuth: () => {
        const state = get()
        console.log('🔍 INIT AUTH DEBUG - Token:', state.token)
        console.log('🔍 INIT AUTH DEBUG - User:', state.user)
        if (state.token && state.token !== null) {
          // Set axios default header on app initialization
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
          console.log('🔍 INIT AUTH DEBUG - Set authorization header')
        } else {
          console.log('🔍 INIT AUTH DEBUG - No token, clearing auth')
          set({ token: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
      }),
    }
  )
)