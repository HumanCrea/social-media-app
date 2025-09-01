import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { getFullImageUrl } from '../../store/authStore'

interface Notification {
  id: string
  type: 'like' | 'follow' | 'comment' | 'post' | 'mention'
  message: string
  isRead: boolean
  createdAt: string
  fromUser?: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  post?: {
    id: string
    content: string
  }
}

export default function ActivityFeed() {
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', 'recent'],
    queryFn: async () => {
      const response = await axios.get('/api/notifications?limit=5')
      
      // Check if response contains an error
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        throw new Error(response.data.error)
      }
      
      return Array.isArray(response.data) ? response.data as Notification[] : []
    }
  })

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return '👤'
      case 'like':
        return '❤️'
      case 'comment':
        return '💬'
      case 'post':
        return '📝'
      case 'mention':
        return '@'
      default:
        return '🔔'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Notifications</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center space-x-3 p-2">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Notifications</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🔔</div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No notifications yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h3>
        <Link 
          to="/notifications" 
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div key={notification.id} className={`flex items-center space-x-3 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${!notification.isRead ? 'bg-primary-50 dark:bg-primary-900/20' : ''}`}>
            {notification.fromUser ? (
              <Link to={`/profile/${notification.fromUser.username}`}>
                <img
                  className="w-8 h-8 avatar"
                  src={getFullImageUrl(notification.fromUser.avatar) || `https://ui-avatars.com/api/?name=${notification.fromUser.displayName}&background=3b82f6&color=fff`}
                  alt={notification.fromUser.displayName}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = `https://ui-avatars.com/api/?name=${notification.fromUser?.displayName}&background=3b82f6&color=fff`
                  }}
                />
              </Link>
            ) : (
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-sm">
                {getActivityIcon(notification.type)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100">
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            {!notification.isRead && (
              <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}