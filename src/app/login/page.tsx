"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("registered") === "true") {
      setSuccessMessage("Account created successfully! Please sign in.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get("identifier") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false
    });

    if (result?.error) {
      setError("Invalid username/email or password");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl w-full max-w-md">
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-blue-500 rounded-lg animate-pulse" />
            <h1 className="text-2xl font-bold text-white">Companion Hub</h1>
          </div>
          <p className="text-slate-400">Sign in to your account</p>
        </div>

        {successMessage && (
          <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-3 rounded-lg mb-6">
            {successMessage}
          </div>
        )}

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Username or Email
            </label>
            <input
              type="text"
              name="identifier"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter username or email"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <input
              type="password"
              name="password"
              className="w-full bg-slate-800 text-white border border-slate-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter password"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg px-4 py-3 transition-colors"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-8 rounded-2xl w-full max-w-md">
          <div className="flex items-center justify-center">
            <div className="w-10 h-10 bg-blue-500 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
