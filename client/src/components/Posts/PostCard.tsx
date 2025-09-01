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
    <article className="relative border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
      {/* Live Reactions Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <LiveReactions postId={post.id} />
      </div>
      
      <div className="p-6 relative z-0">
        <div className="flex space-x-3">
          {/* Avatar */}
          <Link to={`/profile/${post.author.username}`} className="flex-shrink-0 relative">
            <img
              className="w-12 h-12 avatar"
              src={getFullImageUrl(post.author.avatar) || `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`}
              alt={post.author.displayName}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.src = `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`
              }}
            />
            <div className="absolute -bottom-1 -right-1">
              <OnlineStatus isOnline={isOnline} size="md" />
            </div>
          </Link>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Link 
                    to={`/profile/${post.author.username}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {post.author.displayName}
                  </Link>
                  {isVerified && <VerificationBadge type="verified" size="sm" />}
                </div>
                <Link 
                  to={`/profile/${post.author.username}`}
                  className="text-gray-500 hover:underline"
                >
                  @{post.author.username}
                </Link>
                <span className="text-gray-500">·</span>
                <time className="text-gray-500 text-sm" dateTime={post.createdAt}>
                  {timeAgo}
                </time>
              </div>
              
              {isOwnPost && (
                <div className="relative">
                  <button
                    onClick={() => setShowOptions(!showOptions)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  
                  {showOptions && (
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                      {isOwnPost ? (
                        <>
                          <button 
                            onClick={handleEditClick}
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center"
                          >
                            <PencilIcon className="w-4 h-4 mr-2" />
                            Edit post
                          </button>
                          <button 
                            onClick={handleDeleteClick}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg flex items-center"
                          >
                            <TrashIcon className="w-4 h-4 mr-2" />
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
                            className="w-full text-left px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-t-lg flex items-center"
                          >
                            <ExclamationTriangleIcon className="w-4 h-4 mr-2" />
                            Report post
                          </button>
                          <button 
                            onClick={() => {
                              console.log('Block user:', post.author.id)
                              setShowOptions(false)
                            }}
                            className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 rounded-b-lg flex items-center"
                          >
                            <NoSymbolIcon className="w-4 h-4 mr-2" />
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
            <div className="mt-2">
              <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                {renderContentWithHashtags(post.content)}
              </p>
              
              {post.imageUrl && (
                <div className="mt-3">
                  <img
                    src={post.imageUrl}
                    alt="Post image"
                    className="rounded-2xl max-w-full border border-gray-200 dark:border-gray-600"
                  />
                </div>
              )}
            </div>

            {/* Actions */}
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