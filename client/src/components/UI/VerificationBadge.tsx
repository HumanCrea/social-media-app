import { CheckBadgeIcon } from '@heroicons/react/24/solid'

interface VerificationBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  type?: 'verified' | 'premium' | 'official'
}

export default function VerificationBadge({ size = 'sm', type = 'verified' }: VerificationBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const typeClasses = {
    verified: 'text-blue-500',
    premium: 'text-yellow-500',
    official: 'text-green-500'
  }

  const tooltips = {
    verified: 'Verified account',
    premium: 'Premium member',
    official: 'Official account'
  }

  return (
    <div className="inline-flex items-center" title={tooltips[type]}>
      <CheckBadgeIcon className={`${sizeClasses[size]} ${typeClasses[type]}`} />
    </div>
  )
}