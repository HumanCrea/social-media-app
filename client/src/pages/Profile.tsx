import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import axios from 'axios'
import { useAuthStore, getFullImageUrl } from '../store/authStore'
import PostCard from '../components/Posts/PostCard'
import EditProfileModal from '../components/Modals/EditProfileModal'
import { CalendarIcon, PencilIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface UserProfile {
  id: string
  username: string
  displayName: string
  bio?: string
  avatar?: string
  coverImage?: string
  createdAt: string
  _count: {
    posts: number
    followers: number
    following: number
  }
}

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
  isLiked?: boolean
  _count: {
    likes: number
    comments: number
  }
}

export default function Profile() {
  const { username } = useParams()
  const navigate = useNavigate()
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const isOwnProfile = !username || username === currentUser?.username
  const profileUsername = username || currentUser?.username

  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', profileUsername],
    queryFn: async () => {
      const response = await axios.get(`/api/users/${profileUsername}`)
      return response.data as UserProfile
    },
    enabled: !!profileUsername
  })

  // Fetch user posts
  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['posts', 'user', profile?.id],
    queryFn: async () => {
      const response = await axios.get(`/api/posts/user/${profile?.id}`)
      return response.data as Post[]
    },
    enabled: !!profile?.id
  })

  // Check if current user is following this profile
  const { data: isFollowing } = useQuery({
    queryKey: ['isFollowing', profile?.id],
    queryFn: async () => {
      if (!profile?.id || !currentUser?.id || profile.id === currentUser.id) {
        return false
      }
      try {
        const response = await axios.get(`/api/users/${profile.id}/followers`)
        const followers = response.data
        return followers.some((follower: any) => follower.id === currentUser.id)
      } catch {
        return false
      }
    },
    enabled: !!profile?.id && !!currentUser?.id && profile?.id !== currentUser?.id
  })

  // Follow/unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.post(`/api/users/follow/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] })
    }
  })

  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/users/follow/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      queryClient.invalidateQueries({ queryKey: ['isFollowing'] })
    }
  })


  const handleFollow = () => {
    if (profile) {
      if (isFollowing) {
        unfollowMutation.mutate(profile.id)
      } else {
        followMutation.mutate(profile.id)
      }
    }
  }

  const handleEditProfile = () => {
    setIsEditModalOpen(true)
  }

  const handleLike = (postId: string) => {
    // Like functionality would be implemented here
    console.log('Like post:', postId)
  }

  const handleMessage = async () => {
    if (!profile) return
    
    try {
      // Create or get existing chat with this user
      const response = await axios.post('/api/chats', {
        participantIds: [profile.id]
      })
      
      const chatId = response.data.id
      navigate('/messages', { state: { selectedChatId: chatId } })
    } catch (error) {
      console.error('Failed to create/get chat:', error)
      // Fallback: just navigate to messages page
      navigate('/messages')
    }
  }

  if (profileLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">User not found</p>
      </div>
    )
  }

  const joinDate = formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })

  return (
    <>
      <div className="max-w-2xl mx-auto">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-primary-400 to-primary-600 dark:from-primary-600 dark:to-primary-800">
        {profile.coverImage && (
          <img
            src={getFullImageUrl(profile.coverImage) || profile.coverImage}
            alt="Cover"
            className="w-full h-full object-cover"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }}
          />
        )}
      </div>

      {/* Profile Header */}
      <div className="px-6 pb-4">
        <div className="flex items-end justify-between -mt-16 mb-4">
          <img
            className="w-32 h-32 avatar border-4 border-white dark:border-gray-900"
            src={getFullImageUrl(profile.avatar) || `https://ui-avatars.com/api/?name=${profile.displayName}&background=3b82f6&color=fff&size=128`}
            alt={profile.displayName}
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = `https://ui-avatars.com/api/?name=${profile.displayName}&background=3b82f6&color=fff&size=128`
            }}
          />
          
          <div className="mb-2 flex space-x-2">
            {isOwnProfile ? (
              <button
                onClick={handleEditProfile}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleFollow}
                  disabled={followMutation.isPending || unfollowMutation.isPending}
                  className={`px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 ${
                    isFollowing
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600'
                      : 'btn-primary'
                  }`}
                >
                  {followMutation.isPending || unfollowMutation.isPending
                    ? 'Loading...'
                    : isFollowing
                    ? 'Following'
                    : 'Follow'
                  }
                </button>
                <button
                  onClick={handleMessage}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <ChatBubbleLeftRightIcon className="w-4 h-4" />
                  <span>Message</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile Info */}
        <>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{profile.displayName}</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-2">@{profile.username}</p>
          
          {profile.bio && (
            <p className="text-gray-900 dark:text-gray-100 mb-4">{profile.bio}</p>
          )}

          <div className="flex items-center space-x-4 text-gray-500 dark:text-gray-400 mb-4">
            <div className="flex items-center">
              <CalendarIcon className="w-4 h-4 mr-1" />
              <span className="text-sm">Joined {joinDate}</span>
            </div>
          </div>

          <div className="flex space-x-6 text-sm">
            <div>
              <span className="font-bold text-gray-900 dark:text-white">{profile._count.following}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Following</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white">{profile._count.followers}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Followers</span>
            </div>
            <div>
              <span className="font-bold text-gray-900 dark:text-white">{profile._count.posts}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">Posts</span>
            </div>
          </div>
        </>
      </div>

        {/* Posts */}
        <div className="border-t border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Posts</h2>
          </div>
        
        {postsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
          </div>
        ) : !Array.isArray(posts) ? (
          <div className="text-center py-12">
            <p className="text-red-500">Error: Posts data not in expected format</p>
            <p className="text-sm text-gray-500 mt-2">Type: {typeof posts}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {isOwnProfile ? "You haven't posted anything yet" : "No posts yet"}
            </p>
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

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </>
  )
}