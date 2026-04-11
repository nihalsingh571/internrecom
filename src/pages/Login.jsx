import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Github, Globe, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import FeedbackToast from '../components/FeedbackToast'
import AuthFooter from '../components/AuthFooter'
import ForgotPasswordDialog from '../components/ForgotPasswordDialog'
import logo from '../../res/logo.png'
import heroBanner from '../../res/bannerMain.jpeg'
import aiIcon from '../../res/ai.png'
import artificialIcon from '../../res/artificial-intelligence.png'
import brainIcon from '../../res/brain.png'

const insightCards = [
  {
    company: 'GOOGLE',
    role: 'UX Design Intern',
    match: '98% Match',
    icon: aiIcon,
  },
  {
    company: 'STRIPE',
    role: 'AI Researcher',
    match: '89% Match',
    icon: artificialIcon,
  },
  {
    company: 'META',
    role: 'Product Engineer',
    match: '94% Match',
    icon: brainIcon,
  },
]

const cardPositions = [
  { top: '8%', left: '-18%' },
  { top: '38%', right: '-18%' },
  { bottom: '6%', left: '-12%' },
]

const env = (typeof window !== 'undefined' && window.__APP_ENV__) || (typeof process !== 'undefined' ? process.env : {})
const API_BASE_URL = env.VITE_API_BASE_URL ?? 'http://localhost:8000'

const socialErrorMessages = {
  google_code_missing: 'Google login was cancelled. Please try again.',
  google_token_error: 'Unable to verify your Google account.',
  google_profile_error: 'We could not read your Google profile. Try again.',
  google_email_missing: 'Your Google account did not provide an email.',
  github_code_missing: 'GitHub login was cancelled before completion.',
  github_token_error: 'Unable to exchange the GitHub code for a token.',
  github_profile_error: 'We could not fetch your GitHub profile.',
  github_email_missing: 'GitHub did not provide an email address to identify you.',
}

