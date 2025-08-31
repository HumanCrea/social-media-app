import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { HeartIcon } from '@heroicons/react/24/solid'
import { useAuthStore } from '../../store/authStore'
import { formatDistanceToNow } from 'date-fns'

interface Comment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
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
  _count: {
    likes: number
    comments: number
  }
}

interface CommentModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post
  onLike: (postId: string) => void
}

export default function CommentModal({ isOpen, onClose, post, onLike }: CommentModalProps) {
  const [newComment, setNewComment] = useState('')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', post.id],
    queryFn: async () => {
      const response = await axios.get(`/api/posts/${post.id}/comments`)
      return response.data as Comment[]
    },
    enabled: isOpen
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await axios.post(`/api/posts/${post.id}/comments`, { content })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', post.id] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setNewComment('')
    }
  })

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment(e)
    }
  }

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Comments</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Post */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-3">
            <img
              className="w-12 h-12 avatar"
              src={post.author.avatar || `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`}
              alt={post.author.displayName}
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900">{post.author.displayName}</span>
                <span className="text-gray-500">@{post.author.username}</span>
                <span className="text-gray-500">·</span>
                <span className="text-gray-500 text-sm">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-gray-900 mb-3">{post.content}</p>
              {post.imageUrl && (
                <img
                  src={post.imageUrl}
                  alt="Post image"
                  className="rounded-xl max-w-full border border-gray-200 mb-3"
                />
              )}
              <div className="flex items-center space-x-6">
                <button
                  onClick={() => onLike(post.id)}
                  className="flex items-center space-x-2 text-gray-500 hover:text-red-500 transition-colors"
                >
                  <HeartIcon className="w-4 h-4" />
                  <span className="text-sm">{post._count.likes}</span>
                </button>
                <div className="flex items-center space-x-2 text-gray-500">
                  <span className="text-sm">{post._count.comments} comments</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4">
          {commentsLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex space-x-3">
                  <img
                    className="w-10 h-10 avatar"
                    src={comment.author.avatar || `https://ui-avatars.com/api/?name=${comment.author.displayName}&background=3b82f6&color=fff`}
                    alt={comment.author.displayName}
                  />
                  <div className="flex-1">
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-gray-900 text-sm">
                          {comment.author.displayName}
                        </span>
                        <span className="text-gray-500 text-sm">
                          @{comment.author.username}
                        </span>
                      </div>
                      <p className="text-gray-900">{comment.content}</p>
                    </div>
                    <div className="flex items-center space-x-4 mt-2 ml-4">
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                      </span>
                      <button className="text-xs text-gray-500 hover:text-primary-600">
                        Reply
                      </button>
                      <button className="text-xs text-gray-500 hover:text-red-500">
                        Like
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Comment */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSubmitComment} className="flex space-x-3">
            <img
              className="w-10 h-10 avatar"
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
              alt={user?.displayName}
            />
            <div className="flex-1 flex space-x-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Write a comment..."
                className="flex-1 resize-none border border-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                rows={1}
                maxLength={280}
              />
              <button
                type="submit"
                disabled={!newComment.trim() || addCommentMutation.isPending}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}