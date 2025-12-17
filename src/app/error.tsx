'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to console (replace with proper error logging service in production)
    console.error('Application Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center">
        {/* Error Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Error Message */}
        <h2 className="text-2xl font-bold text-white mb-2">
          Oops! Something went wrong
        </h2>
        <p className="text-slate-400 mb-6">
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>

        {/* Error Digest (for tracking) */}
        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Go Home
          </Link>
        </div>

        {/* Support Link */}
        <p className="mt-6 text-sm text-slate-500">
          If this problem persists, please{' '}
          <a
            href="https://github.com/KarWah/my-companion-hub/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            report an issue
          </a>
        </p>
      </div>
    </div>
  )
}
