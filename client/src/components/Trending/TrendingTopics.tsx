import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline'

interface TrendingTopic {
  id: string
  hashtag: string
  posts: number
  category: string
  isRising?: boolean
}

export default function TrendingTopics() {
  const trendingTopics: TrendingTopic[] = [
    { id: '1', hashtag: 'DoorToMe', posts: 15200, category: 'Technology', isRising: true },
    { id: '2', hashtag: 'WebDevelopment', posts: 8700, category: 'Programming' },
    { id: '3', hashtag: 'ReactJS', posts: 12400, category: 'Technology' },
    { id: '4', hashtag: 'SocialMedia', posts: 9800, category: 'Tech' },
    { id: '5', hashtag: 'JavaScript', posts: 18900, category: 'Programming', isRising: true },
    { id: '6', hashtag: 'TypeScript', posts: 5100, category: 'Programming' },
    { id: '7', hashtag: 'OpenSource', posts: 6800, category: 'Technology' },
    { id: '8', hashtag: 'TechNews', posts: 4200, category: 'Technology' }
  ]

  const formatCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`
    }
    return count.toString()
  }

  return (
    <div className="bg-gray-50 rounded-2xl p-4">
      <div className="flex items-center space-x-2 mb-3">
        <ArrowTrendingUpIcon className="w-5 h-5 text-primary-600" />
        <h3 className="text-lg font-bold text-gray-900">Trending</h3>
      </div>
      
      <div className="space-y-3">
        {trendingTopics.map((topic, index) => (
          <div
            key={topic.id}
            className="hover:bg-gray-100 p-2 rounded-lg cursor-pointer transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">{index + 1}</span>
                  {topic.isRising && (
                    <div className="flex items-center space-x-1">
                      <ArrowTrendingUpIcon className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-500 font-medium">Rising</span>
                    </div>
                  )}
                </div>
                <p className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                  #{topic.hashtag}
                </p>
                <p className="text-sm text-gray-500">
                  {topic.category} • {formatCount(topic.posts)} posts
                </p>
              </div>
            </div>
          </div>
        ))}
        
        <button className="w-full text-left text-primary-600 hover:text-primary-700 text-sm font-medium py-2">
          Show more
        </button>
      </div>
    </div>
  )
}