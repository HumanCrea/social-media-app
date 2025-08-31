import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

interface Notification {
  id: string
  type: 'LIKE' | 'COMMENT' | 'FOLLOW' | 'MESSAGE'
  content: string
  isRead: boolean
  createdAt: string
  sender?: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  postId?: string
  commentId?: string
  followId?: string
}

export default function Notifications() {
  const queryClient = useQueryClient()

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await axios.get('/api/notifications')
      return response.data as Notification[]
    }
  })

  // Mark notification as read
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await axios.put(`/api/notifications/${notificationId}/read`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  // Mark all notifications as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await axios.put('/api/notifications/read-all')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    }
  })

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'LIKE':
        return '❤️'
      case 'COMMENT':
        return '💬'
      case 'FOLLOW':
        return '👤'
      case 'MESSAGE':
        return '✉️'
      default:
        return '🔔'
    }
  }

  const getNotificationLink = (notification: Notification) => {
    if (notification.postId) {
      return `/post/${notification.postId}`
    }
    if (notification.sender) {
      return `/profile/${notification.sender.username}`
    }
    return '#'
  }

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            {notifications.some(n => !n.isRead) && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-primary-600 hover:text-primary-700 text-sm font-medium disabled:opacity-50"
              >
                {markAllReadMutation.isPending ? 'Marking...' : 'Mark all as read'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Notifications List */}
      <div>
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔔</div>
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400">When someone interacts with your posts, you'll see it here</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <Link
              key={notification.id}
              to={getNotificationLink(notification)}
              onClick={() => handleNotificationClick(notification)}
              className={`block border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="p-6">
                <div className="flex space-x-3">
                  {/* Notification Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                    </div>
                  </div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start space-x-3">
                      {notification.sender && (
                        <img
                          className="w-8 h-8 avatar"
                          src={
                            notification.sender.avatar || 
                            `https://ui-avatars.com/api/?name=${notification.sender.displayName}&background=3b82f6&color=fff`
                          }
                          alt={notification.sender.displayName}
                        />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-900">
                          {notification.sender && (
                            <span className="font-medium">
                              {notification.sender.displayName}
                            </span>
                          )}
                          <span className={notification.sender ? 'ml-1' : ''}>
                            {notification.content}
                          </span>
                        </p>
                        
                        <p className="text-sm text-gray-500 mt-1">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {/* Unread indicator */}
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-primary-600 rounded-full flex-shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}