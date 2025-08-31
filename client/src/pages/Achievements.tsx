import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { TrophyIcon, StarIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { TrophyIcon as TrophyIconSolid } from '@heroicons/react/24/solid'
import BackHeader from '../components/UI/BackHeader'

interface Achievement {
  id: string
  name: string
  title: string
  description: string
  icon: string
  category: string
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
  points: number
  requirement: string
  isActive: boolean
  createdAt: string
}

interface UserAchievement {
  id: string
  progress: number
  isCompleted: boolean
  unlockedAt: string
  achievement: Achievement
}

interface AchievementsData {
  achievements: UserAchievement[]
  totalPoints: number
  completedCount: number
  totalCount: number
}

const rarityColors = {
  common: 'from-gray-400 to-gray-600',
  rare: 'from-blue-400 to-blue-600',
  epic: 'from-purple-400 to-purple-600',
  legendary: 'from-yellow-400 to-yellow-600'
}

const rarityBorders = {
  common: 'border-gray-300',
  rare: 'border-blue-300',
  epic: 'border-purple-300',
  legendary: 'border-yellow-300'
}

const categoryFilters = ['all', 'milestone', 'social', 'content', 'engagement']

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedRarity, setSelectedRarity] = useState('all')

  const { data: achievementsData, isLoading, error } = useQuery<AchievementsData>({
    queryKey: ['achievements', 'me'],
    queryFn: async () => {
      const response = await axios.get('/api/achievements/me')
      return response.data
    }
  })

  const { data: allAchievements } = useQuery<Achievement[]>({
    queryKey: ['achievements', 'all'],
    queryFn: async () => {
      const response = await axios.get('/api/achievements')
      return response.data
    }
  })

  const getRequirementText = (requirement: string, progress: number) => {
    try {
      const req = JSON.parse(requirement)
      const percentage = Math.min((progress / req.target) * 100, 100)
      
      switch (req.type) {
        case 'post_count':
          return `${progress}/${req.target} posts (${Math.round(percentage)}%)`
        case 'video_count':
          return `${progress}/${req.target} videos (${Math.round(percentage)}%)`
        case 'story_count':
          return `${progress}/${req.target} stories (${Math.round(percentage)}%)`
        case 'following_count':
          return `${progress}/${req.target} following (${Math.round(percentage)}%)`
        case 'follower_count':
          return `${progress}/${req.target} followers (${Math.round(percentage)}%)`
        case 'post_likes':
          return `${progress}/${req.target} likes on a post (${Math.round(percentage)}%)`
        case 'video_views':
          return `${progress}/${req.target} views on a video (${Math.round(percentage)}%)`
        case 'hashtag_usage':
          return `${progress}/${req.target} different hashtags (${Math.round(percentage)}%)`
        case 'join_date':
          return progress > 0 ? 'Completed!' : 'Not completed'
        default:
          return 'Progress unknown'
      }
    } catch {
      return 'Progress unknown'
    }
  }

  const filteredAchievements = achievementsData?.achievements.filter(ua => {
    if (selectedCategory !== 'all' && ua.achievement.category !== selectedCategory) {
      return false
    }
    if (selectedRarity !== 'all' && ua.achievement.rarity !== selectedRarity) {
      return false
    }
    return true
  }) || []

  // Get achievements not yet unlocked
  const lockedAchievements = allAchievements?.filter(achievement => 
    !achievementsData?.achievements.some(ua => ua.achievement.id === achievement.id)
  ).filter(achievement => {
    if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
      return false
    }
    if (selectedRarity !== 'all' && achievement.rarity !== selectedRarity) {
      return false
    }
    return true
  }) || []

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <BackHeader title="Achievements" />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-900">
        <BackHeader title="Achievements" />
        <div className="text-center p-8">
          <p className="text-red-600">Failed to load achievements</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <BackHeader title="Achievements" />
      
      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center bg-gradient-to-r from-yellow-400 to-yellow-600 text-white rounded-lg p-4">
            <TrophyIconSolid className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{achievementsData?.completedCount || 0}</div>
            <div className="text-sm opacity-90">Unlocked</div>
          </div>
          <div className="text-center bg-gradient-to-r from-blue-400 to-blue-600 text-white rounded-lg p-4">
            <StarIcon className="w-8 h-8 mx-auto mb-2" />
            <div className="text-2xl font-bold">{achievementsData?.totalPoints || 0}</div>
            <div className="text-sm opacity-90">Points</div>
          </div>
          <div className="text-center bg-gradient-to-r from-purple-400 to-purple-600 text-white rounded-lg p-4">
            <div className="text-2xl font-bold">
              {Math.round(((achievementsData?.completedCount || 0) / Math.max(achievementsData?.totalCount || 1, 1)) * 100)}%
            </div>
            <div className="text-sm opacity-90">Complete</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === category
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Rarity
            </label>
            <div className="flex flex-wrap gap-2">
              {['all', 'common', 'rare', 'epic', 'legendary'].map(rarity => (
                <button
                  key={rarity}
                  onClick={() => setSelectedRarity(rarity)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedRarity === rarity
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {rarity === 'all' ? 'All' : rarity.charAt(0).toUpperCase() + rarity.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Achievements Grid */}
        <div className="space-y-6">
          {/* Completed Achievements */}
          {filteredAchievements.filter(ua => ua.isCompleted).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrophyIconSolid className="w-5 h-5 mr-2 text-yellow-500" />
                Unlocked Achievements
              </h3>
              <div className="grid gap-4">
                {filteredAchievements
                  .filter(ua => ua.isCompleted)
                  .map(userAchievement => (
                    <div
                      key={userAchievement.id}
                      className={`p-4 rounded-lg border-2 ${rarityBorders[userAchievement.achievement.rarity]} bg-white dark:bg-gray-800 shadow-sm`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${rarityColors[userAchievement.achievement.rarity]} flex items-center justify-center text-white text-2xl`}>
                          {userAchievement.achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {userAchievement.achievement.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium bg-gradient-to-r ${rarityColors[userAchievement.achievement.rarity]} text-white`}>
                                {userAchievement.achievement.rarity}
                              </span>
                              <span className="text-sm font-medium text-yellow-600">
                                +{userAchievement.achievement.points} pts
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {userAchievement.achievement.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Unlocked {new Date(userAchievement.unlockedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* In Progress Achievements */}
          {filteredAchievements.filter(ua => !ua.isCompleted).length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <TrophyIcon className="w-5 h-5 mr-2 text-gray-500" />
                In Progress
              </h3>
              <div className="grid gap-4">
                {filteredAchievements
                  .filter(ua => !ua.isCompleted)
                  .map(userAchievement => (
                    <div
                      key={userAchievement.id}
                      className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl opacity-60">
                          {userAchievement.achievement.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-gray-900 dark:text-white">
                              {userAchievement.achievement.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300`}>
                                {userAchievement.achievement.rarity}
                              </span>
                              <span className="text-sm font-medium text-gray-600">
                                +{userAchievement.achievement.points} pts
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">
                            {userAchievement.achievement.description}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {getRequirementText(userAchievement.achievement.requirement, userAchievement.progress)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <LockClosedIcon className="w-5 h-5 mr-2 text-gray-400" />
                Locked Achievements
              </h3>
              <div className="grid gap-4">
                {lockedAchievements.map(achievement => (
                  <div
                    key={achievement.id}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-2xl">
                        <LockClosedIcon className="w-6 h-6 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-700 dark:text-gray-400">
                            ???
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-500">
                              {achievement.rarity}
                            </span>
                            <span className="text-sm font-medium text-gray-500">
                              +{achievement.points} pts
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-500 text-sm">
                          Complete requirements to unlock
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}