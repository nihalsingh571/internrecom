import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Loader2, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import API from '../services/api'

const initialState = { type: null, message: '' }

export default function ForgotPasswordDialog({ open, onClose, defaultEmail = '' }) {
  const [email, setEmail] = useState(defaultEmail)
  const [status, setStatus] = useState(initialState)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (open) {
      setEmail(defaultEmail)
      setStatus(initialState)
    }
  }, [open, defaultEmail])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!email) {
      setStatus({ type: 'error', message: 'Enter the email you use for InternConnect.' })
      return
    }
    setIsSubmitting(true)
    setStatus(initialState)
    try {
      await API.post('/auth/users/reset_password/', { email })
      setStatus({ type: 'success', message: 'Check your inbox for a secure reset link. It expires in 1 hour.' })
    } catch (error) {
      const response = error.response?.data
      const detail = response?.detail || response?.email?.[0]
      setStatus({ type: 'error', message: detail || 'We could not start the reset. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm">
      <motion.div
        role="dialog"
        aria-modal="true"
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-white/10 bg-[#060816] p-6 text-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">Forgot password</p>
            <h3 className="mt-2 text-2xl font-semibold">Send yourself a secure reset link</h3>
            <p className="mt-1 text-sm text-white/70">
              We will email you instructions to choose a new password.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm text-white/80">
            Email address
            <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <Mail size={18} className="text-white/50" />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full border-0 bg-transparent text-white placeholder:text-white/40 focus:outline-none"
                placeholder="you@university.edu"
                required
              />
            </div>
          </label>

          {status.type ? (
            <div
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
                status.type === 'success'
                  ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-100'
                  : 'border-red-400/40 bg-red-400/10 text-red-100'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              <p>{status.message}</p>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_45px_rgba(79,70,229,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending link...
              </>
            ) : (
              'Email me reset instructions'
            )}
          </button>
          <p className="text-center text-xs text-white/60">
            Need help? <a href="mailto:help@internconnect.ai" className="text-indigo-200 underline">Contact support</a>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
