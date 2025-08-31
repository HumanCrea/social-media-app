import React, { createContext, useContext, ReactNode } from 'react'
import { useAchievements } from '../hooks/useAchievements'
import AchievementNotification from '../components/Achievements/AchievementNotification'

interface AchievementsContextType {
  checkAchievements: () => void
  isChecking: boolean
}

const AchievementsContext = createContext<AchievementsContextType | null>(null)

export function useAchievementsContext() {
  const context = useContext(AchievementsContext)
  if (!context) {
    // Return a no-op implementation instead of throwing
    return {
      checkAchievements: () => {},
      isChecking: false
    }
  }
  return context
}

interface AchievementsProviderProps {
  children: ReactNode
}

export function AchievementsProvider({ children }: AchievementsProviderProps) {
  const { notification, checkAchievements, dismissNotification, isChecking } = useAchievements()

  return (
    <AchievementsContext.Provider value={{ checkAchievements, isChecking }}>
      {children}
      {notification.isVisible && notification.achievement && (
        <AchievementNotification
          achievement={notification.achievement}
          onDismiss={dismissNotification}
        />
      )}
    </AchievementsContext.Provider>
  )
}