import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { 
  HeartIcon, 
  ChatBubbleOvalLeftIcon, 
  ShareIcon,
  BookmarkIcon,
  ArrowPathRoundedSquareIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid'
import { useToast } from '../../contexts/ToastContext'

interface PostActionsProps {
  postId: string
  isLiked?: boolean
  isBookmarked?: boolean
  likesCount: number
  commentsCount: number
  bookmarksCount?: number
  onLike: (postId: string) => void
  onComment?: (postId: string) => void
}

export default function PostActions({ 
  postId, 
  isLiked,
  isBookmarked = false,
  likesCount, 
  commentsCount,
  bookmarksCount = 0,
  onLike,
  onComment
}: PostActionsProps) {
  const [showShareMenu, setShowShareMenu] = useState(false)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/bookmarks/${postId}`)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['bookmarks'] })
      addToast({
        type: 'success',
        title: data.bookmarked ? 'Post bookmarked' : 'Bookmark removed',
        message: data.bookmarked ? 'Post added to your bookmarks' : 'Post removed from bookmarks'
      })
    },
    onError: () => {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update bookmark. Please try again.'
      })
    }
  })

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onLike(postId)
  }

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    bookmarkMutation.mutate()
  }

  const handleShare = () => {
    setShowShareMenu(!showShareMenu)
  }

  const shareOptions = [
    { 
      label: 'Copy link', 
      action: () => {
        navigator.clipboard.writeText(window.location.href + '/post/' + postId)
        addToast({
          type: 'success',
          title: 'Link copied',
          message: 'Post link copied to clipboard'
        })
      }
    },
    { 
      label: 'Share via DM', 
      action: () => {
        addToast({
          type: 'info',
          title: 'Share via DM',
          message: 'Direct message sharing coming soon!'
        })
      }
    },
    { 
      label: 'Share to Twitter', 
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href + '/post/' + postId)}`)
      }
    }
  ]

  return (
    <div className="flex items-center justify-between mt-4 max-w-md">
      {/* Comment */}
      <button 
        onClick={() => onComment?.(postId)}
        className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-colors group"
      >
        <div className="p-2 rounded-full group-hover:bg-primary-50 transition-colors">
          <ChatBubbleOvalLeftIcon className="w-5 h-5" />
        </div>
        {commentsCount > 0 && (
          <span className="text-sm">{commentsCount}</span>
        )}
      </button>

      {/* Repost */}
      <button className="flex items-center space-x-2 text-gray-500 hover:text-green-600 transition-colors group">
        <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
          <ArrowPathRoundedSquareIcon className="w-5 h-5" />
        </div>
      </button>

      {/* Like */}
      <button
        onClick={handleLike}
        className={`flex items-center space-x-2 transition-colors group ${
          isLiked 
            ? 'text-red-500' 
            : 'text-gray-500 hover:text-red-500'
        }`}
      >
        <div className={`p-2 rounded-full transition-colors ${
          isLiked 
            ? 'bg-red-50' 
            : 'group-hover:bg-red-50'
        }`}>
          {isLiked ? (
            <HeartIconSolid className="w-5 h-5" />
          ) : (
            <HeartIcon className="w-5 h-5" />
          )}
        </div>
        {likesCount > 0 && (
          <span className="text-sm">{likesCount}</span>
        )}
      </button>

      {/* Bookmark */}
      <button
        onClick={handleBookmark}
        disabled={bookmarkMutation.isPending}
        className={`flex items-center space-x-2 transition-colors group ${
          isBookmarked 
            ? 'text-blue-500' 
            : 'text-gray-500 hover:text-blue-500'
        } ${bookmarkMutation.isPending ? 'opacity-50' : ''}`}
      >
        <div className={`p-2 rounded-full transition-colors ${
          isBookmarked 
            ? 'bg-blue-50' 
            : 'group-hover:bg-blue-50'
        }`}>
          {isBookmarked ? (
            <BookmarkIconSolid className="w-5 h-5" />
          ) : (
            <BookmarkIcon className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Share */}
      <div className="relative">
        <button
          onClick={handleShare}
          className="flex items-center space-x-2 text-gray-500 hover:text-primary-600 transition-colors group"
        >
          <div className="p-2 rounded-full group-hover:bg-primary-50 transition-colors">
            <ShareIcon className="w-5 h-5" />
          </div>
        </button>

        {/* Share Menu */}
        {showShareMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            {shareOptions.map((option, index) => (
              <button
                key={index}
                onClick={() => {
                  option.action()
                  setShowShareMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}