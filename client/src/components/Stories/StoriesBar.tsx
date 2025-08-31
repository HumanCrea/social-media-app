import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { PlusIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import CreateStoryModal from '../Modals/CreateStoryModal'
import StoryViewer from './StoryViewer'

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
  isViewed: boolean
}

export default function StoriesBar() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isViewerOpen, setIsViewerOpen] = useState(false)
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(0)
  const { user } = useAuthStore()

  // Fetch stories
  const { data: stories = [], isLoading, error: storiesError } = useQuery({
    queryKey: ['stories'],
    queryFn: async () => {
      try {
        const response = await axios.get('/api/stories')
        return Array.isArray(response.data) ? response.data as Story[] : []
      } catch (error) {
        console.error('Failed to fetch stories:', error)
        return [] // Return empty array on error
      }
    },
    retry: false, // Don't retry failed requests
    refetchOnWindowFocus: false // Don't refetch on window focus
  })

  const handleStoryClick = (index: number) => {
    if (stories && stories.length > index) {
      setSelectedStoryIndex(index)
      setIsViewerOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0"></div>
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0"></div>
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse flex-shrink-0"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex space-x-4 overflow-x-auto">
          {/* Add Your Story */}
          <div className="flex-shrink-0 text-center">
            <div className="relative">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <PlusIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-[64px] truncate">Your Story</p>
          </div>

          {/* Stories from followed users */}
          {stories && stories.length > 0 && stories.map((story, index) => (
            <div 
              key={story.id} 
              onClick={() => handleStoryClick(index)}
              className="flex-shrink-0 text-center cursor-pointer hover:transform hover:scale-105 transition-transform"
            >
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full p-0.5 ${
                    story.isViewed 
                      ? 'bg-gray-300 dark:bg-gray-600' 
                      : 'bg-gradient-to-tr from-yellow-400 to-fuchsia-600'
                  }`}
                >
                  <img
                    className="w-full h-full rounded-full border-2 border-white dark:border-gray-900 object-cover"
                    src={story.author.avatar || `https://ui-avatars.com/api/?name=${story.author.displayName}&background=3b82f6&color=fff`}
                    alt={story.author.displayName}
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full"></div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 max-w-[64px] truncate">
                {story.author.displayName}
              </p>
            </div>
          ))}
        </div>
      </div>

      <CreateStoryModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {stories && stories.length > 0 && (
        <StoryViewer
          stories={stories}
          initialStoryIndex={selectedStoryIndex}
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
        />
      )}
    </>
  )
}