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
      try {
        const response = await axios.get('/api/posts/feed')
        
        // Check if response contains an error
        if (response.data && typeof response.data === 'object' && 'error' in response.data) {
          throw new Error(response.data.error)
        }
        
        // Ensure we return an array
        return Array.isArray(response.data) ? response.data as Post[] : []
      } catch (error) {
        console.error('Feed posts error:', error)
        return []
      }
    },
    enabled: activeTab === 'feed',
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Fetch public timeline
  const { 
    data: publicPosts = [], 
    isLoading: publicLoading,
    error: publicError 
  } = useQuery({
    queryKey: ['posts', 'public'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/posts')
        
        // Check if response contains an error
        if (response.data && typeof response.data === 'object' && 'error' in response.data) {
          throw new Error(response.data.error)
        }
        
        // Ensure we return an array
        return Array.isArray(response.data) ? response.data as Post[] : []
      } catch (error) {
        console.error('Public posts error:', error)
        return []
      }
    },
    enabled: activeTab === 'public',
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
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
      <div className="header sticky top-0 z-30">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              Home
            </h1>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg animate-pulse" />
          </div>
          
          {/* Tab Navigation */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl p-1 border border-white/30 shadow-lg">
            <nav className="flex space-x-2">
              <button
                onClick={() => setActiveTab('feed')}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'feed'
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                }`}
              >
                ✨ For you
              </button>
              <button
                onClick={() => setActiveTab('public')}
                className={`flex-1 py-3 px-6 rounded-xl font-semibold text-sm transition-all duration-300 ${
                  activeTab === 'public'
                    ? 'bg-white text-blue-600 shadow-lg transform scale-105'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-white/50'
                }`}
              >
                👥 Following
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Stories */}
      <div className="px-6">
        <StoriesBar />
      </div>

      {/* Create Post */}
      <div className="px-6 py-6">
        <div className="card p-6">
          <CreatePost onPostCreated={handlePostCreated} />
        </div>
      </div>

      {/* Posts */}
      <div className="px-6 space-y-6">
        {isLoading ? (
          <div className="flex flex-col items-center py-12">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 animate-spin shadow-lg"></div>
              <div className="absolute inset-2 bg-white rounded-full"></div>
            </div>
            <p className="text-gray-500 mt-4 font-medium">Loading amazing posts...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="card-glass text-center py-16 fade-in">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
              <span className="text-4xl">✨</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {activeTab === 'feed' 
                ? "Your feed is waiting" 
                : "Be the first to share!"
              }
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {activeTab === 'feed' 
                ? "Follow some users to see their amazing posts in your personalized feed" 
                : "Share your thoughts and connect with the community"
              }
            </p>
            <button className="btn-primary mt-6 interactive">
              {activeTab === 'feed' ? 'Discover People' : 'Create First Post'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.isArray(posts) ? posts.filter(item => item && item.id).map((item, index) => {
              try {
                const cardClass = index === 0 ? "post-card-featured" : ""
                if (item.type === 'poll') {
                  return (
                    <div key={item.id} className={cardClass}>
                      <PollCard
                        poll={item as any}
                        currentUserId={user?.id}
                      />
                    </div>
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
              } catch (error) {
                console.error('Error rendering post:', error, item)
                return (
                  <div key={item.id} className="card bg-red-50/80 border border-red-200/50 p-6 fade-in">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                        <span className="text-red-500">⚠️</span>
                      </div>
                      <div>
                        <p className="text-red-600 font-medium">Failed to render post</p>
                        <p className="text-red-400 text-sm">Please refresh the page</p>
                      </div>
                    </div>
                  </div>
                )
              }
            }) : (
              <div className="card-glass text-center py-12 fade-in">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-2xl">❌</span>
                </div>
                <p className="text-red-500 font-medium">Data format error</p>
                <p className="text-sm text-gray-500 mt-2">Posts data type: {typeof posts}</p>
                <button className="btn-secondary mt-4 interactive" onClick={() => window.location.reload()}>
                  Refresh Page
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Action Button for Videos */}
      <button
        onClick={() => setIsCreateVideoOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-2xl shadow-2xl hover:shadow-purple-500/25 hover:scale-110 transition-all duration-300 z-50 group glow-on-hover interactive"
        title="Create Short Video"
      >
        <VideoCameraIcon className="w-7 h-7 mx-auto" />
        <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 opacity-0 group-hover:opacity-100 transition-all duration-300 animate-bounce">
          ✨ New
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-700 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
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