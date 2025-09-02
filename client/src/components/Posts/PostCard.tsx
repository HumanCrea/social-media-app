import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { EllipsisHorizontalIcon, PencilIcon, TrashIcon, ExclamationTriangleIcon, NoSymbolIcon } from '@heroicons/react/24/outline'
import PostActions from './PostActions'
import VerificationBadge from '../UI/VerificationBadge'
import OnlineStatus from '../UI/OnlineStatus'
import EditPostModal from '../Modals/EditPostModal'
import ReportModal from '../Modals/ReportModal'
import LiveReactions from '../Reactions/LiveReactions'
import { getFullImageUrl } from '../../store/authStore'

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

interface PostCardProps {
  post: Post
  onLike: (postId: string) => void
  onComment?: () => void
  currentUserId?: string
}

export default function PostCard({ post, onLike, onComment, currentUserId }: PostCardProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)
  
  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
  const isOwnPost = currentUserId === post.author.id
  const isVerified = post.author.username === 'admin' || post.author.username.includes('verified') || Math.random() > 0.7 // Mock verification
  const isOnline = Math.random() > 0.6 // Mock online status

  // Function to render content with clickable hashtags
  const renderContentWithHashtags = (content: string) => {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g
    const parts = content.split(hashtagRegex)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        // This is a hashtag (captured group)
        return (
          <Link
            key={index}
            to={`/hashtag/${part}`}
            className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            #{part}
          </Link>
        )
      }
      // Regular text
      return part
    })
  }

  const handleCommentClick = () => {
    onComment?.()
  }

  const handleEditClick = () => {
    setIsEditModalOpen(true)
    setShowOptions(false)
  }

  const handleDeleteClick = async () => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      // Handle delete post
      try {
        // This would be handled by the parent component or a mutation
        console.log('Delete post:', post.id)
      } catch (error) {
        console.error('Failed to delete post:', error)
      }
    }
    setShowOptions(false)
  }

  return (
    <article className="post-card fade-in">
      {/* Live Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <LiveReactions postId={post.id} />
      </div>
      
      <div className="relative z-0">
        <div className="flex space-x-4">
          {/* Avatar */}
          <Link to={`/profile/${post.author.username}`} className="flex-shrink-0 relative group">
            <div className="relative">
              <img
                className="w-14 h-14 avatar-glow transition-all duration-300 group-hover:scale-110"
                src={getFullImageUrl(post.author.avatar) || `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`}
                alt={post.author.displayName}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`
                }}
              />
              {isOnline && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-3 border-white shadow-lg animate-pulse" />
              )}
            </div>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-2">
                  <Link 
                    to={`/profile/${post.author.username}`}
                    className="font-semibold text-gray-900 dark:text-white hover:text-blue-600 transition-colors"
                  >
                    {post.author.displayName}
                  </Link>
                  {isVerified && (
                    <div className="animate-pulse">
                      <VerificationBadge type="verified" size="sm" />
                    </div>
                  )}
                </div>
                <Link 
                  to={`/profile/${post.author.username}`}
                  className="text-gray-500 hover:text-blue-500 transition-colors"
                >
                  @{post.author.username}
                </Link>
                <span className="text-gray-300">•</span>
                <time className="text-gray-500 text-sm hover:text-gray-700 transition-colors" dateTime={post.createdAt}>
                  {timeAgo}
                </time>
              </div>
              
              {isOwnPost && (
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 rounded-xl hover:bg-gray-100/80 transition-all duration-300 hover:scale-110 interactive"
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                  </button>
                  
                  {showOptions && (
                    <div className="absolute right-0 mt-2 w-52 card-glass shadow-2xl z-20 slide-up">
                      {isOwnPost ? (
                        <>
                          <button 
                            onClick={handleEditClick}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-white/50 rounded-t-2xl flex items-center transition-all duration-300 hover:translate-x-1"
                          >
                            <PencilIcon className="w-4 h-4 mr-3 text-blue-500" />
                            Edit post
                          </button>
                          <button 
                            onClick={handleDeleteClick}
                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50/80 rounded-b-2xl flex items-center transition-all duration-300 hover:translate-x-1"
                          >
                            <TrashIcon className="w-4 h-4 mr-3" />
                            Delete post
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setIsReportModalOpen(true)
                              setShowOptions(false)
                            }}
                            className="w-full text-left px-4 py-3 text-gray-700 hover:bg-white/50 rounded-t-2xl flex items-center transition-all duration-300 hover:translate-x-1"
                          >
                            <ExclamationTriangleIcon className="w-4 h-4 mr-3 text-yellow-500" />
                            Report post
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Block user:', post.author.id)
                              setShowOptions(false)
                            }}
                            className="w-full text-left px-4 py-3 text-red-600 hover:bg-red-50/80 rounded-b-2xl flex items-center transition-all duration-300 hover:translate-x-1"
                          >
                            <NoSymbolIcon className="w-4 h-4 mr-3" />
                            Block user
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap leading-relaxed text-[15px]">
                {renderContentWithHashtags(post.content)}
              </p>
              
              {post.imageUrl && (
                <div className="mt-4 group">
                  <img
                    src={getFullImageUrl(post.imageUrl) || post.imageUrl}
                    alt="Post image"
                    className="rounded-3xl max-w-full border border-gray-200/50 dark:border-gray-600/50 shadow-lg transition-all duration-500 group-hover:shadow-2xl group-hover:shadow-blue-500/10 cursor-pointer interactive"
                    onError={(e) => {
                      console.error('Failed to load post image:', post.imageUrl)
                    }}
                    onClick={() => {
                      // Could implement image modal here
                      console.log('Image clicked')
                    }}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="border-t border-gray-100/80 pt-4">
              <PostActions
                postId={post.id}
                isLiked={post.isLiked}
                isBookmarked={post.isBookmarked}
                likesCount={post._count.likes}
                commentsCount={post._count.comments}
                bookmarksCount={post._count.bookmarks || 0}
                onLike={onLike}
                onComment={handleCommentClick}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <EditPostModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        post={post}
      />

      {/* Report Modal */}
      <ReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        targetId={post.id}
        targetType="post"
        targetName={`Post by @${post.author.username}`}
      />
    </article>
  )
}