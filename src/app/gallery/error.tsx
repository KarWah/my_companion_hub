'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function GalleryError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Gallery Error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="max-w-md w-full text-center">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Gallery Error
        </h2>
        <p className="text-slate-400 mb-6">
          {error.message || 'Failed to load gallery. Please try again.'}
        </p>

        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Back to Chat
          </Link>
        </div>
      </div>
    </div>
  )
}
