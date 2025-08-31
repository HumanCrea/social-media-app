import { UsersIcon, ChatBubbleLeftRightIcon, HeartIcon, PhotoIcon } from '@heroicons/react/24/outline'

export default function PlatformStats() {
  const stats = [
    { label: 'Active Users', value: '2.1K', icon: UsersIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Messages Today', value: '8.7K', icon: ChatBubbleLeftRightIcon, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Likes Given', value: '15.2K', icon: HeartIcon, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Photos Shared', value: '3.4K', icon: PhotoIcon, color: 'text-purple-600', bg: 'bg-purple-50' }
  ]

  return (
    <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-2xl p-4">
      <h3 className="text-lg font-bold text-gray-900 mb-3">DoorTo.me Today</h3>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white/60 backdrop-blur-sm rounded-lg p-3 text-center">
            <div className={`w-8 h-8 ${stat.bg} rounded-full flex items-center justify-center mx-auto mb-2`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-lg font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-600">{stat.label}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 text-center">
        <p className="text-xs text-primary-700">
          🎉 Welcome to the community!
        </p>
      </div>
    </div>
  )
}