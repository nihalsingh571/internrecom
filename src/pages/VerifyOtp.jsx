import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import FeedbackToast from '../components/FeedbackToast'
import { useAuth } from '../context/AuthContext'

const parseParams = (search) => {
  const params = new URLSearchParams(search)
  return {
    userId: params.get('userId'),
    email: params.get('email'),
  }
}

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { verifyLoginOtp } = useAuth()
  const [code, setCode] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userMeta, setUserMeta] = useState(() => {
    const state = location.state || {}
    const params = parseParams(location.search)
    return {
      userId: state.userId || params.userId || '',
      email: state.email || params.email || '',
    }
  })

  useEffect(() => {
    if (!userMeta.userId) {
      navigate('/login')
    }
  }, [userMeta.userId, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!userMeta.userId) return
    if (code.trim().length < 6) {
      setFeedback({ type: 'error', message: 'Enter the 6-digit code from your authenticator app.' })
      return
    }
    setIsSubmitting(true)
    const result = await verifyLoginOtp(userMeta.userId, code)
    setIsSubmitting(false)
    if (!result.success) {
      setFeedback({ type: 'error', message: result.error || 'Invalid code. Try again.' })
      return
    }
    setFeedback({ type: 'success', message: 'Secure sign-in complete. Redirecting...' })
  }

  return (
    <div className="min-h-screen bg-[#030513] px-4 py-10 text-white">
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
      <div className="mx-auto w-full max-w-md rounded-[36px] border border-white/10 bg-gradient-to-b from-[#0b1024] to-[#050713] p-10 shadow-[0_45px_120px_rgba(2,4,18,0.8)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-indigo-300">Two-Factor Challenge</p>
          <h1 className="text-3xl font-semibold">Enter Verification Code</h1>
          <p className="text-sm text-white/70">
            {userMeta.email ? `We detected 2FA on ${userMeta.email}.` : 'Open your authenticator app.'} Enter the 6-digit code to finish
            signing in.
          </p>
        </motion.div>

        <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
          <label className="text-xs uppercase tracking-[0.3em] text-white/60">One-Time Passcode</label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
            className="w-full rounded-2xl border border-white/10 bg-[#0f152f] px-4 py-3 text-center text-2xl tracking-[0.4em] text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            placeholder="••••••"
            autoFocus
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_25px_60px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Verifying...' : 'Verify & Continue'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70 transition hover:border-white/40"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  )
}
