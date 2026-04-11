import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Bell,
  ChartBar,
  LineChart,
  LogOut,
  PieChart,
  UserCircle,
  X,
} from 'lucide-react'
import API from '../services/api'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'post', label: 'Post Internship' },
  { id: 'manage', label: 'Manage Internships' },
  { id: 'pipeline', label: 'Applicants' },
  { id: 'discovery', label: 'Candidate Discovery' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'messages', label: 'Messages' },
  { id: 'company', label: 'Company Profile' },
]

const blankForm = (company = '') => ({
  title: '',
  company,
  location: '',
  mode: 'Remote',
  duration: '',
  stipend: '',
  description: '',
  responsibilities: '',
  requiredSkills: '',
  preferredSkills: '',
  startDate: '',
  deadline: '',
})

const sectionHeading = (title, subtitle) => (
  <div>
    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{title}</p>
    {subtitle && <p className="text-sm text-white/60">{subtitle}</p>}
  </div>
)

const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
}

const formatRelativeTime = (value) => {
  if (!value) return '—'
  const diffMs = Date.now() - new Date(value).getTime()
  const minutes = Math.max(1, Math.floor(diffMs / 60000))
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const statusLabelMap = {
  OPEN: 'Open',
  REVIEWING: 'Reviewing',
  PAUSED: 'Paused',
  CLOSED: 'Closed',
}

const deriveListingStatus = (listing, apps = []) => {
  if (listing?.status) {
    return statusLabelMap[listing.status] || listing.status
  }
  if (!apps.length) return 'Open'
  if (apps.some((app) => app.status === 'ACCEPTED')) return 'Offer sent'
  if (apps.every((app) => app.status === 'REJECTED')) return 'Closed'
  if (apps.some((app) => app.status === 'REVIEWED')) return 'In review'
  return 'Active'
}

const normalizeSkillLabel = (skill) => {
  if (!skill) return ''
  if (typeof skill === 'string') return skill
  if (typeof skill === 'object') {
    return skill.name || skill.label || skill.title || ''
  }
  return ''
}

const formatVsps = (value) => Math.round(((value ?? 0) * 100))

export default function RecruiterDashboard() {
  const { user, logout } = useAuth()
  const [profile, setProfile] = useState(null)
  const [internships, setInternships] = useState([])
  const [applications, setApplications] = useState([])
  const [applicants, setApplicants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeNav, setActiveNav] = useState('dashboard')
  const [form, setForm] = useState(blankForm(''))
  const [matchFilter, setMatchFilter] = useState('Active')
  const [formLoading, setFormLoading] = useState(false)
  const [formFeedback, setFormFeedback] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [listingModalOpen, setListingModalOpen] = useState(false)
  const [listingStatus, setListingStatus] = useState('OPEN')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusFeedback, setStatusFeedback] = useState(null)
  const [companyEditorOpen, setCompanyEditorOpen] = useState(false)
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_website: '',
  })
  const [companySaving, setCompanySaving] = useState(false)
  const [companyError, setCompanyError] = useState(null)
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [candidateModalOpen, setCandidateModalOpen] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState(null)

  const openCompanyEditor = () => {
    setCompanyForm({
      company_name: profile?.company_name || '',
      company_website: profile?.company_website || '',
    })
    setCompanyError(null)
    setCompanyEditorOpen(true)
  }

  const closeCompanyEditor = () => {
    setCompanyEditorOpen(false)
    setCompanyError(null)
  }

  const fetchRecruiterData = useCallback(async () => {
    try {
      setError(null)
      setLoading(true)
      const profileRes = await API.get('/api/recruiters/me/')
      let recruiterProfile = profileRes.data

      if (typeof window !== 'undefined') {
        const cachedProfile = window.sessionStorage?.getItem('pendingRecruiterProfile')
        if (cachedProfile) {
          let shouldClearCache = false
          try {
            const parsed = JSON.parse(cachedProfile)
            const payload = {}
            if (parsed.company_name && !recruiterProfile.company_name) {
              payload.company_name = parsed.company_name
            }
            if (parsed.company_website && !recruiterProfile.company_website) {
              payload.company_website = parsed.company_website
            }
            if (Object.keys(payload).length) {
              await API.patch('/api/recruiters/me/', payload)
              recruiterProfile = { ...recruiterProfile, ...payload }
            }
            shouldClearCache = true
          } catch (hydrateError) {
            console.warn('Failed to hydrate recruiter profile from cached signup data', hydrateError)
            shouldClearCache = true
          } finally {
            if (shouldClearCache) {
              window.sessionStorage.removeItem('pendingRecruiterProfile')
            }
          }
        }
      }

      setProfile(recruiterProfile)
      setForm((prev) => ({ ...prev, company: recruiterProfile.company_name || prev.company }))

      const [internshipRes, applicationRes, applicantRes] = await Promise.all([
        API.get('/api/internships/'),
        API.get('/api/applications/'),
        API.get('/api/applicants/'),
      ])

      const recruiterInternships = (internshipRes.data || []).filter((listing) => listing.recruiter === recruiterProfile.id)
      setInternships(recruiterInternships)
      setApplications(applicationRes.data || [])
      setApplicants(applicantRes.data || [])
    } catch (err) {
      console.error('Failed to load recruiter dashboard', err)
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Your session has expired. Please sign in again.')
        logout()
      } else {
        setError('Unable to load recruiter data right now. Please retry in a moment.')
      }
    } finally {
      setLoading(false)
    }
  }, [logout])

  useEffect(() => {
    fetchRecruiterData()
  }, [fetchRecruiterData])

  const applicationsByInternship = useMemo(() => {
    const map = new Map()
    applications.forEach((app) => {
      const existing = map.get(app.internship) || []
      existing.push(app)
      map.set(app.internship, existing)
    })
    return map
  }, [applications])

  const statusCounts = useMemo(() => {
    return applications.reduce(
      (acc, app) => {
        const key = app.status || 'PENDING'
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      { PENDING: 0, REVIEWED: 0, ACCEPTED: 0, REJECTED: 0 }
    )
  }, [applications])

  const totalApplicants = applications.length
  const pendingCount = statusCounts.PENDING || 0
  const reviewedCount = statusCounts.REVIEWED || 0
  const acceptedCount = statusCounts.ACCEPTED || 0
  const rejectedCount = statusCounts.REJECTED || 0
  const avgApplicantsPerListing = internships.length ? (totalApplicants / internships.length).toFixed(1) : '0.0'
  const offerRate = totalApplicants ? Math.round((acceptedCount / totalApplicants) * 100) : 0
  const newlyPosted = useMemo(
    () =>
      internships.filter((listing) => {
        const posted = new Date(listing.created_at)
        const diff = Date.now() - posted.getTime()
        return diff < 1000 * 60 * 60 * 24 * 30
      }).length,
    [internships]
  )

  const overviewCards = [
    { title: 'Active Internships', value: internships.length.toString(), sub: `${newlyPosted} posted this month` },
    { title: 'Total Applicants', value: totalApplicants.toString(), sub: `${pendingCount} awaiting review` },
    { title: 'Interviews', value: reviewedCount.toString(), sub: 'Marked as reviewed' },
    { title: 'Offers Extended', value: acceptedCount.toString(), sub: `${offerRate}% acceptance rate` },
  ]

  const applicantLookup = useMemo(() => {
    const map = new Map()
    applicants.forEach((candidate) => map.set(candidate.id, candidate))
    return map
  }, [applicants])

  const candidateMatches = useMemo(() => {
    const scored = new Map()
    applications.forEach((application) => {
      const candidate = applicantLookup.get(application.applicant)
      if (!candidate) return
      const vsps = candidate.vsps_score ?? application.applicant_vsps ?? 0
      const label = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || application.applicant_name
      const record = {
        id: application.applicant,
        name: label,
        uni: candidate.college || candidate.degree || 'Verified talent',
        vsps,
        skills: (candidate.skills || [])
          .map((skill) => normalizeSkillLabel(skill))
          .filter(Boolean)
          .slice(0, 5),
        status: application.status,
      }
      const existing = scored.get(application.applicant)
      if (!existing || existing.vsps < record.vsps) {
        scored.set(application.applicant, record)
      }
    })
    return Array.from(scored.values()).sort((a, b) => b.vsps - a.vsps)
  }, [applications, applicantLookup])

  const activeMatches = candidateMatches.filter((candidate) => candidate.status === 'PENDING' || candidate.status === 'REVIEWED')
  const starredMatches = candidateMatches.filter((candidate) => candidate.status === 'ACCEPTED')
  const filteredMatches = matchFilter === 'Active'
    ? (activeMatches.length ? activeMatches : candidateMatches)
    : (starredMatches.length ? starredMatches : candidateMatches.slice(0, 1))

  const appliedApplicantIds = useMemo(() => new Set(applications.map((app) => app.applicant)), [applications])
  const discoveryResults = useMemo(() => {
    const sorted = applicants
      .filter((candidate) => !appliedApplicantIds.has(candidate.id))
      .sort((a, b) => (b.vsps_score ?? 0) - (a.vsps_score ?? 0))
    return sorted.slice(0, 3).map((candidate) => ({
      id: candidate.id,
      name: `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim() || candidate.email,
      uni: candidate.college || candidate.degree || 'Emerging talent',
      vsps: candidate.vsps_score ?? 0,
      verification: candidate.vsps_score >= 0.75 ? 'Level 3' : candidate.vsps_score >= 0.5 ? 'Level 2' : 'Level 1',
      skills: (candidate.skills || []).map((skill) => normalizeSkillLabel(skill)).filter(Boolean).slice(0, 4),
    }))
  }, [applicants, appliedApplicantIds])

  const topSkillFilters = useMemo(() => {
    const freq = new Map()
    internships.forEach((listing) => {
      ;(listing.required_skills || []).forEach((skill) => {
        const label = normalizeSkillLabel(skill)
        if (!label) return
        freq.set(label, (freq.get(label) || 0) + 1)
      })
    })
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([skill]) => skill)
  }, [internships])

  const discoveryFilters = topSkillFilters.length
    ? topSkillFilters.map((skill) => `Skill: ${skill}`)
    : ['VSPS ≥ 0.60', 'Verified profiles only', 'Fresh activity']

  const analyticsTrends = useMemo(() => {
    const universityFrequency = new Map()
    applicants.forEach((candidate) => {
      if (!candidate.college) return
      const label = candidate.college.trim()
      if (!label) return
      universityFrequency.set(label, (universityFrequency.get(label) || 0) + 1)
    })
    const universities = Array.from(universityFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name)
      .join(' • ')

    return [
      { title: 'Avg applicants per listing', value: `${avgApplicantsPerListing} per role`, icon: ChartBar },
      { title: 'Offer acceptance rate', value: `${offerRate}% of applicants`, icon: LineChart },
      { title: 'Top universities', value: universities || 'Gathering candidate data', icon: PieChart },
    ]
  }, [applicants, avgApplicantsPerListing, offerRate])

  const internshipsTable = useMemo(() => {
    return internships
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((listing) => {
        const apps = applicationsByInternship.get(listing.id) || []
        return {
          id: listing.id,
          title: listing.title,
          location: listing.location || 'Remote',
          applicants: apps.length,
          posted: formatDate(listing.created_at),
          status: deriveListingStatus(apps),
        }
      })
  }, [internships, applicationsByInternship])

  const pipelineStages = [
    { label: 'Total Applied', count: totalApplicants },
    { label: 'Pending Review', count: pendingCount },
    { label: 'Reviewed', count: reviewedCount },
    { label: 'Accepted', count: acceptedCount },
    { label: 'Rejected', count: rejectedCount },
  ]

  const latestMessages = useMemo(() => {
    const titleMap = new Map(internships.map((listing) => [listing.id, listing.title]))
    return applications
      .slice()
      .sort((a, b) => new Date(b.applied_at) - new Date(a.applied_at))
      .slice(0, 2)
      .map((app) => ({
        sender: app.applicant_name || 'Candidate',
        preview: `Applied to ${titleMap.get(app.internship) || 'an internship'}`,
        time: formatRelativeTime(app.applied_at),
      }))
  }, [applications, internships])

  const highVspsSupply = discoveryResults.filter((candidate) => candidate.vsps >= 0.7).length
  const verifiedTalent = applicants.filter((candidate) => (candidate.vsps_score ?? 0) >= 0.5).length

  const handleNavClick = (target) => {
    setActiveNav(target)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title || !form.description) {
      setFormFeedback('Title and description are required.')
      return
    }

    try {
      setFormFeedback(null)
      setFormLoading(true)
      const requiredSkills = form.requiredSkills
        ? form.requiredSkills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : []
      const preferredSkills = form.preferredSkills
        ? form.preferredSkills.split(',').map((skill) => skill.trim()).filter(Boolean)
        : []

      const payload = {
        title: form.title,
        description: form.description,
        location: form.location || 'Remote',
        work_type: form.mode,
        stipend: form.stipend ? Number(form.stipend) : null,
        required_skills: requiredSkills,
        preferred_skills: preferredSkills,
        responsibilities: form.responsibilities || '',
        duration: form.duration || '',
        start_date: form.startDate || null,
        deadline: form.deadline || null,
      }

      if (editingListing?.id) {
        await API.patch(`/api/internships/${editingListing.id}/`, payload)
        setFormFeedback('Internship updated successfully.')
      } else {
        await API.post('/api/internships/', payload)
        setFormFeedback('Internship published and AI matching triggered.')
      }

      setEditingListing(null)
      setForm(blankForm(profile?.company_name || ''))
      await fetchRecruiterData()
    } catch (err) {
      console.error('Failed to publish internship', err)
      setFormFeedback(err.response?.data?.detail || 'Could not publish internship')
    } finally {
      setFormLoading(false)
    }
  }

  const handleCompanySubmit = async (event) => {
    event.preventDefault()
    const trimmedName = companyForm.company_name.trim()
    const trimmedWebsite = companyForm.company_website.trim()
    if (!trimmedName) {
      setCompanyError('Company name is required.')
      return
    }

    try {
      setCompanySaving(true)
      setCompanyError(null)
      await API.patch('/api/recruiters/me/', {
        company_name: trimmedName,
        company_website: trimmedWebsite,
      })
      setCompanyEditorOpen(false)
      await fetchRecruiterData()
    } catch (err) {
      setCompanyError(err.response?.data?.detail || 'Unable to update company profile right now.')
    } finally {
      setCompanySaving(false)
    }
  }

  const openCandidateModal = (candidate) => {
    setSelectedCandidate(candidate)
    setCandidateModalOpen(true)
    setInviteFeedback(null)
  }

  const closeCandidateModal = () => {
    setCandidateModalOpen(false)
    setSelectedCandidate(null)
    setInviteFeedback(null)
  }

  const handleInviteToApply = (candidate) => {
    setSelectedCandidate(candidate)
    setInviteFeedback(`Invite sent to ${candidate.name || 'candidate'} successfully.`)
    setCandidateModalOpen(true)
  }

  const openListingModal = (listing) => {
    setSelectedListing(listing)
    setListingStatus(listing.status || 'OPEN')
    setStatusFeedback(null)
    setListingModalOpen(true)
  }

  const closeListingModal = () => {
    setListingModalOpen(false)
    setSelectedListing(null)
    setStatusFeedback(null)
  }

  const handleEditListing = (listing) => {
    setEditingListing(listing)
    setForm({
      title: listing.title || '',
      company: profile?.company_name || '',
      location: listing.location || 'Remote',
      mode: listing.work_type || 'Remote',
      duration: listing.duration || '',
      stipend: listing.stipend?.toString() || '',
      description: listing.description || '',
      responsibilities: listing.responsibilities || '',
      requiredSkills: (listing.required_skills || []).join(', '),
      preferredSkills: (listing.preferred_skills || []).join(', '),
      startDate: listing.start_date || '',
      deadline: listing.deadline || '',
    })
    setActiveNav('post')
  }

  const handleUpdateListingStatus = async () => {
    if (!selectedListing?.id) return
    try {
      setStatusSaving(true)
      setStatusFeedback(null)
      await API.patch(`/api/internships/${selectedListing.id}/`, {
        status: listingStatus,
      })
      setStatusFeedback('Status updated successfully.')
      await fetchRecruiterData()
    } catch (err) {
      setStatusFeedback(err.response?.data?.detail || 'Unable to update internship status right now.')
    } finally {
      setStatusSaving(false)
    }
  }

  const renderSection = () => {
    switch (activeNav) {
      case 'post':
        return (
          <section className="mt-8 max-h-[calc(100vh-180px)] overflow-y-auto pr-4">
            <form onSubmit={handleSubmit} className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_35px_100px_rgba(5,7,19,0.55)]">
              {sectionHeading('Post internship', 'Launch a listing and trigger AI matching.')}
              <div className="mt-6 grid gap-4 text-sm text-white/80 md:grid-cols-2">
                <label className="space-y-1 md:col-span-2">
                  Internship Title
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Company Name
                  <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Location
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Work Mode
                  <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3">
                    <option>Remote</option>
                    <option>Hybrid</option>
                    <option>Onsite</option>
                  </select>
                </label>
                <label className="space-y-1">
                  Duration
                  <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g., 6 Months" className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Stipend
                  <input value={form.stipend} onChange={(e) => setForm({ ...form, stipend: e.target.value })} placeholder="₹40,000/month" className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  Job Description
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1 md:col-span-2">
                  Responsibilities
                  <textarea value={form.responsibilities} onChange={(e) => setForm({ ...form, responsibilities: e.target.value })} rows={2} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Required Skills
                  <input value={form.requiredSkills} onChange={(e) => setForm({ ...form, requiredSkills: e.target.value })} placeholder="Python, React" className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Preferred Skills
                  <input value={form.preferredSkills} onChange={(e) => setForm({ ...form, preferredSkills: e.target.value })} placeholder="Docker, AWS" className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Start Date
                  <input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
                <label className="space-y-1">
                  Application Deadline
                  <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3" />
                </label>
              </div>
              <button type="submit" disabled={formLoading} className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold shadow-[0_20px_50px_rgba(99,102,241,0.45)] disabled:cursor-not-allowed disabled:opacity-70">
                {formLoading ? (editingListing ? 'Updating…' : 'Publishing…') : editingListing ? 'Update Internship' : 'Publish Internship & Run AI Matching'}
              </button>
              {formFeedback && <p className="mt-2 text-xs text-white/70">{formFeedback}</p>}
            </form>
          </section>
        )
      case 'manage':
        return (
          <section className="mt-8 max-h-[calc(100vh-180px)] overflow-y-auto pr-4">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Manage internships', 'Track active roles and application volume.')}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase tracking-[0.3em] text-white/40">
                    <tr>
                      <th className="pb-3">Internship Title</th>
                      <th className="pb-3">Location</th>
                      <th className="pb-3">Applicants</th>
                      <th className="pb-3">Posted</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {internshipsTable.length === 0 && (
                      <tr>
                        <td className="py-4 text-white/60" colSpan={6}>
                          No listings yet. Post an internship to get started.
                        </td>
                      </tr>
                    )}
                    {internships.map((listing) => {
                      const apps = applicationsByInternship.get(listing.id) || []
                      const row = {
                        title: listing.title,
                        location: listing.location || 'Remote',
                        applicants: apps.length,
                        posted: formatDate(listing.created_at),
                        status: deriveListingStatus(apps),
                      }

                      return (
                        <tr key={listing.id} className="border-t border-white/10">
                          <td className="py-4 font-semibold">{row.title}</td>
                          <td className="py-4 text-white/60">{row.location}</td>
                          <td className="py-4 text-white/60">{row.applicants}</td>
                          <td className="py-4 text-white/60">{row.posted}</td>
                          <td className="py-4">
                            <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70">{row.status}</span>
                          </td>
                          <td className="py-4 text-right text-xs text-indigo-200">
                            <button
                              type="button"
                              onClick={() => openListingModal(listing)}
                              className="mr-3 hover:text-white"
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEditListing(listing)}
                              className="hover:text-white"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )
      case 'pipeline':
        return (
          <section className="mt-8">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Applicants pipeline', 'Live view of candidate stages.')}
              <div className="mt-6 grid gap-4 text-sm">
                {pipelineStages.map((stage) => (
                  <div key={stage.label} className="rounded-2xl border border-white/10 bg-[#0b1129] p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{stage.label}</p>
                      <span className="text-xl font-bold text-indigo-200">{stage.count}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${stage.count && totalApplicants ? Math.min((stage.count / Math.max(1, totalApplicants)) * 100, 100) : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      case 'discovery':
        return (
          <section className="mt-8">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Candidate discovery', 'Search verified students before they apply.')}
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
                {discoveryFilters.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 px-3 py-1">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-6 space-y-4">
                {discoveryResults.length === 0 && <p className="text-xs text-white/60">No additional candidates available yet.</p>}
                {discoveryResults.map((student) => (
                  <div key={student.id} className="rounded-2xl border border-white/10 bg-[#0b1129] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold">{student.name}</p>
                        <p className="text-xs text-white/50">{student.uni}</p>
                      </div>
                      <span className="text-sm font-semibold text-indigo-200">VSPS {formatVsps(student.vsps)}</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                      {student.skills.length ? (
                        student.skills.map((skill) => (
                          <span key={`${student.id}-${skill}`} className="rounded-full border border-white/10 px-3 py-1">
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-white/50">Skills syncing…</span>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-emerald-200">Verification {student.verification}</p>
                    <div className="mt-3 flex gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => openCandidateModal(student)}
                        className="flex-1 rounded-full border border-white/10 px-3 py-2 text-white/70 hover:bg-white/5"
                      >
                        View profile
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInviteToApply(student)}
                        className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-white"
                      >
                        Invite to apply
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      case 'analytics':
        return (
          <section className="mt-8">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Recruitment analytics', 'AI-powered visibility across performance.')}
              <div className="mt-5 space-y-4">
                {analyticsTrends.map((trend) => (
                  <div key={trend.title} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-sm text-white/70">
                    <trend.icon size={18} className="text-indigo-300" />
                    <div>
                      <p className="text-sm font-semibold text-white">{trend.title}</p>
                      <p>{trend.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-2xl border border-white/10 bg-[#0c122c] p-4 text-xs text-white/60">
                <p className="font-semibold text-white">AI Candidate Ranking</p>
                <p className="mt-2">Candidates are ranked via TF-IDF vectors + cosine similarity across verified skills, VSPS, and assessment accuracy.</p>
              </div>
            </div>
          </section>
        )
      case 'messages':
        return (
          <section className="mt-8">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Messages', 'Latest candidate activity in your inbox.')}
              <div className="mt-5 space-y-4">
                {latestMessages.length === 0 && <p className="text-xs text-white/60">Applicants will appear here once they contact you.</p>}
                {latestMessages.map((message) => (
                  <div key={message.sender + message.time} className="rounded-2xl border border-white/10 bg-[#0b1129] p-4">
                    <div className="flex items-center justify-between text-sm text-white/60">
                      <p className="font-semibold text-white">{message.sender}</p>
                      <span>{message.time}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/70">{message.preview}</p>
                    <div className="mt-3 flex gap-2 text-xs">
                      <button className="rounded-full border border-white/10 px-3 py-1 text-white/70 hover:bg-white/5">Reply</button>
                      <button className="rounded-full border border-white/10 px-3 py-1 text-white/70 hover:bg-white/5">Schedule interview</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      case 'company':
        return (
          <section className="mt-8">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
              {sectionHeading('Company profile', 'Keep your employer branding updated.')}
              <div className="mt-4 text-sm text-white/70">
                <p className="text-lg font-semibold text-white">{profile?.company_name || 'Company name'}</p>
                <p className="mt-2">
                  {profile?.company_website
                    ? `We share ${profile.company_name || 'your company'} details with students to improve trust.`
                    : 'Add your employer branding to boost trust with students.'}
                </p>
                <dl className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <dt className="text-white/50">Website</dt>
                    <dd className="font-semibold text-white">{profile?.company_website || '—'}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-white/50">Verification</dt>
                    <dd className="font-semibold text-white">
                      {profile?.is_verified ? 'Verified' : 'Pending'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-white/50">Contact</dt>
                    <dd className="font-semibold text-white">{user?.email}</dd>
                  </div>
                </dl>
                <button
                  type="button"
                  onClick={openCompanyEditor}
                  className="mt-4 rounded-full border border-white/10 px-4 py-2 text-xs text-white/70 transition hover:bg-white/5"
                >
                  Edit company info
                </button>
              </div>
            </div>
          </section>
        )
      default:
        return (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {overviewCards.map((card) => (
                <div key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_15px_45px_rgba(5,7,19,0.65)]">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">{card.title}</p>
                  <p className="mt-3 text-3xl font-semibold">{card.value}</p>
                  <p className="text-sm text-white/60">{card.sub}</p>
                </div>
              ))}
            </section>
            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {sectionHeading('AI Suggested Candidates', 'Ranked by VSPS, skills, and cosine similarity.')}
                  <div className="flex gap-2 rounded-full bg-white/10 p-1 text-xs">
                    {['Active', 'Starred'].map((label) => (
                      <button key={label} onClick={() => setMatchFilter(label)} className={`rounded-full px-4 py-1 ${matchFilter === label ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'text-white/60'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-6 space-y-4">
                  {filteredMatches.length === 0 && <p className="text-xs text-white/60">No candidates yet. Post a role to receive matches.</p>}
                  {filteredMatches.slice(0, 3).map((candidate) => (
                    <div key={candidate.id} className="rounded-2xl border border-white/10 bg-[#0b1129] p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold">{candidate.name}</p>
                          <p className="text-xs text-white/50">{candidate.uni}</p>
                        </div>
                        <span className="text-sm font-semibold text-indigo-200">VSPS {formatVsps(candidate.vsps)}</span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
                        {candidate.skills.length ? (
                          candidate.skills.map((skill) => (
                            <span key={`${candidate.id}-${skill}`} className="rounded-full border border-white/10 px-3 py-1">
                              {skill}
                            </span>
                          ))
                        ) : (
                          <span className="text-white/50">Skills syncing…</span>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-white/50">Status: <span className="font-semibold text-white">{candidate.status || 'Pending'}</span></span>
                        <span className="text-emerald-200">Top {candidate.skills[0] || 'skill match'}</span>
                      </div>
                      <div className="mt-3 flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={() => openCandidateModal(candidate)}
                          className="flex-1 rounded-full border border-white/10 px-3 py-2 text-white/70 hover:bg-white/5"
                        >
                          View profile
                        </button>
                        <button
                          type="button"
                          onClick={() => handleInviteToApply(candidate)}
                          className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-3 py-2 text-white"
                        >
                          Invite to apply
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
                {sectionHeading('Recruiter insight', 'Live alerts based on your pipeline.')}
                <div className="mt-5 space-y-4 text-sm text-white/80">
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                    <div className="flex items-center gap-2 text-amber-200">
                      <AlertTriangle size={16} />
                      <p className="font-semibold">Skills shortage alert</p>
                    </div>
                    <p className="mt-2 text-amber-100/80">
                      {topSkillFilters[0]
                        ? `${topSkillFilters[0]} appears in most listings, but only ${highVspsSupply} candidates exceed the VSPS 70 threshold.`
                        : 'Tag listings with required skills to unlock sourcing recommendations.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                    <div className="flex items-center gap-2 text-emerald-200">
                      <BadgeCheck size={16} />
                      <p className="font-semibold">Verified talent</p>
                    </div>
                    <p className="mt-2 text-emerald-100/80">{verifiedTalent} candidates completed assessments and can be prioritized for outreach.</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="text-sm font-semibold">Assessment efficiency</p>
                    <p className="mt-2 text-white/70">
                      {(candidateMatches.length ? Math.round((candidateMatches.length / Math.max(1, totalApplicants)) * 100) : 0) + '%'} of applicants already have VSPS coverage this week.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#030616] text-white flex items-center justify-center">Loading recruiter data…</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#030616] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-lg font-semibold">{error}</p>
        <button onClick={fetchRecruiterData} className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold">
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#030616] via-[#050a1c] to-[#090f2a] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-shrink-0 flex-col border-r border-white/5 bg-[#050a1c]/80 px-6 py-8 backdrop-blur lg:flex">
          <div className="text-xl font-semibold tracking-wide">InternConnect</div>
          <nav className="mt-10 space-y-2 text-sm font-semibold">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNavClick(link.id)}
                className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 ${
                  activeNav === link.id
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-[0_15px_45px_rgba(88,80,255,0.35)]'
                    : 'text-white/60 hover:bg-white/5'
                }`}
              >
                {link.label}
                {link.id === 'dashboard' && <ArrowUpRight size={16} />}
              </button>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            <UserCircle size={28} />
            <div>
              <p className="font-semibold text-white">{user?.first_name || 'Recruiter'}</p>
              <p className="text-xs text-white/50">{profile?.company_name || 'Company'}</p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="ml-auto flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 transition hover:bg-white/10"
            >
              <LogOut size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 sm:px-8 lg:px-10">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">Recruiter Command Center</p>
              <h1 className="text-3xl font-semibold">Welcome back, {user?.first_name || 'Recruiter'}.</h1>
              <p className="mt-1 text-sm text-white/70">
                {internships.length} active listings · {totalApplicants} applicants in flight this week.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleNavClick('messages')}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5"
                aria-label="Open messages"
              >
                <Bell size={16} />
              </button>
              <button onClick={logout} className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5">
                <LogOut size={14} />
                Sign out
              </button>
              <button onClick={() => handleNavClick('pipeline')} className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:bg-white/5">
                View Applicants
              </button>
              <button onClick={() => handleNavClick('post')} className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold shadow-[0_20px_50px_rgba(99,102,241,0.45)]">
                Post New Internship
              </button>
            </div>
          </header>

          {renderSection()}
        </main>
      </div>
      <footer className="border-t border-white/10 px-8 py-4 text-xs text-white/50">
        © {new Date().getFullYear()} InternConnect AI. All rights reserved.
      </footer>
      {candidateModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#050a1c] p-6 text-sm shadow-[0_20px_80px_rgba(3,4,14,0.8)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Candidate details</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedCandidate.name || 'Candidate profile'}</h2>
                <p className="mt-1 text-sm text-white/60">{selectedCandidate.uni}</p>
              </div>
              <button type="button" onClick={closeCandidateModal} className="rounded-full border border-white/10 p-1 text-white/60 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Verification level</p>
                <p className="mt-2 text-sm text-white">{selectedCandidate.verification || 'Verified talent'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">VSPS</p>
                <p className="mt-2 text-sm text-white">{formatVsps(selectedCandidate.vsps)}</p>
              </div>
              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Top skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedCandidate.skills || []).map((skill) => (
                    <span key={`${selectedCandidate.id}-${skill}`} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            {inviteFeedback && <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{inviteFeedback}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleInviteToApply(selectedCandidate)}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(99,102,241,0.35)]"
              >
                Send invitation
              </button>
              <button
                type="button"
                onClick={closeCandidateModal}
                className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {listingModalOpen && selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-[#050a1c] p-6 text-sm shadow-[0_20px_80px_rgba(3,4,14,0.8)] max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Internship details</p>
                <h2 className="mt-2 text-xl font-semibold text-white">{selectedListing.title || 'Internship details'}</h2>
                <p className="mt-1 text-sm text-white/60">{selectedListing.location || 'Remote'}</p>
              </div>
              <button type="button" onClick={closeListingModal} className="rounded-full border border-white/10 p-1 text-white/60 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 overflow-y-auto flex-1 pr-3">
              <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Type</p>
                <p className="mt-2 text-sm text-white">{selectedListing.work_type || 'Remote'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Stipend</p>
                <p className="mt-2 text-sm text-white">{selectedListing.stipend ? `₹${selectedListing.stipend}` : 'Not specified'}</p>
              </div>
              {selectedListing.duration && (
                <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Duration</p>
                  <p className="mt-2 text-sm text-white">{selectedListing.duration}</p>
                </div>
              )}
              {selectedListing.start_date && (
                <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Start Date</p>
                  <p className="mt-2 text-sm text-white">{new Date(selectedListing.start_date).toLocaleDateString()}</p>
                </div>
              )}
              {selectedListing.deadline && (
                <div className="rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Application Deadline</p>
                  <p className="mt-2 text-sm text-white">{new Date(selectedListing.deadline).toLocaleDateString()}</p>
                </div>
              )}
              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Description</p>
                <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{selectedListing.description || 'No description available.'}</p>
              </div>
              {selectedListing.responsibilities && (
                <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Responsibilities</p>
                  <p className="mt-2 text-sm text-white/70 whitespace-pre-line">{selectedListing.responsibilities}</p>
                </div>
              )}
              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Required skills</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(selectedListing.required_skills || []).map((skill) => (
                    <span key={`${selectedListing.id}-${skill}`} className="rounded-full border border-white/10 px-3 py-1 text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
              {selectedListing.preferred_skills && selectedListing.preferred_skills.length > 0 && (
                <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Preferred skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedListing.preferred_skills.map((skill) => (
                      <span key={`${selectedListing.id}-${skill}`} className="rounded-full border border-white/10 px-3 py-1 text-xs bg-white/5">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-[#0b1129] p-4 text-white/80">
                <label className="block text-xs uppercase tracking-[0.3em] text-white/50">Listing status</label>
                <select
                  value={listingStatus}
                  onChange={(e) => setListingStatus(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                >
                  {Object.entries(statusLabelMap).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            {statusFeedback && <p className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">{statusFeedback}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleUpdateListingStatus}
                disabled={statusSaving}
                className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(16,185,129,0.35)] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {statusSaving ? 'Saving…' : 'Save status'}
              </button>
              <button
                type="button"
                onClick={() => {
                  closeListingModal()
                  handleEditListing(selectedListing)
                }}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_15px_40px_rgba(99,102,241,0.35)]"
              >
                Edit listing
              </button>
              <button
                type="button"
                onClick={closeListingModal}
                className="flex-1 rounded-full border border-white/10 px-4 py-3 text-sm text-white/70 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {companyEditorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
          <form
            onSubmit={handleCompanySubmit}
            className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#050a1c] p-6 text-sm shadow-[0_20px_80px_rgba(3,4,14,0.8)]"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">Company profile</p>
                <h2 className="mt-2 text-xl font-semibold text-white">Update company info</h2>
              </div>
              <button type="button" onClick={closeCompanyEditor} className="rounded-full border border-white/10 p-1 text-white/60 hover:bg-white/10">
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 space-y-4 text-white/80">
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Company name</span>
                <input
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, company_name: e.target.value }))}
                  className="rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  placeholder="e.g., Lumina Labs"
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs uppercase tracking-[0.3em] text-white/50">Company website</span>
                <input
                  type="url"
                  value={companyForm.company_website}
                  onChange={(e) => setCompanyForm((prev) => ({ ...prev, company_website: e.target.value }))}
                  className="rounded-2xl border border-white/15 bg-[#070c1f] px-4 py-3 text-white focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/30"
                  placeholder="https://company.com"
                />
              </label>
            </div>
            {companyError && <p className="mt-4 text-xs text-rose-300">{companyError}</p>}
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <button
                type="button"
                onClick={closeCompanyEditor}
                className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-white/70 transition hover:bg-white/5 sm:flex-none sm:px-6"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={companySaving}
                className="flex-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 font-semibold text-white shadow-[0_15px_45px_rgba(93,89,255,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:flex-none sm:px-6"
              >
                {companySaving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
