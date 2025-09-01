import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Link } from 'react-router-dom'
import TrendingSidebar from '../Trends/TrendingSidebar'
import ActivityFeed from '../Activity/ActivityFeed'
import { getFullImageUrl } from '../../store/authStore'
import { useAuthStore } from '../../store/authStore'

interface SuggestedUser {
  id: string
  username: string
  displayName: string
  avatar?: string
  bio?: string
}

export default function RightSidebar() {
  const [searchQuery, setSearchQuery] = useState('')
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  
  // Fetch suggested users (users not followed)
  const { data: suggestedUsers = [], isLoading: suggestedLoading } = useQuery({
    queryKey: ['suggested-users'],
    queryFn: async () => {
      const response = await axios.get('/api/users/suggested?limit=3')
      
      // Check if response contains an error
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        throw new Error(response.data.error)
      }
      
      return Array.isArray(response.data) ? response.data as SuggestedUser[] : []
    }
  })

  // Search users
  const { data: searchResults = [], isLoading: searchLoading } = useQuery({
    queryKey: ['search-users', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return []
      const response = await axios.get(`/api/users/search/${encodeURIComponent(searchQuery)}`)
      return response.data as SuggestedUser[]
    },
    enabled: searchQuery.length > 2
  })

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/users/follow/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] })
    }
  })

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* Search */}
        <div>
          <div className="relative">
            <input
              type="text"
              placeholder="Search people..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-full focus:outline-none focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-primary-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length > 2 && (
            <div className="mt-4">
              {searchLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  {searchResults.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No users found
                    </p>
                  ) : (
                    Array.isArray(searchResults) ? searchResults.map((user) => (
                      <Link
                        key={user.id}
                        to={`/profile/${user.username}`}
                        className="flex items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <img
                          className="w-10 h-10 avatar"
                          src={getFullImageUrl(user.avatar) || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                          alt={user.displayName}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`
                          }}
                        />
                        <div className="ml-3 flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {user.displayName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                            @{user.username}
                          </p>
                        </div>
                      </Link>
                    )) : (
                      <div className="text-center py-4">
                        <p className="text-sm text-red-500">Error: Search data not in expected format</p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Trending Topics */}
        <TrendingSidebar />

        {/* Activity Feed */}
        <ActivityFeed />

        {/* Who to follow */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Who to follow</h3>
          {suggestedLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
                    <div className="ml-3">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 mb-1"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                    </div>
                  </div>
                  <div className="h-8 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
                </div>
              ))}
            </div>
          ) : suggestedUsers.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm text-gray-500 dark:text-gray-400">No suggestions available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {suggestedUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <Link to={`/profile/${user.username}`} className="flex items-center flex-1 min-w-0">
                    <img
                      className="w-10 h-10 avatar"
                      src={getFullImageUrl(user.avatar) || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                      alt={user.displayName}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.src = `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`
                      }}
                    />
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{user.displayName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">@{user.username}</p>
                    </div>
                  </Link>
                  <button
                    onClick={() => followMutation.mutate(user.id)}
                    disabled={followMutation.isPending}
                    className="btn-outline text-sm disabled:opacity-50"
                  >
                    {followMutation.isPending ? 'Following...' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}