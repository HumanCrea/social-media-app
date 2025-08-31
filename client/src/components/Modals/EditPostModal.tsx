import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PhotoIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../contexts/ToastContext'

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
}

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: Post
}

export default function EditPostModal({ isOpen, onClose, post }: EditPostModalProps) {
  const [content, setContent] = useState(post.content)
  const [imageUrl, setImageUrl] = useState(post.imageUrl || '')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  // Update post mutation
  const updatePostMutation = useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string }) => {
      const response = await axios.put(`/api/posts/${post.id}`, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      addToast({
        type: 'success',
        title: 'Post updated',
        message: 'Your post has been successfully updated'
      })
      onClose()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to update post',
        message: 'Please try again later'
      })
    }
  })

  // Delete post mutation
  const deletePostMutation = useMutation({
    mutationFn: async () => {
      await axios.delete(`/api/posts/${post.id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      addToast({
        type: 'success',
        title: 'Post deleted',
        message: 'Your post has been permanently deleted'
      })
      onClose()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to delete post',
        message: 'Please try again later'
      })
    }
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    setIsUploading(true)
    try {
      const response = await axios.post('/api/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImageUrl(response.data.url)
    } catch (error) {
      console.error('Image upload failed:', error)
      addToast({
        type: 'error',
        title: 'Image upload failed',
        message: 'Please try again with a different image'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setImageUrl('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSave = () => {
    if (content.trim() || imageUrl) {
      updatePostMutation.mutate({
        content: content.trim(),
        imageUrl: imageUrl || undefined
      })
    }
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      deletePostMutation.mutate()
    }
  }

  if (!isOpen) return null

  const remainingChars = 500 - content.length
  const isOverLimit = remainingChars < 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Edit Post</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Edit Form */}
        <div className="p-6">
          <div className="flex space-x-3">
            <img
              className="w-12 h-12 avatar"
              src={post.author.avatar || `https://ui-avatars.com/api/?name=${post.author.displayName}&background=3b82f6&color=fff`}
              alt={post.author.displayName}
            />
            <div className="flex-1">
              {/* Text Area */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's happening?"
                  className="w-full p-3 text-lg resize-none border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  rows={4}
                  maxLength={500}
                />
                <div className="absolute bottom-2 right-2 text-sm">
                  <span className={remainingChars < 20 ? 'text-red-500' : 'text-gray-400'}>
                    {remainingChars}
                  </span>
                </div>
              </div>

              {/* Image Preview */}
              {imageUrl && (
                <div className="relative mt-3">
                  <img
                    src={imageUrl}
                    alt="Post image"
                    className="w-full max-h-80 object-cover rounded-2xl border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 bg-gray-800 bg-opacity-75 text-white rounded-full p-1 hover:bg-opacity-90 transition-opacity"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Actions */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center text-primary-500 hover:bg-primary-50 p-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    <PhotoIcon className="w-5 h-5" />
                    {isUploading && <span className="ml-1 text-sm">Uploading...</span>}
                  </button>

                  {/* Delete Post Button */}
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deletePostMutation.isPending}
                    className="flex items-center text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={(!content.trim() && !imageUrl) || isOverLimit || updatePostMutation.isPending || isUploading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {updatePostMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}