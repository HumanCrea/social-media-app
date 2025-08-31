import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useAuthStore } from '../../store/authStore'
import { useToast } from '../../contexts/ToastContext'

interface CreatePollModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function CreatePollModal({ isOpen, onClose }: CreatePollModalProps) {
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [duration, setDuration] = useState(24) // hours
  const [allowMultipleVotes, setAllowMultipleVotes] = useState(false)
  const { user } = useAuthStore()
  const { addToast } = useToast()
  const queryClient = useQueryClient()

  const createPollMutation = useMutation({
    mutationFn: async (data: {
      question: string
      options: string[]
      duration: number
      allowMultipleVotes: boolean
    }) => {
      const response = await axios.post('/api/polls', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      addToast({
        type: 'success',
        title: 'Poll created successfully',
        message: 'Your poll is now live and ready for votes'
      })
      handleReset()
      onClose()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to create poll',
        message: 'Please try again later'
      })
    }
  })

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, ''])
    }
  }

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index)
      setOptions(newOptions)
    }
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleReset = () => {
    setQuestion('')
    setOptions(['', ''])
    setDuration(24)
    setAllowMultipleVotes(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const validOptions = options.filter(option => option.trim())
    
    if (question.trim() && validOptions.length >= 2) {
      createPollMutation.mutate({
        question: question.trim(),
        options: validOptions,
        duration,
        allowMultipleVotes
      })
    }
  }

  if (!isOpen) return null

  const validOptions = options.filter(option => option.trim())
  const isValid = question.trim() && validOptions.length >= 2

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Poll</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex space-x-3">
            <img
              className="w-12 h-12 avatar"
              src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.displayName}&background=3b82f6&color=fff`}
              alt={user?.displayName}
            />
            <div className="flex-1 space-y-6">
              {/* Question */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask a question..."
                  className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={2}
                  maxLength={280}
                  required
                />
                <div className="text-right text-sm text-gray-400 mt-1">
                  {280 - question.length} characters remaining
                </div>
              </div>

              {/* Options */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Poll Options
                </label>
                <div className="space-y-3">
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => handleOptionChange(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="w-full p-3 pl-8 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          maxLength={100}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary-400 rounded-full"></div>
                      </div>
                      {options.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {options.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOption}
                    className="mt-3 flex items-center space-x-2 text-primary-600 hover:text-primary-700 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>Add option</span>
                  </button>
                )}
              </div>

              {/* Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Poll Duration
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    <option value={1}>1 hour</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>1 day</option>
                    <option value={72}>3 days</option>
                    <option value={168}>1 week</option>
                  </select>
                </div>

                <div className="flex items-center">
                  <input
                    id="multipleVotes"
                    type="checkbox"
                    checked={allowMultipleVotes}
                    onChange={(e) => setAllowMultipleVotes(e.target.checked)}
                    className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="multipleVotes" className="ml-2 text-sm text-gray-700">
                    Allow multiple votes per person
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isValid || createPollMutation.isPending}
                  className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {createPollMutation.isPending ? 'Creating...' : 'Create Poll'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}