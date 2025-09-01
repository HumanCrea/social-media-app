import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import DarkModeToggle from '../UI/DarkModeToggle'
import { 
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  BookmarkIcon,
  VideoCameraIcon,
  TrophyIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import {
  HomeIcon as HomeIconSolid,
  MagnifyingGlassIcon as MagnifyingGlassIconSolid,
  BellIcon as BellIconSolid,
  ChatBubbleLeftRightIcon as ChatBubbleLeftRightIconSolid,
  UserIcon as UserIconSolid,
  BookmarkIcon as BookmarkIconSolid,
  VideoCameraIcon as VideoCameraIconSolid,
  TrophyIcon as TrophyIconSolid
} from '@heroicons/react/24/solid'

export default function Sidebar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const navigation = [
    {
      name: 'Home',
      href: '/',
      icon: HomeIcon,
      activeIcon: HomeIconSolid,
      current: location.pathname === '/'
    },
    {
      name: 'Search',
      href: '/search',
      icon: MagnifyingGlassIcon,
      activeIcon: MagnifyingGlassIconSolid,
      current: location.pathname === '/search'
    },
    {
      name: 'Videos',
      href: '/videos',
      icon: VideoCameraIcon,
      activeIcon: VideoCameraIconSolid,
      current: location.pathname === '/videos'
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: BellIcon,
      activeIcon: BellIconSolid,
      current: location.pathname === '/notifications'
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: ChatBubbleLeftRightIcon,
      activeIcon: ChatBubbleLeftRightIconSolid,
      current: location.pathname === '/messages'
    },
    {
      name: 'Bookmarks',
      href: '/bookmarks',
      icon: BookmarkIcon,
      activeIcon: BookmarkIconSolid,
      current: location.pathname === '/bookmarks'
    },
    {
      name: 'Achievements',
      href: '/achievements',
      icon: TrophyIcon,
      activeIcon: TrophyIconSolid,
      current: location.pathname === '/achievements'
    },
    {
      name: 'Profile',
      href: `/profile/${user?.username}`,
      icon: UserIcon,
      activeIcon: UserIconSolid,
      current: location.pathname === `/profile/${user?.username}`
    }
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Logo */}
      <div className="p-6">
        <h1 className="text-2xl font-bold text-primary-600">DoorTo.me</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 space-y-2">
        {Array.isArray(navigation) ? navigation.map((item) => {
          const Icon = item.current ? item.activeIcon : item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`flex items-center px-4 py-3 text-base font-medium rounded-xl transition-colors ${
                item.current
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Icon className="h-6 w-6 mr-3" />
              {item.name}
            </NavLink>
          )
        }) : (
          <div className="text-red-500 p-4">Navigation error</div>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3 mb-4">
          <img
            className="w-10 h-10 avatar"
            src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
            alt={user?.displayName}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.displayName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              @{user?.username}
            </p>
          </div>
        </div>
        
        <div className="space-y-2">
          <DarkModeToggle />
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}