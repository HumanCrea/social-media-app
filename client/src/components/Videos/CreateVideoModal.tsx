import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, VideoCameraIcon, CloudArrowUpIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../contexts/ToastContext'
import { useAchievementsContext } from '../../contexts/AchievementsContext'

interface CreateVideoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreateVideoModal({ isOpen, onClose }: CreateVideoModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoFile: null as File | null,
    thumbnailFile: null as File | null
  })
  const [videoUrl, setVideoUrl] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const thumbnailInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRef = useRef<HTMLVideoElement>(null)
  
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const { checkAchievements } = useAchievementsContext()

  const createVideoMutation = useMutation({
    mutationFn: async (data: {
      title?: string
      description?: string
      videoUrl: string
      thumbnailUrl?: string
      duration: number
    }) => {
      const response = await axios.post('/api/videos', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
      addToast({
        type: 'success',
        title: 'Video uploaded!',
        message: 'Your short video has been successfully uploaded'
      })
      handleClose()
      // Check for new achievements
      setTimeout(() => checkAchievements(), 500)
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: 'Failed to upload video. Please try again.'
      })
    }
  })

  const handleVideoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('video/')) {
      addToast({
        type: 'error',
        title: 'Invalid file',
        message: 'Please select a video file'
      })
      return
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      addToast({
        type: 'error',
        title: 'File too large',
        message: 'Video must be under 100MB'
      })
      return
    }

    setFormData(prev => ({ ...prev, videoFile: file }))
    
    // Create preview URL
    const url = URL.createObjectURL(file)
    setVideoUrl(url)

    // Get video duration
    const video = document.createElement('video')
    video.src = url
    video.addEventListener('loadedmetadata', () => {
      setVideoDuration(Math.floor(video.duration))
      
      // Generate thumbnail from video
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (ctx) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        video.currentTime = 1 // Capture at 1 second
        
        video.addEventListener('seeked', () => {
          ctx.drawImage(video, 0, 0)
          canvas.toBlob((blob) => {
            if (blob) {
              const thumbnailFile = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' })
              setFormData(prev => ({ ...prev, thumbnailFile }))
              setThumbnailUrl(URL.createObjectURL(blob))
            }
          }, 'image/jpeg', 0.8)
        }, { once: true })
      }
    })
  }

  const handleThumbnailChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast({
        type: 'error',
        title: 'Invalid file',
        message: 'Please select an image file'
      })
      return
    }

    setFormData(prev => ({ ...prev, thumbnailFile: file }))
    setThumbnailUrl(URL.createObjectURL(file))
  }

  const uploadFile = async (file: File, type: 'video' | 'image'): Promise<string> => {
    const formDataUpload = new FormData()
    formDataUpload.append(type === 'video' ? 'media' : 'image', file)

    const response = await axios.post(`/api/upload/${type === 'video' ? 'story' : 'image'}`, formDataUpload, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(progress)
        }
      }
    })

    return response.data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.videoFile) {
      addToast({
        type: 'error',
        title: 'No video selected',
        message: 'Please select a video to upload'
      })
      return
    }

    if (videoDuration > 300) { // 5 minutes max
      addToast({
        type: 'error',
        title: 'Video too long',
        message: 'Short videos must be under 5 minutes'
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Upload video
      const videoUrl = await uploadFile(formData.videoFile, 'video')
      
      // Upload thumbnail if exists
      let thumbnailUrl = undefined
      if (formData.thumbnailFile) {
        thumbnailUrl = await uploadFile(formData.thumbnailFile, 'image')
      }

      // Create video record
      await createVideoMutation.mutateAsync({
        title: formData.title.trim() || undefined,
        description: formData.description.trim() || undefined,
        videoUrl,
        thumbnailUrl,
        duration: videoDuration
      })
    } catch (error) {
      console.error('Upload error:', error)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClose = () => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl)
    }
    if (thumbnailUrl) {
      URL.revokeObjectURL(thumbnailUrl)
    }
    
    setFormData({
      title: '',
      description: '',
      videoFile: null,
      thumbnailFile: null
    })
    setVideoUrl('')
    setThumbnailUrl('')
    setVideoDuration(0)
    setUploadProgress(0)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upload Short Video</h2>
          <button
            onClick={handleClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Video Upload & Preview */}
            <div className="space-y-4">
              {!videoUrl ? (
                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
                >
                  <VideoCameraIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    Select a video
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Upload MP4, MOV, or WebM files up to 100MB
                  </p>
                  <div className="bg-primary-600 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2">
                    <CloudArrowUpIcon className="w-5 h-5" />
                    <span>Choose Video</span>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <video
                    ref={videoPreviewRef}
                    src={videoUrl}
                    controls
                    className="w-full aspect-video rounded-xl bg-black"
                    poster={thumbnailUrl}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl('')
                      setFormData(prev => ({ ...prev, videoFile: null }))
                    }}
                    className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-1 hover:bg-opacity-70"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                  {videoDuration > 0 && (
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {Math.floor(videoDuration / 60)}:{(videoDuration % 60).toString().padStart(2, '0')}
                    </div>
                  )}
                </div>
              )}

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoChange}
                className="hidden"
              />

              {/* Thumbnail */}
              {videoUrl && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Thumbnail (optional)
                  </label>
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 cursor-pointer hover:border-primary-500 transition-colors"
                  >
                    {thumbnailUrl ? (
                      <img
                        src={thumbnailUrl}
                        alt="Thumbnail"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        Click to upload custom thumbnail
                      </div>
                    )}
                  </div>
                  <input
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  maxLength={150}
                  placeholder="Add a catchy title..."
                />
                <div className="text-right text-sm text-gray-400 mt-1">
                  {150 - formData.title.length} characters remaining
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  rows={4}
                  maxLength={500}
                  placeholder="Share what your video is about... Use #hashtags to reach more people!"
                />
                <div className="text-right text-sm text-gray-400 mt-1">
                  {500 - formData.description.length} characters remaining
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Uploading video...
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {uploadProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Guidelines */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Video Guidelines</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Maximum 5 minutes duration</li>
                  <li>• File size up to 100MB</li>
                  <li>• Supported formats: MP4, MOV, WebM</li>
                  <li>• Use #hashtags for better discovery</li>
                  <li>• Keep content appropriate for all audiences</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isUploading}
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!formData.videoFile || isUploading || createVideoMutation.isPending}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isUploading || createVideoMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="w-4 h-4" />
                  <span>Upload Video</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}