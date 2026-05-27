'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAuth = async () => {
    setLoading(true)
    setError('')
    
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else router.push('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-full max-w-sm">
        
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-10">
          <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
            <span className="text-black text-sm font-black">A</span>
          </div>
          <span className="text-white font-semibold text-lg tracking-tight">Athlete OS</span>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-white font-semibold text-xl mb-1">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h1>
          <p className="text-gray-500 text-sm mb-6">
            {isSignUp ? 'Start your journey' : 'Sign in to your account'}
          </p>

          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAuth()}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-gray-500"
            />
          </div>

          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

          <button
            onClick={handleAuth}
            disabled={loading}
            className="w-full mt-4 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-center text-gray-600 text-xs mt-4">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gray-400 ml-1 hover:text-white transition"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <p className="text-center text-gray-800 text-xs mt-8 tracking-widest">
          POWERED BY UMAR FAROOQ
        </p>
      </div>
    </main>
  )
}
