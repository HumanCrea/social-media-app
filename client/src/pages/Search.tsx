import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useToast } from '../contexts/ToastContext'
import { useAuthStore } from '../store/authStore'

interface User {
  id: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
}

export default function Search() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'users' | 'posts'>('users')
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set())
  const { addToast } = useToast()
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()

  // Search users
  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['search', 'users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      const response = await axios.get(`/api/users/search/${encodeURIComponent(searchQuery)}`)
      
      // Check if response contains an error
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        throw new Error(response.data.error)
      }
      
      return Array.isArray(response.data) ? response.data : []
    },
    enabled: searchQuery.length > 2 && activeTab === 'users'
  })

  // Search posts (placeholder - would need backend implementation)
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['search', 'posts', searchQuery],
    queryFn: async () => {
      // This would be implemented with a posts search endpoint
      return []
    },
    enabled: searchQuery.length > 2 && activeTab === 'posts'
  })

  const followMutation = useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: 'follow' | 'unfollow' }) => {
      if (action === 'follow') {
        await axios.post(`/api/users/follow/${userId}`)
      } else {
        await axios.delete(`/api/users/follow/${userId}`)
      }
    },
    onSuccess: (data, variables) => {
      const { userId, action } = variables
      setFollowingUsers(prev => {
        const newSet = new Set(prev)
        if (action === 'follow') {
          newSet.add(userId)
        } else {
          newSet.delete(userId)
        }
        return newSet
      })
      
      addToast({
        type: 'success',
        title: action === 'follow' ? 'User followed' : 'User unfollowed',
        message: action === 'follow' ? 'You are now following this user' : 'You have unfollowed this user'
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Action failed',
        message: 'Please try again later'
      })
    }
  })

  const handleFollowToggle = (userId: string) => {
    const isFollowing = followingUsers.has(userId)
    followMutation.mutate({ 
      userId, 
      action: isFollowing ? 'unfollow' : 'follow' 
    })
  }

  const isLoading = activeTab === 'users' ? usersLoading : postsLoading
  const results = activeTab === 'users' ? users : posts

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-10">
        <div className="px-6 py-4">
          <h1 className="text-xl font-bold text-gray-900 mb-4">Search</h1>
          
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search for people, posts, topics..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Tab Navigation */}
          {searchQuery.length > 2 && (
            <div className="mt-4 border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'users'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  People
                </button>
                <button
                  onClick={() => setActiveTab('posts')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'posts'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Posts
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Search Results */}
      <div>
        {searchQuery.length === 0 ? (
          /* Search Suggestions */
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Try searching for</h2>
            <div className="space-y-3">
              <button
                onClick={() => setSearchQuery('javascript')}
                className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🟨</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">#JavaScript</p>
                    <p className="text-sm text-gray-500">Programming language</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => setSearchQuery('react')}
                className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">⚛️</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">#React</p>
                    <p className="text-sm text-gray-500">Frontend framework</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setSearchQuery('web development')}
                className="w-full text-left p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-lg">🌐</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Web Development</p>
                    <p className="text-sm text-gray-500">Building websites and applications</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : searchQuery.length <= 2 ? (
          <div className="text-center py-12 text-gray-500">
            Type at least 3 characters to search
          </div>
        ) : (
          <>
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : usersError ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-red-500 text-lg">Search Error</p>
                <p className="text-gray-400">Please try again or check your connection</p>
              </div>
            ) : results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 text-lg">No results found</p>
                <p className="text-gray-400">Try searching for something else</p>
              </div>
            ) : activeTab === 'users' ? (
              <div className="divide-y divide-gray-200">
                {Array.isArray(users) ? users.map((user) => (
                  <Link
                    key={user.id}
                    to={`/profile/${user.username}`}
                    className="block p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <img
                        className="w-12 h-12 avatar"
                        src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                        alt={user.displayName}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {user.displayName}
                        </p>
                        <p className="text-gray-500 truncate">
                          @{user.username}
                        </p>
                        {user.bio && (
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {user.bio}
                          </p>
                        )}
                      </div>
                      {currentUser?.id !== user.id && (
                        <button 
                          onClick={(e) => {
                            e.preventDefault()
                            handleFollowToggle(user.id)
                          }}
                          disabled={followMutation.isPending}
                          className={`text-sm px-4 py-2 rounded-full font-medium transition-colors disabled:opacity-50 ${
                            followingUsers.has(user.id)
                              ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              : 'bg-primary-600 text-white hover:bg-primary-700'
                          }`}
                        >
                          {followMutation.isPending 
                            ? 'Loading...' 
                            : followingUsers.has(user.id) 
                              ? 'Following' 
                              : 'Follow'
                          }
                        </button>
                      )}
                    </div>
                  </Link>
                )) : (
                  <div className="text-center py-12">
                    <p className="text-red-500">Error: User data not in expected format</p>
                    <p className="text-sm text-gray-500 mt-2">Type: {typeof users}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                Post search coming soon!
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}