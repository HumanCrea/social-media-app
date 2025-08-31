import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import PostCard from '../components/Posts/PostCard'
import { BookmarkIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'

interface Post {
  id: string
  content: string
  imageUrl?: string
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  hashtags?: Array<{
    hashtag: {
      name: string
    }
  }>
  isLiked?: boolean
  isBookmarked?: boolean
  _count: {
    likes: number
    comments: number
    bookmarks?: number
  }
}

interface BookmarksResponse {
  posts: Post[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export default function Bookmarks() {
  const { user: currentUser } = useAuthStore()

  const { data: bookmarksData, isLoading } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: async () => {
      const response = await axios.get('/api/bookmarks')
      return response.data as BookmarksResponse
    }
  })

  const handleLike = async (postId: string) => {
    try {
      await axios.post(`/api/posts/${postId}/like`)
      // Query will be invalidated by the PostActions component
    } catch (error) {
      console.error('Failed to like post:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  const posts = bookmarksData?.posts || []

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-900 backdrop-blur bg-opacity-90 dark:bg-opacity-90 border-b border-gray-200 dark:border-gray-700 px-6 py-4 mb-6">
        <div className="flex items-center space-x-4">
          <Link
            to="/home"
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center space-x-3">
              <BookmarkIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Bookmarks
                </h1>
                <p className="text-gray-500 dark:text-gray-400">
                  {bookmarksData?.pagination.total || 0} saved {(bookmarksData?.pagination.total || 0) === 1 ? 'post' : 'posts'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts */}
      <div className="space-y-0">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <BookmarkIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No bookmarks yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Save posts you want to read later by clicking the bookmark button
            </p>
            <Link
              to="/home"
              className="inline-flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              <span>Explore posts</span>
              <ArrowLeftIcon className="w-4 h-4 rotate-180" />
            </Link>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              currentUserId={currentUser?.id}
            />
          ))
        )}
      </div>
    </div>
  )
}