import { useState } from 'react'
import { login, register } from '../services/api'
import type { AuthUser } from '../types'

interface Props {
  onAuth: (user: AuthUser) => void
}

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode]         = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!username.trim() || !password) {
      setError('Username and password are required.')
      return
    }

    setLoading(true)
    try {
      if (mode === 'register') {
        await register(username.trim(), password)
        setSuccess('Account created! Logging you in…')
        const user = await login(username.trim(), password)
        onAuth(user)
      } else {
        const user = await login(username.trim(), password)
        onAuth(user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'))
    setError('')
    setSuccess('')
  }

  return (
    <div className="flex h-screen items-center justify-center bg-[#0f0f0f]">
      <div className="w-full max-w-sm rounded-2xl border border-[#2e2e2e] bg-[#1a1a1a] p-8">
        {/* Logo / title */}
        <div className="mb-6 text-center">
          <span className="inline-block rounded-full bg-[#7c5cd8]/15 px-4 py-1 text-xs text-[#9f82e8]">
            Learning Path Recommender
          </span>
          <h1 className="mt-3 text-lg font-semibold text-[#ececec]">
            {mode === 'login' ? 'Sign in to your account' : 'Create an account'}
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-[#2e2e2e] bg-[#111] px-3 py-2 text-sm text-[#ececec] placeholder-[#555] outline-none focus:border-[#7c5cd8] disabled:opacity-50"
              placeholder="e.g. alice"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[#888]" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="rounded-lg border border-[#2e2e2e] bg-[#111] px-3 py-2 text-sm text-[#ececec] placeholder-[#555] outline-none focus:border-[#7c5cd8] disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          {/* Feedback */}
          {error   && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-green-400">{success}</p>}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="mt-1 rounded-lg bg-[#7c5cd8] py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading
              ? mode === 'login' ? 'Signing in…' : 'Creating account…'
              : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {/* Toggle mode */}
        <p className="mt-5 text-center text-xs text-[#666]">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            onClick={switchMode}
            className="text-[#9f82e8] hover:underline"
          >
            {mode === 'login' ? 'Register' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  )
}
