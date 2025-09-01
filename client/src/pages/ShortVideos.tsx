import { useState, useEffect, useCallback, useRef } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import axios from 'axios'
import VideoPlayer from '../components/Videos/VideoPlayer'
import CreateVideoModal from '../components/Videos/CreateVideoModal'
import { ChevronUpIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline'

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

interface VideosResponse {
  videos: Video[]
  nextCursor: string | null
  hasMore: boolean
}

export default function ShortVideos() {
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()

  // Fetch videos with infinite scroll
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isError
  } = useInfiniteQuery({
    queryKey: ['videos', 'feed'],
    queryFn: async ({ pageParam = null }: { pageParam?: string | null }) => {
      const params = new URLSearchParams()
      if (pageParam) params.set('cursor', pageParam)
      params.set('limit', '10')
      
      const response = await axios.get(`/api/videos/feed?${params}`)
      
      // Check if response contains an error
      if (response.data && typeof response.data === 'object' && 'error' in response.data) {
        throw new Error(response.data.error)
      }
      
      return response.data as VideosResponse
    },
    getNextPageParam: (lastPage: VideosResponse) => lastPage.nextCursor,
    initialPageParam: null
  })

  // Flatten all videos from pages
  const allVideos = data?.pages.flatMap(page => page.videos) || []

  // Auto-load more videos when reaching the end
  useEffect(() => {
    if (currentVideoIndex >= allVideos.length - 3 && hasNextPage) {
      fetchNextPage()
    }
  }, [currentVideoIndex, allVideos.length, hasNextPage, fetchNextPage])

  // Scroll to next/previous video
  const scrollToVideo = useCallback((index: number) => {
    if (index < 0 || index >= allVideos.length) return

    setCurrentVideoIndex(index)
    setIsScrolling(true)
    
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: index * window.innerHeight,
        behavior: 'smooth'
      })
    }

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    // Set scrolling to false after animation
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false)
    }, 500)
  }, [allVideos.length])

  // Handle wheel scroll
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    
    if (isScrolling) return

    if (e.deltaY > 0) {
      // Scroll down
      scrollToVideo(currentVideoIndex + 1)
    } else {
      // Scroll up
      scrollToVideo(currentVideoIndex - 1)
    }
  }, [currentVideoIndex, isScrolling, scrollToVideo])

  // Handle touch events for mobile
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientY)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isUpSwipe = distance > 50
    const isDownSwipe = distance < -50

    if (isUpSwipe) {
      scrollToVideo(currentVideoIndex + 1)
    } else if (isDownSwipe) {
      scrollToVideo(currentVideoIndex - 1)
    }
  }

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => {
        container.removeEventListener('wheel', handleWheel)
      }
    }
  }, [handleWheel])

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'k':
          e.preventDefault()
          scrollToVideo(currentVideoIndex - 1)
          break
        case 'ArrowDown':
        case 'j':
          e.preventDefault()
          scrollToVideo(currentVideoIndex + 1)
          break
        case ' ':
          e.preventDefault()
          // Toggle play/pause handled by VideoPlayer
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentVideoIndex, scrollToVideo])

  const handleVideoEnd = () => {
    // Auto advance to next video when current ends
    scrollToVideo(currentVideoIndex + 1)
  }

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading videos...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">Failed to load videos</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (allVideos.length === 0) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 hover:bg-gray-700 transition-colors"
          >
            <PlusIcon className="w-8 h-8" />
          </button>
          <p className="text-xl mb-2">No videos yet</p>
          <p className="text-gray-400">Be the first to share a short video!</p>
        </div>
        <CreateVideoModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      </div>
    )
  }

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden">
      {/* Video Container */}
      <div
        ref={containerRef}
        className="h-full w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {allVideos.map((video, index) => (
          <div
            key={video.id}
            className="h-screen w-full"
            style={{
              transform: `translateY(${(index - currentVideoIndex) * 100}vh)`,
              transition: isScrolling ? 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
            }}
          >
            <VideoPlayer
              video={video}
              isActive={index === currentVideoIndex}
              onVideoEnd={handleVideoEnd}
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows (Desktop) - Moved to left side to avoid overlap */}
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 space-y-4 hidden md:block z-40">
        <button
          onClick={() => scrollToVideo(currentVideoIndex - 1)}
          disabled={currentVideoIndex === 0}
          className="bg-black bg-opacity-60 text-white rounded-full p-3 hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110"
        >
          <ChevronUpIcon className="w-6 h-6" />
        </button>
        <button
          onClick={() => scrollToVideo(currentVideoIndex + 1)}
          disabled={currentVideoIndex >= allVideos.length - 1}
          className="bg-black bg-opacity-60 text-white rounded-full p-3 hover:bg-opacity-80 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 hover:scale-110"
        >
          <ChevronDownIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Video Counter */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 rounded-full px-3 py-1">
        {currentVideoIndex + 1} / {allVideos.length}
      </div>

      {/* Loading More Indicator */}
      {hasNextPage && currentVideoIndex >= allVideos.length - 5 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 rounded-full px-3 py-1">
          Loading more videos...
        </div>
      )}

      {/* Create Video Button */}
      <button
        onClick={() => setIsCreateModalOpen(true)}
        className="absolute bottom-20 right-4 w-14 h-14 bg-primary-600 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-primary-700 transition-colors"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Create Video Modal */}
      <CreateVideoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  )
}