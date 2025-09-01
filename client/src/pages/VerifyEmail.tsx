import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useToast } from '../contexts/ToastContext'

export default function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState('')
  const { addToast } = useToast()
  
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setError('No verification token provided')
        setLoading(false)
        return
      }

      try {
        const response = await fetch('https://social-media-app-production-5216.up.railway.app/api/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token })
        })

        const data = await response.json()

        if (response.ok) {
          setVerified(true)
          addToast({
            type: 'success',
            title: 'Email Verified!',
            message: 'Your email has been successfully verified. You can now log in.'
          })
        } else {
          setError(data.error || 'Verification failed')
          addToast({
            type: 'error',
            title: 'Verification Failed',
            message: data.error || 'Invalid or expired verification token'
          })
        }
      } catch (err) {
        setError('Network error occurred')
        addToast({
          type: 'error',
          title: 'Error',
          message: 'Failed to verify email. Please try again.'
        })
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [token, addToast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying your email...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {verified ? (
          <div>
            <div className="mx-auto h-12 w-12 text-green-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Email Verified!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Your email has been successfully verified. You can now log in to your account.
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="btn-primary"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto h-12 w-12 text-red-600">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Verification Failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {error}
            </p>
            <div className="mt-6 space-x-4">
              <Link
                to="/login"
                className="btn-secondary"
              >
                Back to Login
              </Link>
              <Link
                to="/register"
                className="btn-primary"
              >
                Register Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}