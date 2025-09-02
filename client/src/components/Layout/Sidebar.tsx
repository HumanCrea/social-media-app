import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore, getFullImageUrl } from '../../store/authStore'
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
    <div className="sidebar w-80 flex flex-col h-full custom-scrollbar">
      {/* Logo */}
      <div className="p-8">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-xl">D</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            DoorTo.me
          </h1>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-6 space-y-3">
        {Array.isArray(navigation) ? navigation.map((item) => {
          const Icon = item.current ? item.activeIcon : item.icon
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={`group relative ${
                item.current
                  ? 'nav-item-active'
                  : 'nav-item hover:scale-105 active:scale-95'
              }`}
            >
              <div className="flex items-center space-x-4">
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  item.current 
                    ? 'bg-blue-100 text-blue-600' 
                    : 'text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'
                }`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-base font-medium">{item.name}</span>
              </div>
              {item.current && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-600 rounded-r-full" />
              )}
            </NavLink>
          )
        }) : (
          <div className="text-red-500 p-4">Navigation error</div>
        )}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-6 border-t border-white/20">
        <div className="card-glass p-4 mb-4 fade-in">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                className="w-12 h-12 avatar-glow"
                src={getFullImageUrl(user?.avatar) || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
                alt={user?.displayName}
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.src = `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`
                }}
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white shadow-lg animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.displayName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                @{user?.username}
              </p>
            </div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="glow-on-hover">
            <DarkModeToggle />
          </div>
          <button
            onClick={logout}
            className="btn-ghost w-full justify-start text-gray-600 hover:text-red-500 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}