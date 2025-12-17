'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function SettingsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Settings Error:', error)
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
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">
          Settings Error
        </h2>
        <p className="text-slate-400 mb-6">
          {error.message || 'Failed to load settings. Please try again.'}
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
