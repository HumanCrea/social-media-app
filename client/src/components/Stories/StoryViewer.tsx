import { useState, useEffect, useRef, useCallback } from 'react'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'

interface Story {
  id: string
  mediaUrl?: string
  text?: string
  mediaType?: string
  expiresAt: string
  createdAt: string
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
}

interface StoryViewerProps {
  stories: Story[]
  initialStoryIndex: number
  isOpen: boolean
  onClose: () => void
}

export default function StoryViewer({ stories, initialStoryIndex, isOpen, onClose }: StoryViewerProps) {
  const [currentStoryIndex, setCurrentStoryIndex] = useState(initialStoryIndex)
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const progressIntervalRef = useRef<NodeJS.Timeout>()
  const videoRef = useRef<HTMLVideoElement>(null)

  const currentStory = stories[currentStoryIndex]
  const STORY_DURATION = 5000 // 5 seconds

  const nextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(prev => prev + 1)
    } else {
      onClose()
    }
  }, [currentStoryIndex, stories.length, onClose])

  const prevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(prev => prev - 1)
    }
  }, [currentStoryIndex])

  const startProgress = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    if (isPaused) return

    const startTime = Date.now()
    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const newProgress = (elapsed / STORY_DURATION) * 100

      if (newProgress >= 100) {
        nextStory()
      } else {
        setProgress(newProgress)
      }
    }, 50)
  }, [isPaused, nextStory])

  useEffect(() => {
    if (!isOpen) return

    setProgress(0)
    startProgress()

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [currentStoryIndex, isOpen, isPaused, startProgress])

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        nextStory()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prevStory()
      } else if (e.key === 'Escape') {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyPress)
      return () => document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isOpen, nextStory, prevStory, onClose])

  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  const handleMouseDown = () => setIsPaused(true)
  const handleMouseUp = () => setIsPaused(false)

  if (!isOpen || !currentStory || !stories || stories.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      {/* Story Progress Bars */}
      <div className="absolute top-4 left-4 right-4 flex space-x-1 z-20">
        {stories && stories.length > 0 && stories.map((_, index) => (
          <div key={index} className="flex-1 h-1 bg-gray-600 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-100"
              style={{
                width: index < currentStoryIndex 
                  ? '100%' 
                  : index === currentStoryIndex 
                    ? `${progress}%` 
                    : '0%'
              }}
            />
          </div>
        ))}
      </div>

      {/* Story Header */}
      <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-3">
          <img
            className="w-10 h-10 rounded-full border-2 border-white"
            src={currentStory.author.avatar || `https://ui-avatars.com/api/?name=${currentStory.author.displayName}&background=3b82f6&color=fff`}
            alt={currentStory.author.displayName}
          />
          <div>
            <p className="text-white font-semibold text-sm">{currentStory.author.displayName}</p>
            <p className="text-gray-300 text-xs">
              {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-white hover:bg-black hover:bg-opacity-30 rounded-full transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Story Content */}
      <div 
        className="relative w-full h-full flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {currentStory.mediaUrl ? (
          currentStory.mediaType === 'video' ? (
            <video
              ref={videoRef}
              src={currentStory.mediaUrl}
              className="max-w-full max-h-full object-contain"
              autoPlay
              muted
              onEnded={nextStory}
            />
          ) : (
            <img
              src={currentStory.mediaUrl}
              alt="Story"
              className="max-w-full max-h-full object-contain"
            />
          )
        ) : null}

        {/* Text Overlay */}
        {currentStory.text && (
          <div className="absolute inset-x-4 bottom-20 bg-black bg-opacity-50 rounded-lg p-4">
            <p className="text-white text-lg text-center">{currentStory.text}</p>
          </div>
        )}

        {/* Navigation Areas */}
        <button
          onClick={prevStory}
          className="absolute left-0 top-0 w-1/3 h-full flex items-center justify-start pl-4 opacity-0 hover:opacity-100 transition-opacity"
          disabled={currentStoryIndex === 0}
        >
          <ChevronLeftIcon className="w-8 h-8 text-white" />
        </button>
        
        <button
          onClick={nextStory}
          className="absolute right-0 top-0 w-1/3 h-full flex items-center justify-end pr-4 opacity-0 hover:opacity-100 transition-opacity"
        >
          <ChevronRightIcon className="w-8 h-8 text-white" />
        </button>

        {/* Tap to advance (mobile) */}
        <div
          onClick={nextStory}
          className="absolute inset-0 md:hidden"
        />
      </div>
    </div>
  )
}