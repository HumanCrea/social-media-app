import { useState, useRef, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { 
  HeartIcon,
  ChatBubbleOvalLeftIcon,
  ShareIcon,
  BookmarkIcon,
  PlayIcon,
  PauseIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid'
import { formatDistanceToNow } from 'date-fns'
import VideoCommentsModal from './VideoCommentsModal'

interface Video {
  id: string
  title?: string
  description?: string
  videoUrl: string
  thumbnailUrl?: string
  duration: number
  views: number
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
    viewLogs: number
    comments: number
    bookmarks: number
  }
}

interface VideoPlayerProps {
  video: Video
  isActive: boolean
  onVideoEnd?: () => void
}

export default function VideoPlayer({ video, isActive, onVideoEnd }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showControls, setShowControls] = useState(false)
  const [progress, setProgress] = useState(0)
  const [hasViewed, setHasViewed] = useState(false)
  const [showCommentsModal, setShowCommentsModal] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  // Auto play/pause based on active state
  useEffect(() => {
    if (videoRef.current) {
      if (isActive && !isPlaying) {
        videoRef.current.play()
        setIsPlaying(true)
      } else if (!isActive && isPlaying) {
        videoRef.current.pause()
        setIsPlaying(false)
      }
    }
  }, [isActive, isPlaying])

  // Track video progress
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const updateProgress = () => {
      const progress = (video.currentTime / video.duration) * 100
      setProgress(progress)

      // Record view if watched for more than 3 seconds
      if (!hasViewed && video.currentTime > 3) {
        setHasViewed(true)
        viewMutation.mutate({ watchTime: Math.floor(video.currentTime) })
      }
    }

    const handleVideoEnd = () => {
      setIsPlaying(false)
      onVideoEnd?.()
    }

    video.addEventListener('timeupdate', updateProgress)
    video.addEventListener('ended', handleVideoEnd)

    return () => {
      video.removeEventListener('timeupdate', updateProgress)
      video.removeEventListener('ended', handleVideoEnd)
    }
  }, [hasViewed, onVideoEnd])

  // Like mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/videos/${video.id}/like`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    }
  })

  // View mutation
  const viewMutation = useMutation({
    mutationFn: async (data: { watchTime: number }) => {
      await axios.post(`/api/videos/${video.id}/view`, data)
    }
  })

  // Bookmark mutation
  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(`/api/videos/${video.id}/bookmark`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    }
  })

  const togglePlayPause = () => {
    console.log('togglePlayPause called, isPlaying:', isPlaying)
    if (videoRef.current) {
      if (isPlaying) {
        console.log('Pausing video')
        videoRef.current.pause()
        setIsPlaying(false)
      } else {
        console.log('Playing video')
        videoRef.current.play().catch(e => console.error('Play failed:', e))
        setIsPlaying(true)
      }
    } else {
      console.error('Video ref is null')
    }
  }

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted
      setIsMuted(!isMuted)
    }
  }

  const handleLike = () => {
    likeMutation.mutate()
  }

  const handleBookmark = () => {
    bookmarkMutation.mutate()
  }

  const renderDescription = (text: string) => {
    const hashtagRegex = /#([a-zA-Z0-9_]+)/g
    const parts = text.split(hashtagRegex)
    
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <Link
            key={index}
            to={`/hashtag/${part}`}
            className="text-primary-400 hover:text-primary-300 font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            #{part}
          </Link>
        )
      }
      return part
    })
  }

  const timeAgo = formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })

  return (
    <div className="relative h-screen w-full bg-black flex items-center justify-center">
      {/* Video */}
      <video
        ref={videoRef}
        src={video.videoUrl}
        className="max-h-full max-w-full object-contain"
        loop
        muted={isMuted}
        playsInline
        poster={video.thumbnailUrl}
      />

      {/* YouTube-Style Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-600 bg-opacity-40 z-20">
        <div 
          className="h-full bg-red-500 transition-all duration-100 ease-linear shadow-lg"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Play/Pause Click Area - Full Screen */}
      <div 
        className="absolute inset-0 cursor-pointer z-10"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          console.log('Video clicked, toggling play/pause')
          togglePlayPause()
        }}
      />

      {/* Play Button Overlay - Only show when paused */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-white bg-opacity-90 rounded-full p-8 text-black shadow-2xl border-4 border-white animate-pulse">
            <PlayIcon className="w-20 h-20 ml-1" />
          </div>
        </div>
      )}

      {/* Follow Button - Top Right */}
      <button 
        onClick={(e) => {
          e.stopPropagation()
          console.log('Follow functionality not implemented yet')
        }}
        className="absolute top-6 right-6 bg-red-600 text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-red-700 transition-all duration-300 shadow-xl z-30 border-2 border-white"
      >
        Follow
      </button>

      {/* YouTube Shorts Style Video Info */}
      <div className="absolute bottom-6 left-20 right-24 text-white z-20">
        {/* Author Info - YouTube Shorts Style */}
        <div className="flex items-center space-x-3 mb-3">
          <Link to={`/profile/${video.author.username}`}>
            <img
              className="w-10 h-10 rounded-full"
              src={video.author.avatar || `https://ui-avatars.com/api/?name=${video.author.displayName}&background=3b82f6&color=fff`}
              alt={video.author.displayName}
            />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <Link 
                to={`/profile/${video.author.username}`}
                className="font-medium hover:underline text-white text-sm"
              >
                @{video.author.username}
              </Link>
              <span className="text-gray-300 text-xs">•</span>
              <span className="text-gray-300 text-xs">{timeAgo}</span>
            </div>
          </div>
        </div>

        {/* Title - YouTube Shorts Style */}
        {video.title && (
          <h3 className="text-base font-medium mb-2 text-white line-clamp-2">{video.title}</h3>
        )}

        {/* Description - YouTube Shorts Style */}
        {video.description && (
          <div className="mb-2">
            <p className="text-sm text-gray-200 line-clamp-2">
              {renderDescription(video.description)}
            </p>
          </div>
        )}

        {/* Stats - YouTube Shorts Style */}
        <div className="flex items-center space-x-3 text-xs text-gray-300">
          <span>{video.views > 999 ? `${Math.floor(video.views / 1000)}K` : video.views} views</span>
        </div>
      </div>

      {/* Mute Button - Bottom Left */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          toggleMute()
        }}
        className="absolute bottom-20 left-6 w-12 h-12 bg-gray-900 bg-opacity-80 rounded-full flex items-center justify-center text-white hover:bg-opacity-100 transition-all duration-300 hover:scale-110 z-30 shadow-lg border border-gray-600"
      >
        {isMuted ? (
          <SpeakerXMarkIcon className="w-6 h-6 text-red-400" />
        ) : (
          <SpeakerWaveIcon className="w-6 h-6" />
        )}
      </button>

      {/* YouTube Shorts Style Action Buttons */}
      <div className="absolute bottom-28 right-6 space-y-6 flex flex-col items-center z-30">
        {/* Like Button - YouTube Shorts Style */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            console.log('Like button clicked')
            handleLike()
          }}
          disabled={likeMutation.isPending}
          className="flex flex-col items-center text-white group transition-all duration-300 disabled:opacity-50 hover:scale-110 focus:outline-none"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-900 bg-opacity-70 group-hover:bg-opacity-90 transition-all duration-300 shadow-lg border border-gray-600">
            {video.isLiked ? (
              <HeartIconSolid className="w-9 h-9 text-red-500" />
            ) : (
              <HeartIcon className="w-9 h-9 text-white group-hover:text-red-400" />
            )}
          </div>
          <span className="text-sm font-bold mt-2 drop-shadow-lg text-center bg-black bg-opacity-50 px-2 py-1 rounded">
            {video._count.likes > 999 ? `${Math.floor(video._count.likes / 1000)}K` : video._count.likes}
          </span>
        </button>

        {/* Comment Button - YouTube Shorts Style */}
        <button 
          onClick={(e) => {
            e.stopPropagation()
            console.log('Comment button clicked')
            setShowCommentsModal(true)
          }}
          className="flex flex-col items-center text-white group transition-all duration-300 hover:scale-110 focus:outline-none"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-900 bg-opacity-70 group-hover:bg-opacity-90 transition-all duration-300 shadow-lg border border-gray-600">
            <ChatBubbleOvalLeftIcon className="w-9 h-9 text-white group-hover:text-blue-400" />
          </div>
          <span className="text-sm font-bold mt-2 drop-shadow-lg text-center bg-black bg-opacity-50 px-2 py-1 rounded">
            {video._count.comments > 999 ? `${Math.floor(video._count.comments / 1000)}K` : video._count.comments}
          </span>
        </button>

        {/* Share Button - YouTube Shorts Style */}
        <button 
          onClick={(e) => {
            e.stopPropagation()
            console.log('Share button clicked')
            if (navigator.share) {
              navigator.share({
                title: video.title || 'Check out this video',
                text: video.description || 'Amazing video!',
                url: window.location.href
              })
            } else {
              navigator.clipboard.writeText(window.location.href)
              alert('Link copied to clipboard!')
            }
          }}
          className="flex flex-col items-center text-white group transition-all duration-300 hover:scale-110 focus:outline-none"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-900 bg-opacity-70 group-hover:bg-opacity-90 transition-all duration-300 shadow-lg border border-gray-600">
            <ShareIcon className="w-9 h-9 text-white group-hover:text-green-400" />
          </div>
          <span className="text-sm font-bold mt-2 drop-shadow-lg text-center bg-black bg-opacity-50 px-2 py-1 rounded">Share</span>
        </button>

        {/* Save Button - YouTube Shorts Style */}
        <button 
          onClick={(e) => {
            e.stopPropagation()
            console.log('Save button clicked')
            handleBookmark()
          }}
          disabled={bookmarkMutation.isPending}
          className="flex flex-col items-center text-white group transition-all duration-300 disabled:opacity-50 hover:scale-110 focus:outline-none"
        >
          <div className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-900 bg-opacity-70 group-hover:bg-opacity-90 transition-all duration-300 shadow-lg border border-gray-600">
            {video.isBookmarked ? (
              <BookmarkIconSolid className="w-9 h-9 text-yellow-500" />
            ) : (
              <BookmarkIcon className="w-9 h-9 text-white group-hover:text-yellow-400" />
            )}
          </div>
          <span className="text-sm font-bold mt-2 drop-shadow-lg text-center bg-black bg-opacity-50 px-2 py-1 rounded">Save</span>
        </button>
      </div>

      {/* Comments Modal */}
      <VideoCommentsModal
        videoId={video.id}
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
      />
    </div>
  )
}