import { useState, useEffect } from 'react'
import { TrophyIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Achievement {
  id: string
  name: string
  title: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
}

interface AchievementNotificationProps {
  achievement: Achievement
  onDismiss: () => void
  autoHide?: boolean
  duration?: number
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600'
}

const rarityGlows = {
  common: 'shadow-gray-500/50',
  rare: 'shadow-blue-500/50',
  epic: 'shadow-purple-500/50',
  legendary: 'shadow-yellow-500/50'
}

export default function AchievementNotification({ 
  achievement, 
  onDismiss, 
  autoHide = true, 
  duration = 5000 
}: AchievementNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  useEffect(() => {
    // Animate in
    setTimeout(() => setIsVisible(true), 100)

    // Auto hide
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [autoHide, duration])

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss()
    }, 300)
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-2xl ${rarityGlows[achievement.rarity]} border-l-4 border-gradient-to-b ${rarityColors[achievement.rarity]} max-w-sm`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <TrophyIcon className={`w-5 h-5 bg-gradient-to-r ${rarityColors[achievement.rarity]} bg-clip-text text-transparent`} />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Achievement Unlocked!
              </span>
            </div>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${rarityColors[achievement.rarity]} flex items-center justify-center text-white text-2xl shadow-lg animate-pulse`}>
              {achievement.icon}
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {achievement.title}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {achievement.description}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className={`px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${rarityColors[achievement.rarity]} text-white`}>
                  {achievement.rarity}
                </span>
                <span className="text-sm font-medium text-yellow-600">
                  +{achievement.points} points
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Animated border effect for legendary achievements */}
        {achievement.rarity === 'legendary' && (
          <div className="absolute inset-0 rounded-lg animate-pulse border-2 border-yellow-400 opacity-75"></div>
        )}
      </div>
    </div>
  )
}