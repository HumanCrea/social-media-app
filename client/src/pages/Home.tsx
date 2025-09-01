import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../store/authStore'
import PostCard from '../components/Posts/PostCard'
import CreatePost from '../components/Posts/CreatePost'
import StoriesBar from '../components/Stories/StoriesBar'
import CommentModal from '../components/Modals/CommentModal'
import PollCard from '../components/Polls/PollCard'
import CreateVideoModal from '../components/Videos/CreateVideoModal'
import { VideoCameraIcon } from '@heroicons/react/24/outline'

interface Post {
  id: string
  content: string
  imageUrl?: string
  createdAt: string
  type: 'post' | 'poll'
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  isLiked?: boolean
  _count: {
    likes: number
    comments: number
  }
  // Poll specific fields
  question?: string
  options?: any[]
  totalVotes?: number
  expiresAt?: string
  allowMultipleVotes?: boolean
  hasVoted?: boolean
  isExpired?: boolean
}

export default function Home() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'feed' | 'public'>('feed')
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false)
  const [isCreateVideoOpen, setIsCreateVideoOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user's personalized feed
  const { 
    data: feedPosts = [], 
    isLoading: feedLoading,
    error: feedError 
  } = useQuery({
    queryKey: ['posts', 'feed'],
    queryFn: async () => {
      const response = await axios.get('/api/posts/feed')
      return response.data as Post[]
    },
    enabled: activeTab === 'feed'
  })

  // Fetch public timeline
  const { 
    data: publicPosts = [], 
    isLoading: publicLoading,
    error: publicError 
  } = useQuery({
    queryKey: ['posts', 'public'],
    queryFn: async () => {
      const response = await axios.get('/api/posts')
      return response.data as Post[]
    },
    enabled: activeTab === 'public'
  })

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: async (postId: string) => {
      await axios.post(`/api/posts/${postId}/like`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    }
  })

  const posts = activeTab === 'feed' ? feedPosts : publicPosts
  const isLoading = activeTab === 'feed' ? feedLoading : publicLoading
  const error = activeTab === 'feed' ? feedError : publicError

  // Debug logging
  console.log('🔍 HOME DEBUG - activeTab:', activeTab)
  console.log('🔍 HOME DEBUG - posts:', posts)
  console.log('🔍 HOME DEBUG - posts is array:', Array.isArray(posts))
  console.log('🔍 HOME DEBUG - typeof posts:', typeof posts)

  const handleLike = (postId: string) => {
    likeMutation.mutate(postId)
  }

  const handleComment = (post: Post) => {
    setSelectedPost(post)
    setIsCommentModalOpen(true)
  }

  const handleCloseCommentModal = () => {
    setIsCommentModalOpen(false)
    setSelectedPost(null)
  }

  const handlePostCreated = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] })
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
          Failed to load posts. Please try again.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900">Home</h1>
          
          {/* Tab Navigation */}
          <div className="mt-4 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('feed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'feed'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                For you
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'public'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Following
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Stories */}
      <StoriesBar />

      {/* Create Post */}
      <div className="px-6 py-4 border-b border-gray-200">
        <CreatePost onPostCreated={handlePostCreated} />
      </div>

      {/* Posts */}
      <div>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {activeTab === 'feed' 
                ? "No posts in your feed yet. Follow some users to see their posts!" 
                : "No posts yet. Be the first to post!"
              }
            </p>
          </div>
        ) : (
          Array.isArray(posts) ? posts.map((item) => {
            if (item.type === 'poll') {
              return (
                <PollCard
                  key={item.id}
                  poll={item as any}
                  currentUserId={user?.id}
                />
              )
            } else {
              return (
                <PostCard
                  key={item.id}
                  post={item}
                  onLike={handleLike}
                  onComment={() => handleComment(item)}
                  currentUserId={user?.id}
                />
              )
            }
          }) : (
            <div className="text-center py-12">
              <p className="text-red-500">Error: Posts data is not in expected format</p>
              <p className="text-sm text-gray-500 mt-2">Type: {typeof posts}</p>
            </div>
          )
        )}
      </div>

      {/* Floating Action Button for Videos */}
      <button
        onClick={() => setIsCreateVideoOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:scale-110 transition-all duration-200 z-50 group"
        title="Create Short Video"
      >
        <VideoCameraIcon className="w-6 h-6" />
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          New
        </div>
      </button>

      {/* Comment Modal */}
      {selectedPost && (
        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={handleCloseCommentModal}
          post={selectedPost}
          onLike={handleLike}
        />
      )}

      {/* Create Video Modal */}
      <CreateVideoModal
        isOpen={isCreateVideoOpen}
        onClose={() => setIsCreateVideoOpen(false)}
      />
    </div>
  )
}