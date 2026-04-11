import React, { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react'
import API from '../services/api'
import AuthFooter from '../components/AuthFooter'

const initialStatus = { type: null, message: '' }

export default function ResetPassword() {
  const { uid, token } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState(initialStatus)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validate = () => {
    if (!form.password || form.password.length < 8) {
      setStatus({ type: 'error', message: 'Choose a password with at least 8 characters.' })
      return false
    }
    if (form.password !== form.confirm) {
      setStatus({ type: 'error', message: 'Passwords must match exactly.' })
      return false
    }
    if (!uid || !token) {
      setStatus({ type: 'error', message: 'Reset link is incomplete. Request a new email.' })
      return false
    }
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus(initialStatus)
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await API.post('/auth/users/reset_password_confirm/', {
        uid,
        token,
        new_password: form.password,
        re_new_password: form.confirm,
      })
      setStatus({ type: 'success', message: 'Password updated. You can now sign in with your new credentials.' })
      setTimeout(() => navigate('/login'), 2000)
    } catch (error) {
      const response = error.response?.data
      const detail =
        response?.detail || response?.token?.[0] || response?.uid?.[0] || response?.new_password?.[0] || response?.re_new_password?.[0]
      setStatus({ type: 'error', message: detail || 'Unable to reset password. Your link may be expired.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030513] px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-lg rounded-[40px] border border-white/5 bg-gradient-to-b from-[#070a1d] via-[#090b1f] to-[#04040d] p-8 shadow-[0_45px_140px_rgba(6,8,30,0.7)]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-xs uppercase tracking-[0.35em] text-indigo-200">Security</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight">Reset your InternConnect password</h1>
          <p className="mt-2 text-sm text-white/70">
            Enter a strong password you have not used before. This link expires shortly for your safety.
          </p>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <label className="block text-sm text-white/80">
              New password
              <div className="relative mt-2">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Create a secure password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </label>

            <label className="block text-sm text-white/80">
              Confirm password
              <div className="relative mt-2">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirm"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Repeat the password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
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
                {status.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                <p>{status.message}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Updating password...' : 'Save new password'}
            </button>
            <p className="text-center text-sm text-white/70">
              Remembered your password?{' '}
              <Link to="/login" className="font-semibold text-indigo-200 hover:text-indigo-100">
                Return to login
              </Link>
            </p>
          </form>
        </motion.div>
      </div>
      <div className="mx-auto mt-10 max-w-6xl">
        <AuthFooter />
      </div>
    </div>
  )
}
