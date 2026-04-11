import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User2, Briefcase, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'
import FeedbackToast from '../components/FeedbackToast'
import AuthFooter from '../components/AuthFooter'
import logo from '../../res/logo.png'
import { TermsCard } from './Terms'
import { PrivacyCard } from './Privacy'

const SIGNUP_PROGRESS_KEY = 'internconnect_signup_progress'

const steps = [
  { id: 1, label: 'Account' },
  { id: 2, label: 'Profile' },
  { id: 3, label: 'Security' },
]

const roleCards = [
  {
    value: 'APPLICANT',
    title: "I'm a Student",
    description: 'Find personalized internship matches and prove your skills through AI assessments.',
    icon: User2,
  },
  {
    value: 'RECRUITER',
    title: "I'm a Recruiter",
    description: 'Discover top-tier talent and manage your recruitment pipeline with ease.',
    icon: Briefcase,
  },
]

export default function Signup() {
  const { signup, login } = useAuth()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    re_password: '',
    first_name: '',
    last_name: '',
    role: 'APPLICANT',
    universityEmail: '',
    university: '',
    degree: '',
    major: '',
    graduationYear: '',
    interestedRole: '',
    skills: '',
    portfolio: '',
    linkedin: '',
    resume: null,
    companyName: '',
    companyWebsite: '',
    industry: '',
    companySize: '',
    roleTitle: '',
    companyLocation: '',
  })
  const [twoFactor, setTwoFactor] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [profileHint, setProfileHint] = useState(null)
  const [hintStatus, setHintStatus] = useState('idle')
  const [hasHydrated, setHasHydrated] = useState(false)
  const [activePolicy, setActivePolicy] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const isLastStep = currentStep === steps.length
  const isStudent = formData.role === 'APPLICANT'

  useEffect(() => {
    const saved = sessionStorage.getItem(SIGNUP_PROGRESS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.formData) {
          setFormData((prev) => ({ ...prev, ...parsed.formData, resume: null }))
        }
        if (parsed.currentStep) setCurrentStep(parsed.currentStep)
        if (typeof parsed.twoFactor === 'boolean') setTwoFactor(parsed.twoFactor)
        if (typeof parsed.termsAccepted === 'boolean') setTermsAccepted(parsed.termsAccepted)
      } catch (_) {
        sessionStorage.removeItem(SIGNUP_PROGRESS_KEY)
      }
    }
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    if (!hasHydrated) return
    const payload = {
      formData: { ...formData, resume: null },
      currentStep,
      twoFactor,
      termsAccepted,
    }
    sessionStorage.setItem(SIGNUP_PROGRESS_KEY, JSON.stringify(payload))
  }, [formData, currentStep, twoFactor, termsAccepted, hasHydrated])

  useEffect(() => {
    if (!formData.email || !formData.email.includes('@')) {
      setProfileHint(null)
      setHintStatus('idle')
      return
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        setHintStatus('loading')
        const endpoint = isStudent ? '/api/applicants/suggest/' : '/api/recruiters/suggest/'
        const response = await API.get(endpoint, { params: { email: formData.email } })
        if (cancelled) return
        setProfileHint(response.data)
        setHintStatus('ready')
        if (isStudent) {
          setFormData((prev) => ({
            ...prev,
            university: prev.university || response.data.college || '',
            degree: prev.degree || response.data.degree || '',
            major: prev.major || response.data.major || '',
            interestedRole: prev.interestedRole || response.data.interested_role || '',
          }))
        } else {
          setFormData((prev) => ({
            ...prev,
            companyName: prev.companyName || response.data.company_name || '',
            companyWebsite: prev.companyWebsite || response.data.company_website || '',
          }))
        }
      } catch (error) {
        if (cancelled) return
        setProfileHint(null)
        setHintStatus(error.response?.status === 404 ? 'missing' : 'error')
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [formData.email, isStudent])

  const handleChange = (e) => {
    const { name, files, value } = e.target
    if (name === 'resume') {
      setFormData({ ...formData, resume: files?.[0] || null })
      return
    }
    setFormData({ ...formData, [name]: value })
  }

  const handleRoleSelect = (value) => {
    setFormData((prev) => ({ ...prev, role: value }))
  }

  const validateStep = () => {
    if (currentStep === 1) {
      if (!formData.username.trim() || !formData.email.trim()) {
        return { valid: false, message: 'Please provide a username and email address.' }
      }
      return { valid: true }
    }
    if (currentStep === 2) {
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        return { valid: false, message: 'Tell us your name so we can personalize things.' }
      }
      if (isStudent) {
        if (!formData.university.trim() || !formData.degree || !formData.major.trim() || !formData.graduationYear.trim()) {
          return { valid: false, message: 'Share your academic details to tailor the experience.' }
        }
        if (!formData.interestedRole) {
          return { valid: false, message: 'Let us know the career path you are aiming for.' }
        }
      } else {
        if (
          !formData.companyName.trim() ||
          !formData.companyWebsite.trim() ||
          !formData.industry ||
          !formData.companySize ||
          !formData.roleTitle.trim() ||
          !formData.companyLocation.trim()
        ) {
          return { valid: false, message: 'Complete your company info to continue.' }
        }
      }
      return { valid: true }
    }
    if (currentStep === 3) {
      if (!formData.password || !formData.re_password) {
        return { valid: false, message: 'Create and confirm a secure password.' }
      }
      if (formData.password !== formData.re_password) {
        return { valid: false, message: 'Passwords do not match.' }
      }
      if (!termsAccepted) {
        return { valid: false, message: 'Please accept the Terms & Privacy Policy to continue.' }
      }
      return { valid: true }
    }
    return { valid: true }
  }

  const goNext = async (e) => {
    e.preventDefault()
    setFeedback(null)

    const validation = validateStep()
    if (!validation.valid) {
      setFeedback({ type: 'error', message: validation.message })
      return
    }

    if (isLastStep) {
      let recruiterProfilePayload = null
      if (!isStudent) {
        recruiterProfilePayload = {
          company_name: formData.companyName.trim(),
          company_website: formData.companyWebsite.trim(),
        }
        try {
          sessionStorage.setItem('pendingRecruiterProfile', JSON.stringify(recruiterProfilePayload))
        } catch (storageError) {
          console.warn('Unable to store recruiter profile draft locally', storageError)
        }
      }
      setIsSubmitting(true)
      const res = await signup({
        email: formData.email,
        username: formData.username,
        password: formData.password,
        re_password: formData.re_password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        role: formData.role,
        agree_terms: termsAccepted,
      })
      setIsSubmitting(false)
      if (res.success) {
        sessionStorage.removeItem(SIGNUP_PROGRESS_KEY)
        setFeedback({ type: 'success', message: 'Account created! Taking you to your dashboard…' })
        const autoLogin = await login(formData.email, formData.password, null)
        if (autoLogin.success && recruiterProfilePayload) {
          try {
            await API.patch('/api/recruiters/me/', recruiterProfilePayload)
            sessionStorage.removeItem('pendingRecruiterProfile')
          } catch (profileSyncError) {
            console.warn('Unable to sync recruiter company info during signup', profileSyncError)
          }
        }
        if (!autoLogin.success) {
          setFeedback({
            type: 'warning',
            message: autoLogin.error || 'Account created, but we could not sign you in automatically. Please log in manually.',
          })
          navigate('/login')
        }
      } else {
        const message = typeof res.error === 'string' ? res.error : JSON.stringify(res.error)
        setFeedback({ type: 'error', message })
      }
      return
    }

    setCurrentStep((prev) => Math.min(prev + 1, steps.length))
  }

  const goBack = () => {
    setFeedback(null)
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  const renderInput = (props) => {
    const inputId = props.id || `signup-${props.name}`
    const isPasswordField = props.inputType === 'password'
    const isConfirmPassword = props.name === 're_password'
    const showPass = isConfirmPassword ? showConfirmPassword : showPassword
    const toggleShowPass = isConfirmPassword ? setShowConfirmPassword : setShowPassword
    
    return (
      <div className={props.fullWidth ? 'sm:col-span-2' : ''}>
        <label htmlFor={inputId} className="text-xs uppercase tracking-[0.3em] text-white/60">
          {props.label}
        </label>
        {props.type === 'select' ? (
          <select
            id={inputId}
            name={props.name}
            value={formData[props.name]}
            onChange={handleChange}
            required={props.required}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0f152f] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            <option value="">{props.placeholder || 'Select an option'}</option>
            {props.options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        ) : props.type === 'textarea' ? (
          <textarea
            id={inputId}
            name={props.name}
            value={formData[props.name]}
            onChange={handleChange}
            placeholder={props.placeholder}
            rows={props.rows || 3}
            required={props.required}
            className={`mt-2 w-full rounded-2xl border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${props.variant === 'tags' ? 'bg-[#111735] ring-1 ring-indigo-500/20' : 'bg-white/5'}`}
          />
        ) : isPasswordField ? (
          <div className="relative mt-2">
            <input
              id={inputId}
              name={props.name}
              type={showPass ? 'text' : 'password'}
              value={formData[props.name]}
              onChange={handleChange}
              placeholder={props.placeholder}
              required={props.required}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 pr-12 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
            <button
              type="button"
              onClick={() => toggleShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white/90 transition"
              aria-label={showPass ? 'Hide password' : 'Show password'}
            >
              {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        ) : (
          <input
            id={inputId}
            name={props.name}
            type={props.inputType || 'text'}
            value={props.name === 'resume' ? undefined : formData[props.name]}
            onChange={handleChange}
            placeholder={props.placeholder}
            required={props.required}
            className={`mt-2 w-full rounded-2xl border border-white/10 px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${props.variant === 'tags' ? 'bg-[#111735] ring-1 ring-indigo-500/20' : 'bg-white/5'} ${props.inputType === 'file' ? 'text-white/70' : ''}`}
            accept={props.accept}
          />
        )}
        {props.helper ? <p className="mt-2 text-xs text-white/50">{props.helper}</p> : null}
      </div>
    )
  }

  const renderStepFields = () => {
    if (currentStep === 1) {
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {roleCards.map((card) => {
              const Icon = card.icon
              const isActive = formData.role === card.value
              return (
                <button
                  type="button"
                  key={card.value}
                  onClick={() => handleRoleSelect(card.value)}
                  className={`rounded-3xl border px-4 py-5 text-left transition focus:outline-none ${
                    isActive
                      ? 'border-indigo-500 bg-gradient-to-br from-indigo-600/25 to-purple-600/20 shadow-[0_20px_60px_rgba(79,70,229,0.35)]'
                      : 'border-white/10 bg-white/5 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
                        isActive ? 'bg-indigo-500/20 text-indigo-200' : 'bg-white/5 text-white/70'
                      }`}
                    >
                      <Icon size={22} />
                    </span>
                    <span
                      className={`h-4 w-4 rounded-full border ${isActive ? 'border-indigo-300 bg-indigo-500' : 'border-white/20'}`}
                    />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-white">{card.title}</h3>
                  <p className="mt-2 text-sm text-white/70">{card.description}</p>
                </button>
              )
            })}
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="signup-username" className="text-xs uppercase tracking-[0.3em] text-white/60">
                Choose a username
              </label>
              <input
                id="signup-username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="@interninnovator"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
            </div>
            <div>
              <label htmlFor="signup-email" className="text-xs uppercase tracking-[0.3em] text-white/60">
                {isStudent ? 'Email Address' : 'Work Email'}
              </label>
              <input
                id="signup-email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={isStudent ? 'you@internconnect.ai' : 'you@company.com'}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              {hintStatus === 'ready' && profileHint ? (
                <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/80">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-indigo-200">
                    {isStudent ? 'Campus record detected' : 'Recruiter record detected'}
                  </p>
                  {isStudent ? (
                    <dl className="mt-2 space-y-1 text-sm">
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
                      {profileHint.major ? (
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Major</dt>
                          <dd className="font-semibold text-white">{profileHint.major}</dd>
                        </div>
                      ) : null}
                      {profileHint.interested_role ? (
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Interested role</dt>
                          <dd className="font-semibold text-white">{profileHint.interested_role}</dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : (
                    <dl className="mt-2 space-y-1 text-sm">
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
                      {profileHint.is_verified ? (
                        <div className="flex items-center justify-between">
                          <dt className="text-white/60">Status</dt>
                          <dd className="font-semibold text-emerald-300">Verified partner</dd>
                        </div>
                      ) : null}
                    </dl>
                  )}
                  <p className="mt-2 text-[11px] text-white/60">
                    {isStudent ? 'We will pre-fill your academic profile.' : 'We will pre-fill your company information.'}
                  </p>
                </div>
              ) : hintStatus === 'loading' ? (
                <p className="mt-2 text-xs text-white/60">Checking records…</p>
              ) : hintStatus === 'error' ? (
                <p className="mt-2 text-xs text-rose-300">Unable to fetch suggestions right now.</p>
              ) : null}
            </div>
            {isStudent ? (
              <div>
                <label htmlFor="signup-university-email" className="text-xs uppercase tracking-[0.3em] text-white/60">
                  University Email (optional)
                </label>
                <input
                  id="signup-university-email"
                  name="universityEmail"
                  type="email"
                  value={formData.universityEmail}
                  onChange={handleChange}
                  placeholder="you@university.edu"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            ) : null}
          </div>
        </>
      )
    }

    if (currentStep === 2) {
      if (isStudent) {
        return (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput({ name: 'first_name', label: 'First Name', placeholder: 'Ava', required: true })}
              {renderInput({ name: 'last_name', label: 'Last Name', placeholder: 'Singh', required: true })}
              {renderInput({
                name: 'university',
                label: 'University / College',
                placeholder: 'IIT Bombay',
                fullWidth: true,
                required: true,
              })}
              {renderInput({
                name: 'degree',
                label: 'Degree',
                type: 'select',
                options: ['B.Tech', 'BCA', 'B.Sc', 'MCA', 'M.Tech', 'Other'],
                placeholder: 'Select degree',
                required: true,
              })}
              {renderInput({ name: 'major', label: 'Major / Branch', placeholder: 'Computer Science', required: true })}
              {renderInput({
                name: 'graduationYear',
                label: 'Graduation Year',
                inputType: 'number',
                placeholder: '2026',
                required: true,
              })}
            </div>

            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm font-semibold text-white">Career Information</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {renderInput({
                  name: 'interestedRole',
                  label: 'Interested Role',
                  type: 'select',
                  options: ['Software Developer', 'Data Scientist', 'Product Designer', 'Marketing', 'AI Researcher', 'Other'],
                  placeholder: 'Select a role',
                  required: true,
                })}
                {renderInput({
                  name: 'skills',
                  label: 'Skills (comma separated)',
                  placeholder: 'Python, React, Machine Learning',
                  fullWidth: true,
                  variant: 'tags',
                })}
                {renderInput({
                  name: 'portfolio',
                  label: 'Portfolio / GitHub (optional)',
                  placeholder: 'https://github.com/you',
                  fullWidth: true,
                })}
                {renderInput({
                  name: 'linkedin',
                  label: 'LinkedIn profile (optional)',
                  placeholder: 'https://linkedin.com/in/you',
                  fullWidth: true,
                })}
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase tracking-[0.3em] text-white/60">Resume upload (optional)</label>
                  <input
                    type="file"
                    name="resume"
                    accept=".pdf,.doc,.docx"
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                  {formData.resume ? (
                    <p className="mt-1 text-xs text-white/50">Uploaded: {formData.resume.name}</p>
                  ) : (
                    <p className="mt-1 text-xs text-white/40">PDF or DOC up to 5MB</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {renderInput({ name: 'first_name', label: 'First Name', placeholder: 'Priya', required: true })}
            {renderInput({ name: 'last_name', label: 'Last Name', placeholder: 'Malhotra', required: true })}
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">Company Information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput({
                name: 'companyName',
                label: 'Company Name',
                placeholder: 'Lumina Labs',
                fullWidth: true,
                required: true,
              })}
              {renderInput({
                name: 'companyWebsite',
                label: 'Company Website',
                placeholder: 'https://luminlabs.ai',
                fullWidth: true,
                required: true,
              })}
              {renderInput({
                name: 'industry',
                label: 'Industry',
                type: 'select',
                options: ['Technology', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Other'],
                placeholder: 'Select industry',
                required: true,
              })}
              {renderInput({
                name: 'companySize',
                label: 'Company Size',
                type: 'select',
                options: ['1-10', '11-50', '50-200', '200+'],
                required: true,
              })}
            </div>
          </div>
          <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-sm font-semibold text-white">Hiring Information</p>
            <div className="grid gap-4 sm:grid-cols-2">
              {renderInput({
                name: 'roleTitle',
                label: 'Your Role',
                placeholder: 'HR / Founder / Hiring Manager',
                fullWidth: true,
                required: true,
              })}
              {renderInput({
                name: 'companyLocation',
                label: 'Company Location',
                placeholder: 'Bengaluru, India',
                fullWidth: true,
                required: true,
              })}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {renderInput({
            name: 'password',
            label: 'Create Password',
            placeholder: '••••••••',
            inputType: 'password',
            required: true,
          })}
          {renderInput({
            name: 're_password',
            label: 'Confirm Password',
            placeholder: '••••••••',
            inputType: 'password',
            required: true,
          })}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-white">Enable Two-Factor Authentication</p>
            <p className="text-xs text-white/60">Add an extra layer of security to your account.</p>
          </div>
          <button
            type="button"
            onClick={() => setTwoFactor((prev) => !prev)}
            className={`relative h-7 w-14 rounded-full transition ${twoFactor ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-white/15'}`}
          >
            <span
              className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-white transition ${twoFactor ? 'right-1' : 'left-1'}`}
            />
          </button>
        </div>
        {twoFactor ? (
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-5 py-4 text-sm text-white/80">
            <p className="font-semibold text-white">Almost there!</p>
            <p className="mt-1 text-white/70">
              Finish signup, then open{' '}
              <Link to="/settings/security" className="text-indigo-200 underline">
                Settings → Security
              </Link>{' '}
              to scan your personal QR code and connect an authenticator app.
            </p>
          </div>
        ) : null}
        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-white/70">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => {
              setTermsAccepted(e.target.checked)
            }}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-white/5 text-indigo-500 focus:ring-indigo-400"
          />
          <span>
            I agree to the{' '}
            <button type="button" onClick={() => setActivePolicy('terms')} className="text-indigo-300 underline">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" onClick={() => setActivePolicy('privacy')} className="text-indigo-300 underline">
              Privacy Policy
            </button>
          </span>
        </label>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#050713] px-4 py-10 text-white">
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
      <div className="mx-auto flex max-w-3xl flex-col items-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-[#0b0e20]/80 px-5 py-2 text-sm text-white/80 shadow-[0_10px_25px_rgba(4,5,12,0.5)]">
            {/* {logo ? (
              <span className="rounded-2xl border border-white/10 bg-white/5 p-1">
                <img src={logo} alt="InternConnect" className="h-7 w-7 rounded-xl object-contain" />
              </span>
            ) : null} */}
            <span className="font-semibold tracking-wide text-indigo-100">InternConnect</span>
          </div>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white">Join the Future of Internships</h1>
          <p className="mt-3 text-base text-white/70">
            AI-powered matching designed to launch your career into the stratosphere.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-white/60">
          {steps.map((step, index) => {
            const isActive = step.id === currentStep
            const isCompleted = step.id < currentStep
            return (
              <div key={step.id} className="flex items-center gap-4">
                <div className="flex flex-col items-center gap-2">
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-sm font-semibold ${
                      isActive
                        ? 'border-indigo-400 bg-indigo-500/10 text-indigo-200'
                        : isCompleted
                          ? 'border-indigo-400 text-indigo-200'
                          : 'border-white/15 text-white/50'
                    }`}
                  >
                    {step.id}
                  </span>
                  <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">{step.label}</span>
                </div>
                {index < steps.length - 1 && <div className="h-px w-16 bg-white/10" />}
              </div>
            )
          })}
        </div>

        <motion.form
          onSubmit={goNext}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 w-full rounded-[32px] border border-white/5 bg-gradient-to-br from-[#0d1126] via-[#0a0d1c] to-[#080b16] p-10 shadow-[0_30px_120px_rgba(3,4,14,0.9)]"
          data-testid="signup-form"
        >
          <div className="text-center">
            <p className="text-sm uppercase tracking-[0.35em] text-white/50">Choose your path</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Select how you want to use InternConnect</h2>
            <p className="mt-1 text-sm text-white/60">We&apos;ll personalize your journey based on your role.</p>
          </div>

          <div className="mt-10 space-y-8">{renderStepFields()}</div>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={goBack}
                className="w-full rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-white/40 sm:w-auto"
              >
                Back
              </button>
            ) : (
              <span />
            )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] transition hover:brightness-110 sm:w-auto"
            >
              {isLastStep ? (isSubmitting ? 'Creating Account...' : 'Create Account') : 'Next Step'}
              {!isLastStep && <span aria-hidden="true">→</span>}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-white/60">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-indigo-300 hover:text-indigo-100">
              Sign in
            </Link>
          </p>
        </motion.form>
        <div className="mt-10 w-full">
          <AuthFooter />
        </div>
      </div>
      {activePolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto">
            {activePolicy === 'terms' ? (
              <TermsCard onClose={() => setActivePolicy(null)} />
            ) : (
              <PrivacyCard onClose={() => setActivePolicy(null)} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
