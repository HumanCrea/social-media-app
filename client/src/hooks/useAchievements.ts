import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'

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

interface AchievementNotificationState {
  isVisible: boolean
  achievement: Achievement | null
}

export function useAchievements() {
  const [notification, setNotification] = useState<AchievementNotificationState>({
    isVisible: false,
    achievement: null
  })

  const checkAchievementsMutation = useMutation({
    mutationFn: async (): Promise<{ newAchievements: Achievement[] }> => {
      const response = await axios.post('/api/achievements/check', {})
      return response.data
    },
    onSuccess: (data) => {
      // Show notification for the first new achievement
      if (data.newAchievements && data.newAchievements.length > 0) {
        const firstNewAchievement = data.newAchievements[0]
        setNotification({
          isVisible: true,
          achievement: firstNewAchievement
        })

        // If there are multiple achievements, show them sequentially
        if (data.newAchievements.length > 1) {
          data.newAchievements.slice(1).forEach((achievement, index) => {
            setTimeout(() => {
              setNotification({
                isVisible: true,
                achievement: achievement
              })
            }, (index + 1) * 6000) // Show each achievement 6 seconds apart
          })
        }
      }
    }
  })

  const checkAchievements = useCallback(() => {
    checkAchievementsMutation.mutate()
  }, [checkAchievementsMutation])

  const dismissNotification = useCallback(() => {
    setNotification({
      isVisible: false,
      achievement: null
    })
  }, [])

  return {
    notification,
    checkAchievements,
    dismissNotification,
    isChecking: checkAchievementsMutation.isPending
  }
}