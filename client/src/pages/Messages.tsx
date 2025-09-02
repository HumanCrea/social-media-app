import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useLocation } from 'react-router-dom'
import { useSocketStore } from '../store/socketStore'
import { useAuthStore } from '../store/authStore'
import { formatDistanceToNow } from 'date-fns'

interface Chat {
  id: string
  name?: string
  isGroupChat: boolean
  lastMessage?: string
  lastActivity: string
  participants: {
    id: string
    user: {
      id: string
      username: string
      displayName: string
      avatar?: string
    }
  }[]
  messages?: Message[]
}

interface Message {
  id: string
  content: string
  createdAt: string
  isRead: boolean
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  sender: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
}

export default function Messages() {
  const location = useLocation()
  const [selectedChat, setSelectedChat] = useState<string | null>(
    location.state?.selectedChatId || null
  )
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null)
  const { socket } = useSocketStore()
  const { user } = useAuthStore()

  // Fetch user's chats
  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const response = await axios.get('/api/chats')
      return response.data as Chat[]
    }
  })

  // Fetch messages for selected chat
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['messages', selectedChat],
    queryFn: async () => {
      if (!selectedChat) return []
      console.log('🔍 Loading messages for chat:', selectedChat)
      const response = await axios.get(`/api/chats/${selectedChat}/messages`)
      console.log('📨 Loaded messages:', response.data)
      return response.data as Message[]
    },
    enabled: !!selectedChat,
    refetchOnWindowFocus: true,
    refetchOnMount: true
  })

  useEffect(() => {
    setMessages(chatMessages)
  }, [chatMessages])

  useEffect(() => {
    if (socket && selectedChat) {
      socket.emit('join-chat', selectedChat)

      const handleNewMessage = (newMessage: Message) => {
        if (newMessage.sender.id !== user?.id) {
          setMessages(prev => [...prev, newMessage])
        }
      }

      const handleUserTyping = (data: { userId: string; chatId: string }) => {
        if (data.chatId === selectedChat && data.userId !== user?.id) {
          setTypingUsers(prev => new Set(prev).add(data.userId))
        }
      }

      const handleUserStopTyping = (data: { userId: string; chatId: string }) => {
        if (data.chatId === selectedChat) {
          setTypingUsers(prev => {
            const newSet = new Set(prev)
            newSet.delete(data.userId)
            return newSet
          })
        }
      }

      socket.on('new-message', handleNewMessage)
      socket.on('user-typing', handleUserTyping)
      socket.on('user-stop-typing', handleUserStopTyping)

      return () => {
        socket.off('new-message', handleNewMessage)
        socket.off('user-typing', handleUserTyping)
        socket.off('user-stop-typing', handleUserStopTyping)
        socket.emit('leave-chat', selectedChat)
      }
    }
  }, [socket, selectedChat, user?.id])

  const handleTyping = (value: string) => {
    setMessage(value)
    
    if (socket && selectedChat) {
      if (value.trim()) {
        socket.emit('typing-start', selectedChat)
      } else {
        socket.emit('typing-stop', selectedChat)
      }
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || !selectedChat) return

    const messageContent = message.trim()
    const tempId = Date.now().toString()

    // Optimistic UI update
    const newMessage = {
      id: tempId,
      content: messageContent,
      createdAt: new Date().toISOString(),
      isRead: false,
      sender: {
        id: user?.id || '',
        username: user?.username || '',
        displayName: user?.displayName || '',
        avatar: user?.avatar
      }
    }

    setMessages(prev => [...prev, newMessage])
    setMessage('')

    try {
      // Try Socket.IO first
      if (socket?.connected) {
        console.log('🔌 Sending via Socket.IO:', { chatId: selectedChat, content: messageContent })
        socket.emit('typing-stop', selectedChat)
        socket.emit('send-message', { chatId: selectedChat, content: messageContent })
      } else {
        // Fallback to REST API
        console.log('📡 Socket not connected, using API fallback')
        console.log('📤 Sending POST to:', `/api/chats/${selectedChat}/messages`)
        
        const apiResponse = await axios.post(`/api/chats/${selectedChat}/messages`, {
          content: messageContent
        })
        
        console.log('📥 API Response:', apiResponse.data)
        
        // Refresh messages after API send
        if (selectedChat) {
          console.log('🔄 Refreshing messages...')
          const response = await axios.get(`/api/chats/${selectedChat}/messages`)
          console.log('📋 Fresh messages:', response.data)
          setMessages(response.data || [])
        }
        console.log('✅ Message sent via API and messages refreshed')
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      
      // Show error message
      const errorMessage = {
        id: 'error-' + Date.now(),
        content: '❌ Failed to send message. Please try again.',
        createdAt: new Date().toISOString(),
        isRead: true,
        sender: {
          id: 'system',
          username: 'system',
          displayName: 'System',
          avatar: undefined
        }
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }

  const handleMediaUpload = async (file: File) => {
    if (!selectedChat) return

    setUploadingMedia(true)
    const tempId = Date.now().toString()

    try {
      // Create form data for file upload
      const formData = new FormData()
      formData.append('media', file)
      formData.append('chatId', selectedChat)

      // Determine media type
      const mediaType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 'document'

      // Optimistic UI update with preview
      const mediaMessage = {
        id: tempId,
        content: file.name,
        createdAt: new Date().toISOString(),
        isRead: false,
        mediaUrl: URL.createObjectURL(file),
        mediaType,
        sender: {
          id: user?.id || '',
          username: user?.username || '',
          displayName: user?.displayName || '',
          avatar: user?.avatar
        }
      }

      setMessages(prev => [...prev, mediaMessage])

      // Upload media
      const uploadResponse = await axios.post('/api/upload/media', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      // Send message with media URL
      const messageContent = file.name
      const mediaUrl = uploadResponse.data.url

      if (socket?.connected) {
        socket.emit('send-message', { 
          chatId: selectedChat, 
          content: messageContent,
          mediaUrl,
          mediaType 
        })
      } else {
        await axios.post(`/api/chats/${selectedChat}/messages`, {
          content: messageContent,
          mediaUrl,
          mediaType
        })

        if (selectedChat) {
          const response = await axios.get(`/api/chats/${selectedChat}/messages`)
          setMessages(response.data || [])
        }
      }

      console.log('✅ Media message sent successfully')
    } catch (error) {
      console.error('Failed to send media:', error)
      
      // Remove failed media message
      setMessages(prev => prev.filter(msg => msg.id !== tempId))
      
      // Show error
      const errorMessage = {
        id: 'error-' + Date.now(),
        content: '❌ Failed to send media. Please try again.',
        createdAt: new Date().toISOString(),
        isRead: true,
        sender: {
          id: 'system',
          username: 'system',
          displayName: 'System',
          avatar: undefined
        }
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setUploadingMedia(false)
      setSelectedMedia(null)
    }
  }

  const getOtherParticipant = (chat: Chat) => {
    return chat.participants.find(p => p.user.id !== user?.id)?.user
  }

  const selectedChatData = chats.find(c => c.id === selectedChat)

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="h-screen flex">
      {/* Chat List */}
      <div className="w-80 border-r border-gray-200 bg-white">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        </div>
        
        <div className="overflow-y-auto">
          {chats.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No conversations yet
            </div>
          ) : (
            chats.map((chat) => {
              const otherParticipant = getOtherParticipant(chat)
              const chatName = chat.isGroupChat ? chat.name : otherParticipant?.displayName
              const avatar = chat.isGroupChat 
                ? `https://ui-avatars.com/api/?name=${chat.name}&background=3b82f6&color=fff`
                : otherParticipant?.avatar || `https://ui-avatars.com/api/?name=${otherParticipant?.displayName}&background=3b82f6&color=fff`

              return (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat.id)}
                  className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    selectedChat === chat.id ? 'bg-primary-50 border-primary-200' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <img
                      className="w-12 h-12 avatar"
                      src={avatar}
                      alt={chatName}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {chatName}
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 truncate">
                          {chat.lastMessage}
                        </p>
                      )}
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(chat.lastActivity), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat && selectedChatData ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center space-x-3">
                <img
                  className="w-10 h-10 avatar"
                  src={
                    selectedChatData.isGroupChat
                      ? `https://ui-avatars.com/api/?name=${selectedChatData.name}&background=3b82f6&color=fff`
                      : getOtherParticipant(selectedChatData)?.avatar || 
                        `https://ui-avatars.com/api/?name=${getOtherParticipant(selectedChatData)?.displayName}&background=3b82f6&color=fff`
                  }
                  alt={selectedChatData.isGroupChat ? selectedChatData.name : getOtherParticipant(selectedChatData)?.displayName}
                />
                <div>
                  <h2 className="font-medium text-gray-900">
                    {selectedChatData.isGroupChat ? selectedChatData.name : getOtherParticipant(selectedChatData)?.displayName}
                  </h2>
                  {!selectedChatData.isGroupChat && (
                    <p className="text-sm text-gray-500">
                      @{getOtherParticipant(selectedChatData)?.username}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, index) => {
                const isOwnMessage = msg.sender.id === user?.id
                const showAvatar = index === 0 || messages[index - 1].sender.id !== msg.sender.id

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwnMessage && showAvatar && (
                        <img
                          className="w-8 h-8 avatar mr-2"
                          src={msg.sender.avatar || `https://ui-avatars.com/api/?name=${msg.sender.displayName}&background=3b82f6&color=fff`}
                          alt={msg.sender.displayName}
                        />
                      )}
                      {!isOwnMessage && !showAvatar && <div className="w-10" />}
                      
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwnMessage
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        {/* Media Content */}
                        {msg.mediaUrl && (
                          <div className="mb-2">
                            {msg.mediaType === 'image' ? (
                              <img 
                                src={msg.mediaUrl} 
                                alt="Shared image"
                                className="max-w-full h-auto rounded-lg cursor-pointer"
                                onClick={() => window.open(msg.mediaUrl, '_blank')}
                              />
                            ) : msg.mediaType === 'video' ? (
                              <video 
                                src={msg.mediaUrl} 
                                controls
                                className="max-w-full h-auto rounded-lg"
                              />
                            ) : (
                              <a 
                                href={msg.mediaUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className={`flex items-center space-x-2 p-2 rounded border ${
                                  isOwnMessage ? 'border-primary-300 bg-primary-700' : 'border-gray-300 bg-gray-100'
                                }`}
                              >
                                <span>📎</span>
                                <span>{msg.content}</span>
                              </a>
                            )}
                          </div>
                        )}
                        
                        {/* Text Content */}
                        {!msg.mediaUrl && (
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                        )}
                        
                        <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-100' : 'text-gray-500'}`}>
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {/* Typing Indicator */}
              {typingUsers.size > 0 && (
                <div className="flex justify-start">
                  <div className="flex max-w-xs lg:max-w-md">
                    <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-2xl">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                {/* Media Upload Button */}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,video/*,.pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        setSelectedMedia(file)
                        handleMediaUpload(file)
                      }
                    }}
                    className="hidden"
                  />
                  <div className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors">
                    {uploadingMedia ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                    ) : (
                      <span className="text-xl">📎</span>
                    )}
                  </div>
                </label>

                <input
                  type="text"
                  value={message}
                  onChange={(e) => handleTyping(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 input"
                />
                <button
                  type="submit"
                  disabled={!message.trim() || uploadingMedia}
                  className="btn-primary disabled:opacity-50"
                >
                  {uploadingMedia ? 'Uploading...' : 'Send'}
                </button>
              </div>

              {/* Media Preview */}
              {selectedMedia && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">
                      {selectedMedia.type.startsWith('image/') ? '🖼️' : 
                       selectedMedia.type.startsWith('video/') ? '🎥' : '📄'}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{selectedMedia.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedMedia.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMedia(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <p className="text-xl">Select a conversation</p>
              <p>Choose from your existing conversations or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}