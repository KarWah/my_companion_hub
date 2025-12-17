"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function RegisterError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Registration page error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl w-full max-w-md">
        <div className="flex justify-center mb-4">
          <div className="bg-red-500/10 p-4 rounded-full">
            <AlertTriangle className="w-12 h-12 text-red-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Registration Error
        </h1>

        <p className="text-slate-400 mb-6 text-center">
          {error.message || "An error occurred while loading the registration page."}
        </p>

        {error.digest && (
          <p className="text-xs text-slate-500 mb-6 font-mono text-center bg-slate-800 px-3 py-2 rounded-lg">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-3 rounded-lg transition-colors text-center"
          >
            Already have an account? Sign In
          </Link>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 text-slate-400 hover:text-slate-300 px-4 py-2 transition-colors text-center"
          >
            <Home className="w-4 h-4" />
            Go Home
          </Link>
        </div>

        <p className="text-xs text-slate-500 mt-6 text-center">
          If you continue experiencing issues, please try clearing your browser cache.
        </p>
      </div>
    </div>
  );
}
