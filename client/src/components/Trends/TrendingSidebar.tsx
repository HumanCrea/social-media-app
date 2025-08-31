import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { HashtagIcon } from '@heroicons/react/24/outline'

interface Hashtag {
  id: string
  name: string
  count: number
  updatedAt: string
}

export default function TrendingSidebar() {
  // Trending hashtags component with clickable links
  const { data: trendingHashtags = [], isLoading } = useQuery({
    queryKey: ['trending-hashtags'],
    queryFn: async () => {
      const response = await axios.get('/api/hashtags/trending?limit=10')
      return response.data as Hashtag[]
    }
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trending for you</h2>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (trendingHashtags.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trending for you</h2>
        <div className="text-center py-8">
          <HashtagIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            No trending topics yet
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Trending for you</h2>
      <div className="space-y-3">
        {trendingHashtags.map((hashtag, index) => (
          <Link
            key={hashtag.id}
            to={`/hashtag/${hashtag.name}`}
            className="block cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-3 -m-3 rounded-xl transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {index + 1} · Trending
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                  #{hashtag.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {hashtag.count.toLocaleString()} {hashtag.count === 1 ? 'post' : 'posts'}
                </p>
              </div>
              <HashtagIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}