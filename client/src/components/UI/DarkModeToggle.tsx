import { SunIcon, MoonIcon } from '@heroicons/react/24/outline'
import { useTheme } from '../../contexts/ThemeContext'

export default function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme()

  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
    >
      {isDarkMode ? (
        <SunIcon className="h-5 w-5 mr-3" />
      ) : (
        <MoonIcon className="h-5 w-5 mr-3" />
      )}
      {isDarkMode ? 'Light Mode' : 'Dark Mode'}
    </button>
  )
}