export default function Login() {
  const { login, socialLogin } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [isSocialProcessing, setIsSocialProcessing] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileHint, setProfileHint] = useState(null)
  const [hintStatus, setHintStatus] = useState('idle')
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const navigate = useNavigate()

  const logoSrc = typeof logo === 'string' ? logo : ''

  useEffect(() => {
    const url = new URL(window.location.href)
    const params = url.searchParams
    const access = params.get('access')
    const refresh = params.get('refresh')
    const socialStatus = params.get('socialLogin')
    const provider = params.get('provider')
    const redirectedError = params.get('error')

    let shouldClean = false

    if (redirectedError) {
      setFeedback({
        type: 'error',
        message: socialErrorMessages[redirectedError] || 'Social login failed. Please try again.',
      })
      shouldClean = true
    }

    if (socialStatus === 'success' && access && refresh) {
      setIsSocialProcessing(true)
      ;(async () => {
        const result = await socialLogin(access, refresh)
        if (!result.success) {
          setFeedback({
            type: 'error',
            message: result.error || 'Social login failed. Please try again.',
          })
        } else {
          const providerName = provider?.replace(/^\w/, (letter) => letter.toUpperCase()) || 'Social provider'
          setFeedback({
            type: 'success',
            message: `${providerName} connected. Redirecting...`,
          })
        }
        setIsSocialProcessing(false)
      })()
      shouldClean = true
    }

    if (shouldClean) {
      params.delete('access')
      params.delete('refresh')
      params.delete('socialLogin')
      params.delete('provider')
      params.delete('error')
      const newUrl = `${url.pathname}${params.toString() ? `?${params.toString()}` : ''}${url.hash}`
      window.history.replaceState({}, '', newUrl)
    }
  }, [socialLogin])

  useEffect(() => {
    if (!email || !email.includes('@')) {
      setProfileHint(null)
      setHintStatus('idle')
      return
    }
    let cancelled = false
    const handler = setTimeout(async () => {
      try {
        setHintStatus('loading')
        let response = await API.get('/api/applicants/suggest/', { params: { email } })
        if (cancelled) return
        setProfileHint({ ...response.data, context: 'applicant' })
        setHintStatus('ready')
      } catch (error) {
        if (cancelled) return
        if (error.response?.status === 404) {
          try {
            const recruiterResp = await API.get('/api/recruiters/suggest/', { params: { email } })
            if (cancelled) return
            setProfileHint({ ...recruiterResp.data, context: 'recruiter' })
            setHintStatus('ready')
            return
          } catch (recruiterError) {
            if (cancelled) return
            if (recruiterError.response?.status === 404) {
              setProfileHint(null)
              setHintStatus('missing')
            } else {
              setProfileHint(null)
              setHintStatus('error')
            }
            return
          }
        } else {
          setProfileHint(null)
          setHintStatus('error')
        }
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(handler)
    }
  }, [email])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFeedback(null)
    setIsSubmitting(true)
    const res = await login(email, password, null)
    setIsSubmitting(false)
    if (res?.twoFactorRequired) {
      navigate(`/verify-otp?userId=${res.userId}&email=${encodeURIComponent(email)}`, {
        state: { userId: res.userId, email },
      })
      return
    }
    if (!res.success) {
      if (res.twoFactorEnforced) {
        setFeedback({
          type: 'error',
          message: res.error || 'Two-factor authentication must be completed before signing in.',
        })
        return
      }
      setFeedback({ type: 'error', message: res.error || 'Invalid email or password.' })
    } else {
      if (res.twoFactorSetupRequired) {
        setFeedback({
          type: 'info',
          message: res.twoFactorSetupDetail || 'Finish setting up two-factor authentication to keep your admin access.',
        })
        navigate('/settings/security', { state: { fromLogin: true } })
        return
      }
      setFeedback({ type: 'success', message: 'Welcome back! Redirecting you now.' })
    }
  }

  const handleSocialRedirect = (provider) => {
    setFeedback(null)
    const redirectUri = encodeURIComponent(`${window.location.origin}/login`)
    window.location.href = `${API_BASE_URL}/auth/social/${provider}/login/?redirect_uri=${redirectUri}`
  }

  return (
    <div className="min-h-screen bg-[#030513] px-4 py-6 text-white">
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 overflow-hidden rounded-[40px] border border-white/5 bg-gradient-to-br from-[#070a1d] via-[#090b1f] to-[#04040d] shadow-[0_45px_140px_rgba(6,8,30,0.7)] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#050a1c] via-[#080e2c] to-[#050817] px-8 py-12 sm:px-12">
          <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(120,119,255,0.35), transparent 55%)' }} />
          <div className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(circle at 80% 0%, rgba(59,130,246,0.25), transparent 45%)' }} />
          <div className="relative">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="InternConnect logo"
                className="h-30 w-70"
              />
            ) : null}

            <div className="mt-10 space-y-4">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs uppercase tracking-[0.35em] text-indigo-200">
                <span className="h-2 w-2 rounded-full bg-indigo-400" /> powered by ai
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
                Discover internships <span className="text-indigo-300">powered</span> by intelligent skill matching.
              </h1>
              <p className="text-base text-white/70">
                Our neural network analyzes your unique coding style and project history to find companies where you&apos;ll thrive.
              </p>
            </div>

            <div className="relative mt-10 flex justify-center">
              <div className="relative h-[320px] w-[320px] rounded-full border border-white/5 bg-gradient-to-br from-indigo-900/60 via-transparent to-purple-900/60 p-1 shadow-[0_40px_90px_rgba(2,3,9,0.9)] sm:h-[360px] sm:w-[360px]">
                <div className="absolute inset-[-70px] rounded-full bg-gradient-to-tr from-indigo-800/30 via-transparent to-fuchsia-600/20 blur-3xl" />
                <img
                  src={heroBanner}
                  alt="Students collaborating"
                  className="relative h-full w-full rounded-full object-cover"
                />

                {insightCards.map((card, index) => (
                  <motion.div
                    key={card.company}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 * index }}
                    className="absolute flex w-[210px] items-center justify-between gap-3 rounded-2xl bg-[#11162f]/90 px-4 py-3 text-sm shadow-[0_30px_80px_rgba(3,4,14,0.65)] ring-1 ring-white/10 backdrop-blur"
                    style={cardPositions[index]}
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
                        <img src={card.icon} alt={`${card.company} icon`} className="h-5 w-5 object-contain" />
                      </span>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/50">{card.company}</p>
                        <p className="text-sm font-semibold text-white">{card.role}</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold text-white/70">{card.match}</span>
                  </motion.div>
                ))}

                <div className="absolute -bottom-10 left-1/2 w-[240px] -translate-x-1/2 rounded-2xl border border-indigo-500/30 bg-gradient-to-r from-indigo-600/40 to-fuchsia-500/40 px-5 py-3 text-center text-sm font-semibold text-white shadow-[0_30px_80px_rgba(67,56,202,0.4)]">
                  <p className="text-xs uppercase tracking-[0.4em] text-white/80">AI Matching Engine</p>
                  <p className="text-base">Analyzing 50+ Skills</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section className="relative bg-[#060816] px-8 py-10 sm:px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto w-full max-w-md rounded-[32px] border border-white/5 bg-[#0a0f26]/80 p-9 shadow-[0_35px_80px_rgba(3,4,12,0.75)] backdrop-blur"
          >
            <p className="text-sm uppercase tracking-[0.4em] text-indigo-200">Welcome Back</p>
            <div className="mt-3 flex items-center justify-between">
              <div>
                <h2 className="text-[32px] font-bold leading-tight">Step into your future career.</h2>
                <p className="mt-1 text-sm text-white/70">Sign in to continue to InternConnect.</p>
              </div>
            </div>

            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
              <label className="block text-sm">
                <span className="text-white/80">Email Address</span>
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="name@university.edu"
                />
                {hintStatus === 'ready' && profileHint ? (
                  <div className="mt-3 rounded-2xl border border-indigo-400/30 bg-white/5 px-4 py-3 text-xs text-white/80">
                    <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200">
                      {profileHint.context === 'recruiter' ? 'Recruiter profile detected' : 'Campus profile detected'}
                    </p>
                    <dl className="mt-2 space-y-1 text-sm">
                      {profileHint.context === 'recruiter' ? (
                        <>
                          {profileHint.company_name ? (
                            <div className="flex items-center justify-between">
                              <dt className="text-white/60">Company</dt>
                              <dd className="font-semibold text-white">{profileHint.company_name}</dd>
                            </div>
                          ) : null}
                          {profileHint.company_website ? (
                            <div className="flex items-center justify-between">
                              <dt className="text-white/60">Website</dt>
                              <dd className="font-semibold text-white">{profileHint.company_website}</dd>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <>
                          {profileHint.college ? (
                            <div className="flex items-center justify-between">
                              <dt className="text-white/60">College</dt>
                              <dd className="font-semibold text-white">{profileHint.college}</dd>
                            </div>
                          ) : null}
                          {profileHint.degree ? (
                            <div className="flex items-center justify-between">
                              <dt className="text-white/60">Degree</dt>
                              <dd className="font-semibold text-white">{profileHint.degree}</dd>
                            </div>
                          ) : null}
                          {profileHint.interested_role ? (
                            <div className="flex items-center justify-between">
                              <dt className="text-white/60">Interested role</dt>
                              <dd className="font-semibold text-white">{profileHint.interested_role}</dd>
                            </div>
                          ) : null}
                        </>
                      )}
                    </dl>
                    <p className="mt-2 text-[11px] text-white/60">We&apos;ll use these details to route you to the right dashboard.</p>
                  </div>
                ) : hintStatus === 'loading' ? (
                  <p className="mt-2 text-xs text-white/60">Checking our records…</p>
                ) : null}
              </label>

              <label className="block text-sm">
                <div className="flex items-center justify-between text-white/80">
                  <span>Password</span>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-xs font-semibold text-indigo-300 transition hover:text-indigo-100"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative mt-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>

              <label className="flex items-center gap-2 text-xs text-white/70">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400"
                />
                Keep me signed in for 30 days
              </label>

              <button
                type="submit"
                disabled={isSubmitting || isSocialProcessing}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Portal'}
              </button>

              <div className="relative py-3">
                <div className="absolute inset-x-0 top-1/2 h-px bg-white/5" />
                <p className="relative mx-auto w-fit rounded-full bg-[#0a0f26] px-4 text-[11px] tracking-[0.35em] text-white/60">
                  OR CONTINUE WITH
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSocialRedirect('github')}
                  disabled={isSocialProcessing || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Github size={18} />
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialRedirect('google')}
                  disabled={isSocialProcessing || isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Globe size={18} />
                  Google
                </button>
              </div>

              <p className="text-center text-sm text-white/70">
                New to InternConnect?{' '}
                <Link to="/signup" className="font-semibold text-indigo-200 hover:text-indigo-100">
                  Create an account
                </Link>
              </p>
            </form>
          </motion.div>
        </section>
      </div>
      <div className="mx-auto mt-10 max-w-6xl">
        <AuthFooter />
      </div>
      <ForgotPasswordDialog
        open={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
        defaultEmail={email}
      />
    </div>
  )
}
