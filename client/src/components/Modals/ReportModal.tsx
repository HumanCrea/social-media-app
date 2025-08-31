import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useToast } from '../../contexts/ToastContext'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  targetId: string
  targetType: 'user' | 'post'
  targetName: string
}

const reportReasons = [
  { value: 'spam', label: 'Spam or fake account' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate_speech', label: 'Hate speech or symbols' },
  { value: 'violence', label: 'Violence or physical harm' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'copyright', label: 'Copyright violation' },
  { value: 'other', label: 'Other' }
]

export default function ReportModal({ 
  isOpen, 
  onClose, 
  targetId, 
  targetType, 
  targetName 
}: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState('')
  const [description, setDescription] = useState('')
  const { addToast } = useToast()

  const reportMutation = useMutation({
    mutationFn: async (data: {
      targetId: string
      targetType: string
      reason: string
      description?: string
    }) => {
      const response = await axios.post('/api/reports', data)
      return response.data
    },
    onSuccess: () => {
      addToast({
        type: 'success',
        title: 'Report submitted',
        message: 'Thank you for helping keep our community safe. We\'ll review your report.'
      })
      handleReset()
      onClose()
    },
    onError: (error) => {
      addToast({
        type: 'error',
        title: 'Failed to submit report',
        message: 'Please try again later'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedReason) {
      reportMutation.mutate({
        targetId,
        targetType,
        reason: selectedReason,
        description: description.trim() || undefined
      })
    }
  }

  const handleReset = () => {
    setSelectedReason('')
    setDescription('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              Report {targetType === 'user' ? 'User' : 'Post'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-6">
            <div>
              <p className="text-gray-700 mb-4">
                You are reporting {targetType === 'user' ? 'user' : 'post'}: <strong>{targetName}</strong>
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Why are you reporting this {targetType}?
              </label>
              <div className="space-y-2">
                {reportReasons.map((reason) => (
                  <label key={reason.value} className="flex items-center">
                    <input
                      type="radio"
                      name="reason"
                      value={reason.value}
                      checked={selectedReason === reason.value}
                      onChange={(e) => setSelectedReason(e.target.value)}
                      className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 focus:ring-primary-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{reason.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context..."
                className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                rows={3}
                maxLength={500}
              />
              <div className="text-right text-sm text-gray-400 mt-1">
                {500 - description.length} characters remaining
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedReason || reportMutation.isPending}
              className="px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}