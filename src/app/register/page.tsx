"use client";

import { useState } from "react";
import { registerUser } from "@/app/auth-actions";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    // Client-side validation
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      setLoading(false);
      return;
    }

    const result = await registerUser(formData);

    if (!result.success && result.error) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, redirect happens via server action
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg animate-pulse" />
            <h1 className="text-2xl font-bold text-white">Companion Hub</h1>
          </div>
          <p className="text-slate-400">Create your account</p>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              type="email"
              name="email"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username
            </label>
            <input
              type="text"
              name="username"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="username"
              minLength={3}
              maxLength={20}
              pattern="[a-zA-Z0-9_]+"
              title="Username can only contain letters, numbers, and underscores"
              required
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">3-20 characters, letters, numbers, and underscores only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Display Name
            </label>
            <input
              type="text"
              name="name"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What your companion calls you"
              required
              disabled={loading}
            />
            <p className="text-xs text-slate-500 mt-1">This is how your companion will address you</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Minimum 8 characters"
              minLength={8}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Re-enter password"
              minLength={8}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400">
            Already have an account?{" "}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
