import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { formatDistanceToNow } from 'date-fns'
import { CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { CheckCircleIcon as CheckCircleIconSolid } from '@heroicons/react/24/solid'
import { useToast } from '../../contexts/ToastContext'

interface PollOption {
  id: string
  text: string
  votes: number
  voted?: boolean
}

interface Poll {
  id: string
  question: string
  options: PollOption[]
  totalVotes: number
  expiresAt: string
  allowMultipleVotes: boolean
  hasVoted: boolean
  isExpired: boolean
  author: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  createdAt: string
}

interface PollCardProps {
  poll: Poll
  currentUserId?: string
}

export default function PollCard({ poll, currentUserId }: PollCardProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(poll.hasVoted)
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const voteMutation = useMutation({
    mutationFn: async (optionIds: string[]) => {
      const response = await axios.post(`/api/polls/${poll.id}/vote`, { optionIds })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      setHasSubmitted(true)
      setSelectedOptions([])
      addToast({
        type: 'success',
        title: 'Vote submitted',
        message: 'Thank you for participating in this poll'
      })
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to submit vote',
        message: 'Please try again later'
      })
    }
  })

  const handleOptionSelect = (optionId: string) => {
    if (hasSubmitted || poll.isExpired) return

    if (poll.allowMultipleVotes) {
      setSelectedOptions(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      )
    } else {
      setSelectedOptions([optionId])
    }
  }

  const handleVote = () => {
    if (selectedOptions.length > 0) {
      voteMutation.mutate(selectedOptions)
    }
  }

  const getPercentage = (votes: number) => {
    return poll.totalVotes > 0 ? (votes / poll.totalVotes * 100) : 0
  }

  const timeUntilExpiry = () => {
    const now = new Date()
    const expiry = new Date(poll.expiresAt)
    const diff = expiry.getTime() - now.getTime()
    
    if (diff <= 0) return 'Ended'
    
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    
    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `${days}d ${hours % 24}h left`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m left`
    } else {
      return `${minutes}m left`
    }
  }

  const showResults = hasSubmitted || poll.isExpired

  return (
    <article className="border-b border-gray-200 hover:bg-gray-50/50 transition-colors">
      <div className="p-6">
        <div className="flex space-x-3">
          {/* Avatar */}
          <img
            className="w-12 h-12 avatar"
            src={poll.author.avatar || `https://ui-avatars.com/api/?name=${poll.author.displayName}&background=3b82f6&color=fff`}
            alt={poll.author.displayName}
          />

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center space-x-2 mb-3">
              <span className="font-medium text-gray-900">{poll.author.displayName}</span>
              <span className="text-gray-500">@{poll.author.username}</span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500 text-sm">
                {formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true })}
              </span>
            </div>

            {/* Poll Question */}
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-3">{poll.question}</h3>
              
              {/* Poll Badge */}
              <div className="inline-flex items-center px-2 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium mb-3">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Poll
              </div>
            </div>

            {/* Poll Options */}
            <div className="space-y-2 mb-4">
              {poll.options.map((option) => {
                const percentage = getPercentage(option.votes)
                const isSelected = selectedOptions.includes(option.id)
                const wasVoted = option.voted

                return (
                  <div key={option.id} className="relative">
                    <button
                      onClick={() => handleOptionSelect(option.id)}
                      disabled={hasSubmitted || poll.isExpired}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        showResults
                          ? wasVoted 
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 bg-gray-50'
                          : isSelected
                            ? 'border-primary-500 bg-primary-50'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      } ${hasSubmitted || poll.isExpired ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                            showResults && wasVoted
                              ? 'border-primary-500 bg-primary-500'
                              : isSelected
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300'
                          }`}>
                            {(showResults && wasVoted) || isSelected ? (
                              <CheckCircleIconSolid className="w-3 h-3 text-white" />
                            ) : null}
                          </div>
                          <span className="text-gray-900">{option.text}</span>
                        </div>
                        
                        {showResults && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-gray-700">
                              {percentage.toFixed(1)}%
                            </span>
                            <span className="text-sm text-gray-500">
                              ({option.votes} votes)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {showResults && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 rounded-full h-1">
                            <div
                              className={`h-1 rounded-full transition-all duration-500 ${
                                wasVoted ? 'bg-primary-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Vote Button */}
            {!hasSubmitted && !poll.isExpired && selectedOptions.length > 0 && (
              <button
                onClick={handleVote}
                disabled={voteMutation.isPending}
                className="mb-3 px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-colors"
              >
                {voteMutation.isPending ? 'Voting...' : 'Vote'}
              </button>
            )}

            {/* Poll Info */}
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <span>{poll.totalVotes} votes</span>
                {poll.allowMultipleVotes && (
                  <span>Multiple votes allowed</span>
                )}
              </div>
              <div className="flex items-center space-x-1">
                <ClockIcon className="w-4 h-4" />
                <span>{timeUntilExpiry()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}