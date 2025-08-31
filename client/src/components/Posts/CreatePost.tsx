import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../contexts/ToastContext'
import { useAchievementsContext } from '../../contexts/AchievementsContext'
import { PhotoIcon, XMarkIcon, ChartBarIcon } from '@heroicons/react/24/outline'
import CreatePollModal from '../Polls/CreatePollModal'

interface CreatePostProps {
  onPostCreated: () => void
}

export default function CreatePost({ onPostCreated }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const { checkAchievements } = useAchievementsContext()

  const createPostMutation = useMutation({
    mutationFn: async (data: { content: string; imageUrl?: string }) => {
      const response = await axios.post('/api/posts', data)
      return response.data
    },
    onSuccess: () => {
      setContent('')
      setSelectedImage(null)
      setIsExpanded(false)
      addToast({
        type: 'success',
        title: 'Post created successfully',
        message: 'Your post has been shared with your followers'
      })
      onPostCreated()
      // Check for new achievements
      setTimeout(() => checkAchievements(), 500)
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to create post',
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
      setSelectedImage(response.data.url)
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

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handleEmojiClick = (emoji: string) => {
    setContent(prev => prev + emoji)
  }

  const removeImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (content.trim() || selectedImage) {
      createPostMutation.mutate({ 
        content: content.trim(), 
        imageUrl: selectedImage || undefined 
      })
    }
  }

  const remainingChars = 500 - content.length
  const isOverLimit = remainingChars < 0

  return (
    <div className="space-y-4">
      <div className="flex space-x-3">
        <img
          className="w-12 h-12 avatar"
          src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
          alt={user?.displayName}
        />
        
        <div className="flex-1">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setIsExpanded(true)}
                placeholder="What's happening?"
                className="w-full p-3 text-lg resize-none border-none focus:outline-none bg-transparent placeholder-gray-500"
                rows={isExpanded ? 4 : 2}
                maxLength={500}
              />
              
              {isExpanded && (
                <div className="absolute bottom-2 right-2 text-sm">
                  <span className={remainingChars < 20 ? 'text-red-500' : 'text-gray-400'}>
                    {remainingChars}
                  </span>
                </div>
              )}
            </div>

            {/* Image Preview */}
            {selectedImage && (
              <div className="relative mt-3">
                <img
                  src={selectedImage}
                  alt="Selected"
                  className="w-full max-h-80 object-cover rounded-2xl border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
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

            {isExpanded && (
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <button
                    type="button"
                    onClick={handlePhotoClick}
                    disabled={isUploading}
                    className="flex items-center text-primary-500 hover:bg-primary-50 p-2 rounded-full transition-colors disabled:opacity-50"
                  >
                    <PhotoIcon className="w-5 h-5" />
                    {isUploading && <span className="ml-1 text-sm">Uploading...</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPollModalOpen(true)}
                    className="flex items-center text-primary-500 hover:bg-primary-50 p-2 rounded-full transition-colors"
                    title="Create Poll"
                  >
                    <ChartBarIcon className="w-5 h-5" />
                  </button>
                  
                  {/* Emoji buttons */}
                  <div className="flex space-x-1">
                    {['😀', '😍', '🎉', '👍', '❤️', '😂', '🔥', '💯'].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="flex items-center text-lg hover:bg-primary-50 p-1 rounded transition-colors"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {(content.trim() || selectedImage) && (
                    <button
                      type="button"
                      onClick={() => {
                        setContent('')
                        setSelectedImage(null)
                        setIsExpanded(false)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                      className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={(!content.trim() && !selectedImage) || isOverLimit || createPostMutation.isPending || isUploading}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createPostMutation.isPending ? 'Posting...' : 'Post'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>


      {/* Poll Modal */}
      <CreatePollModal
        isOpen={isPollModalOpen}
        onClose={() => setIsPollModalOpen(false)}
      />
    </div>
  )
}