import { formatDistanceToNow } from 'date-fns'
import { Link } from 'react-router-dom'

interface ActivityItem {
  id: string
  type: 'like' | 'follow' | 'comment' | 'post'
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  target?: {
    type: 'user' | 'post'
    id: string
    name: string
  }
  createdAt: string
}

export default function ActivityFeed() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'follow',
      user: { id: '1', username: 'johndoe', displayName: 'John Doe' },
      target: { type: 'user', id: '2', name: 'Jane Smith' },
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString()
    },
    {
      id: '2',
      type: 'like',
      user: { id: '2', username: 'janesmith', displayName: 'Jane Smith' },
      target: { type: 'post', id: '1', name: 'Amazing sunset photo' },
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString()
    },
    {
      id: '3',
      type: 'post',
      user: { id: '3', username: 'mikejohnson', displayName: 'Mike Johnson' },
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    }
  ]

  const getActivityText = (activity: ActivityItem) => {
    switch (activity.type) {
      case 'follow':
        return `followed ${activity.target?.name}`
      case 'like':
        return `liked ${activity.target?.name}`
      case 'comment':
        return `commented on ${activity.target?.name}`
      case 'post':
        return 'shared a new post'
      default:
        return 'activity'
    }
  }

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
      default:
        return '🔔'
    }
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Activity</h3>
      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-sm">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <Link 
                  to={`/profile/${activity.user.username}`}
                  className="font-medium hover:underline"
                >
                  {activity.user.displayName}
                </Link>
                <span className="ml-1">{getActivityText(activity)}</span>
              </p>
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}