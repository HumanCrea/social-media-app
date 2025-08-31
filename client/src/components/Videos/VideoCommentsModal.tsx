import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { useAuthStore } from '../../store/authStore'

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

interface CommentsResponse {
  comments: Comment[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

interface VideoCommentsModalProps {
  videoId: string
  isOpen: boolean
  onClose: () => void
}

export default function VideoCommentsModal({ videoId, isOpen, onClose }: VideoCommentsModalProps) {
  const [newComment, setNewComment] = useState('')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch comments
  const { data, isLoading, error } = useQuery({
    queryKey: ['video-comments', videoId],
    queryFn: async () => {
      const response = await axios.get(`/api/videos/${videoId}/comments`)
      return response.data as CommentsResponse
    },
    enabled: isOpen
  })

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await axios.post(`/api/videos/${videoId}/comments`, { content })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['video-comments', videoId] })
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      setNewComment('')
    }
  })

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim())
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Comments {data?.pagination.total ? `(${data.pagination.total})` : ''}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          )}

          {error && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Failed to load comments
            </div>
          )}

          {data?.comments?.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No comments yet. Be the first to comment!
            </div>
          )}

          {data?.comments?.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <img
                className="w-8 h-8 rounded-full flex-shrink-0"
                src={comment.author.avatar || `https://ui-avatars.com/api/?name=${comment.author.displayName}&background=3b82f6&color=fff`}
                alt={comment.author.displayName}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {comment.author.displayName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    @{comment.author.username}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-900 dark:text-gray-100 break-words">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Add Comment Form */}
        {user && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <form onSubmit={handleSubmitComment} className="flex space-x-3">
              <img
                className="w-8 h-8 rounded-full flex-shrink-0"
                src={user.avatar || `https://ui-avatars.com/api/?name=${user.displayName}&background=3b82f6&color=fff`}
                alt={user.displayName}
              />
              <div className="flex-1 flex space-x-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                  disabled={addCommentMutation.isPending}
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || addCommentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
                >
                  {addCommentMutation.isPending ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <PaperAirplaneIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}