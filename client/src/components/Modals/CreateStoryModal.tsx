import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PhotoIcon, VideoCameraIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../contexts/ToastContext'
import { useAuthStore, getFullImageUrl } from '../../store/authStore'
import { useAchievementsContext } from '../../contexts/AchievementsContext'

interface CreateStoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateStoryModal({ isOpen, onClose }: CreateStoryModalProps) {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [text, setText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const achievementsContext = useAchievementsContext()
  const checkAchievements = achievementsContext?.checkAchievements

  const createStoryMutation = useMutation({
    mutationFn: async (data: { mediaUrl?: string; text?: string; mediaType?: string }) => {
      const response = await axios.post('/api/stories', data)
      return response.data
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Story posted!',
        message: 'Your story has been shared and will be visible for 24 hours'
      })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
      handleReset()
      onClose()
      // Check for new achievements
      if (checkAchievements) {
        setTimeout(() => checkAchievements(), 500)
      }
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to post story',
        message: 'Please try again later'
      })
    }
  })

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('media', file)

    setIsUploading(true)
    try {
      const response = await axios.post('/api/upload/story', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setSelectedMedia(response.data.url)
      setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: 'Please try again with a different file'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedMedia || text.trim()) {
      createStoryMutation.mutate({
        mediaUrl: selectedMedia || undefined,
        text: text.trim() || undefined,
        mediaType: mediaType || undefined
      })
    }
  }

  const handleReset = () => {
    setSelectedMedia(null)
    setMediaType(null)
    setText('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Create Story</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            {/* User Info */}
            <div className="flex items-center space-x-3">
              <img
                className="w-12 h-12 avatar"
                src={getFullImageUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
                alt={user?.displayName}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`
                }}
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user?.displayName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your story</p>
              </div>
            </div>

            {/* Media Preview */}
            {selectedMedia && (
              <div className="relative rounded-xl overflow-hidden">
                {mediaType === 'video' ? (
                  <video
                    src={getFullImageUrl(selectedMedia) || selectedMedia}
                    className="w-full h-64 object-cover"
                    controls
                    onError={(e) => {
                      console.error('Video preview failed to load:', selectedMedia)
                    }}
                  />
                ) : (
                  <img
                    src={getFullImageUrl(selectedMedia) || selectedMedia}
                    alt="Story media"
                    className="w-full h-64 object-cover"
                    onError={(e) => {
                      console.error('Image preview failed to load:', selectedMedia)
                    }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMedia(null)
                    setMediaType(null)
                  }}
                  className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70 transition-opacity"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Text Input */}
            <div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share what's on your mind..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
                maxLength={280}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {280 - text.length} characters remaining
              </div>
            </div>

            {/* Media Upload Buttons */}
            <div className="flex space-x-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <PhotoIcon className="w-5 h-5" />
                <span>{isUploading ? 'Uploading...' : 'Add Photo/Video'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={(!selectedMedia && !text.trim()) || createStoryMutation.isPending || isUploading}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createStoryMutation.isPending ? 'Posting...' : 'Share Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}