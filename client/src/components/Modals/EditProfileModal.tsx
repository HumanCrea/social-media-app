import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PhotoIcon, CameraIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../contexts/ToastContext'
import { useAuthStore, getFullImageUrl } from '../../store/authStore'

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, updateProfile } = useAuthStore()
  const [formData, setFormData] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    avatar: user?.avatar || '',
    coverImage: user?.coverImage || ''
  })
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await axios.put('/api/users/profile', data)
      return response.data
    },
    onSuccess: (updatedUser) => {
      updateProfile(updatedUser)
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] })
      addToast({
        type: 'success',
        title: 'Profile updated',
        message: 'Your profile has been successfully updated'
      })
      onClose()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Update failed',
        message: 'Please try again later'
      })
    }
  })

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    const file = event.target.files?.[0]
    if (!file) return

    const formDataUpload = new FormData()
    formDataUpload.append('image', file)

    if (type === 'avatar') {
      setIsUploadingAvatar(true)
    } else {
      setIsUploadingCover(true)
    }

    try {
      const response = await axios.post('/api/upload/image', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setFormData(prev => ({
        ...prev,
        [type]: response.data.url
      }))
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: 'Please try again with a different image'
      })
    } finally {
      if (type === 'avatar') {
        setIsUploadingAvatar(false)
      } else {
        setIsUploadingCover(false)
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.displayName.trim()) {
      updateProfileMutation.mutate({
        ...formData,
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim()
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Profile</h2>
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
            {/* Cover Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cover Photo
              </label>
              <div className="relative h-32 bg-gray-200 dark:bg-gray-700 rounded-xl overflow-hidden">
                {formData.coverImage ? (
                  <img
                    src={getFullImageUrl(formData.coverImage) || formData.coverImage}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      // Hide the image on error and show placeholder
                      target.style.display = 'none'
                      const placeholder = target.nextElementSibling as HTMLElement
                      if (placeholder) placeholder.style.display = 'flex'
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <PhotoIcon className="w-8 h-8 text-gray-400" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={isUploadingCover}
                  className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 flex items-center justify-center transition-all"
                >
                  <CameraIcon className="w-8 h-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
                </button>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, 'cover')}
                  className="hidden"
                />
              </div>
            </div>

            {/* Avatar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Picture
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <img
                    className="w-20 h-20 avatar"
                    src={getFullImageUrl(formData.avatar) || `https://ui-avatars.com/api/?name=${formData.displayName}&background=3b82f6&color=fff`}
                    alt="Avatar"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.src = `https://ui-avatars.com/api/?name=${formData.displayName}&background=3b82f6&color=fff`
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 rounded-full flex items-center justify-center transition-all"
                  >
                    <CameraIcon className="w-6 h-6 text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </button>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, 'avatar')}
                    className="hidden"
                  />
                </div>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                  >
                    {isUploadingAvatar ? 'Uploading...' : 'Change Photo'}
                  </button>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                maxLength={50}
                required
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {50 - formData.displayName.length} characters remaining
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself..."
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                rows={3}
                maxLength={160}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {160 - formData.bio.length} characters remaining
              </div>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Account Info</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>
                  <span className="font-medium">Username:</span> @{user?.username}
                </div>
                <div>
                  <span className="font-medium">Email:</span> {user?.email}
                </div>
                <div>
                  <span className="font-medium">Joined:</span> {new Date(user?.createdAt || '').toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.displayName.trim() || updateProfileMutation.isPending || isUploadingAvatar || isUploadingCover}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}