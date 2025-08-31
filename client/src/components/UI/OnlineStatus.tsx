interface OnlineStatusProps {
  isOnline: boolean
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export default function OnlineStatus({ isOnline, size = 'sm', showText = false }: OnlineStatusProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  }

  return (
    <div className="flex items-center space-x-1">
      <div
        className={`${sizeClasses[size]} rounded-full ${
          isOnline ? 'bg-green-400' : 'bg-gray-300'
        }`}
      >
        {isOnline && (
          <div className={`${sizeClasses[size]} rounded-full bg-green-400 animate-ping`}></div>
        )}
      </div>
      {showText && (
        <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </span>
      )}
    </div>
  )
}