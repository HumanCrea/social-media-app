import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  connect: (token: string) => void
  disconnect: () => void
  joinChat: (chatId: string) => void
  leaveChat: (chatId: string) => void
  sendMessage: (chatId: string, content: string) => void
  startTyping: (chatId: string) => void
  stopTyping: (chatId: string) => void
}

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: (token: string) => {
    const { socket: existingSocket } = get()
    
    if (existingSocket?.connected) {
      return
    }

    const socket = io((import.meta as any).env?.VITE_API_URL || 'https://social-media-app-production-5216.up.railway.app', {
      auth: {
        token
      }
    })

    socket.on('connect', () => {
      console.log('Connected to server')
      set({ isConnected: true })
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      set({ isConnected: false })
    })

    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      set({ isConnected: false })
    })

    set({ socket })
  },

  disconnect: () => {
    const { socket } = get()
    
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  joinChat: (chatId: string) => {
    const { socket } = get()
    socket?.emit('join-chat', chatId)
  },

  leaveChat: (chatId: string) => {
    const { socket } = get()
    socket?.emit('leave-chat', chatId)
  },

  sendMessage: (chatId: string, content: string) => {
    const { socket } = get()
    socket?.emit('send-message', { chatId, content })
  },

  startTyping: (chatId: string) => {
    const { socket } = get()
    socket?.emit('typing-start', chatId)
  },

  stopTyping: (chatId: string) => {
    const { socket } = get()
    socket?.emit('typing-stop', chatId)
  },
}))