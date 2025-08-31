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
  register: (data: RegisterData) => Promise<void>
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

const API_URL = '/api'

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

      register: async (data: RegisterData) => {
        try {
          const response = await axios.post(`${API_URL}/auth/register`, data)
          
          const { user, token } = response.data
          
          // Set axios default header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          
          set({ user, token })
        } catch (error: any) {
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
        if (state.token && state.token !== null) {
          // Set axios default header on app initialization
          axios.defaults.headers.common['Authorization'] = `Bearer ${state.token}`
        } else {
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