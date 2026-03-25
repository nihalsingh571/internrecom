import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import API from '../services/api'
import {
  Filter,
  MapPin,
  Building2,
  Briefcase,
  Sparkles,
  Bookmark,
  BookmarkCheck,
  Star,
  AlertTriangle,
  Share2,
  Clock,
  Globe,
  BadgeCheck,
} from 'lucide-react'

const timeAgo = (timestamp) => {
  if (!timestamp) return 'recently'
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'just now'
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
  const diffYears = Math.floor(diffMonths / 12)
  return `${diffYears} year${diffYears === 1 ? '' : 's'} ago`
}

const matchBadge = (score) => {
  if (score >= 90) return { label: 'Excellent fit', className: 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30' }
  if (score >= 70) return { label: 'Great match', className: 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30' }
  if (score >= 50) return { label: 'Moderate match', className: 'bg-amber-500/15 text-amber-200 border-amber-400/30' }
  return { label: 'Low match', className: 'bg-rose-500/15 text-rose-200 border-rose-400/30' }
}

const formatCurrency = (value) => {
  if (value == null) return 'Not disclosed'
  return `₹ ${Number(value).toLocaleString('en-IN')} / month`
}

const normalizeList = (value) => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split(/[•\n]/).map((item) => item.trim()).filter(Boolean)
  return []
}

const CompanyLogo = () => (
  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-inner shadow-black/20">
    <Building2 size={28} className="text-white/60" />
  </div>
)

export default function StudentInternships() {
  const navigate = useNavigate()
  const [internships, setInternships] = useState([])
  const [loading, setLoading] = useState(true)
  const [isVerified, setIsVerified] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedInternship, setSelectedInternship] = useState(null)
  const [savedIds, setSavedIds] = useState(new Set())
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      const profileRes = await API.get('/api/applicants/me/').catch(() => null)
      const verified = Boolean(profileRes?.data?.vsps_score > 0.0)
      setIsVerified(verified)

      const fetchRecommendations = async () => {
        try {
          const recRes = await API.get('/api/internships/recommendations/', {
            params: forceRefresh ? { refresh: true } : undefined,
          })
          return recRes.data || []
        } catch (error) {
          if ([401, 403, 404].includes(error?.response?.status)) {
            const fallback = await API.get('/api/internships/')
            return fallback.data || []
          }
          throw error
        }
      }

      if (verified) {
        const data = await fetchRecommendations()
        setInternships(data)
      } else {
        const fallback = await API.get('/api/internships/')
        setInternships(fallback.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch internships', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const filteredInternships = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return internships
    return internships.filter((internship) => {
      const companyName = (internship.recruiter?.company_name || internship.company_name || '').toLowerCase()
      const location = (internship.location || '').toLowerCase()
      const description = (internship.description || '').toLowerCase()
      const skills = Array.isArray(internship.required_skills) ? internship.required_skills.join(' ').toLowerCase() : ''
      const matchedSkills = (internship.recommendation?.skills_matched || []).join(' ').toLowerCase()
      const haystack = [
        internship.title?.toLowerCase() || '',
        companyName,
        location,
        description,
        skills,
        matchedSkills,
      ].join(' ')
      return haystack.includes(term)
    })
  }, [internships, search])

  const handleApply = async (internshipId) => {
    try {
      await API.post(`/api/internships/${internshipId}/apply/`)
      alert('Application submitted successfully!')
    } catch (error) {
      if (error.response?.data?.error) {
        alert(error.response.data.error)
      } else {
        alert('Failed to apply. Please try again.')
      }
    }
  }

  const toggleSave = (internshipId) => {
    setSavedIds((prev) => {
      const clone = new Set(prev)
      if (clone.has(internshipId)) clone.delete(internshipId)
      else clone.add(internshipId)
      return clone
    })
  }

  if (loading) return <div className="text-center text-white">Loading...</div>

  if (!isVerified) {
    return (
      <div className="rounded-3xl border border-white/10 bg-[#090d1d] p-10 text-center text-white shadow-[0_20px_80px_rgba(3,7,18,0.6)]">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">🔒</div>
        <h2 className="text-2xl font-semibold">Internships locked</h2>
        <p className="mt-2 text-sm text-white/60">Complete at least one skill assessment to unlock curated AI recommendations.</p>
        <button
          onClick={() => navigate('/student/assessment')}
          className="mt-6 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white"
        >
          Take assessment
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-white">
      <section className="rounded-3xl border border-white/10 bg-[#070b1c] p-6 shadow-lg">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">AI Internship Discovery</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">Recommended opportunities</h1>
            <p className="text-sm text-white/60">
              Rankings combine TF-IDF similarity, cosine distance, and your VSPS score.
            </p>
          </div>
          <div className="flex flex-1 flex-wrap gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <Filter size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search role or company"
                className="bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setRefreshing(true)
                fetchData(true)
              }}
              className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/70 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing…' : 'Refresh AI ranking'}
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {filteredInternships.length === 0 ? (
          <div className="col-span-full rounded-3xl border border-white/10 bg-[#080d1f] p-10 text-center text-sm text-white/50">
            No recommendations found. Update your skills to improve matches.
          </div>
        ) : (
          filteredInternships.map((internship) => {
            const score = internship.recommendation ? Math.round((internship.recommendation.final_score || 0) * 100) : null
            const skillsMatched = internship.recommendation?.skills_matched || []
            const skillsMissing = internship.recommendation?.skills_missing || []
            const badge = score !== null ? matchBadge(score) : null
            const status = internship.application_status
            const coreSkills = Array.isArray(internship.required_skills)
              ? internship.required_skills.slice(0, 4)
              : skillsMatched.slice(0, 4)
            const companyName = internship.recruiter?.company_name || internship.company_name || 'Partner company'
            return (
              <motion.div
                key={internship.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col rounded-3xl border border-white/10 bg-[#090f26] p-6 shadow-[0_25px_70px_rgba(3,7,18,0.65)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3">
                    <CompanyLogo name={companyName} />
                    <div>
                      <p className="text-xs uppercase tracking-[0.35em] text-white/40">Opportunity</p>
                      <h3 className="text-xl font-semibold text-white">{internship.title}</h3>
                      <p className="text-sm text-white/60">{companyName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {score !== null && (
                      <div className={`rounded-2xl border px-4 py-2 text-right text-sm font-semibold ${badge.className}`}>
                        <p className="text-[11px] uppercase tracking-[0.3em]">{badge.label}</p>
                        <p className="text-2xl">{score}%</p>
                      </div>
                    )}
                    {status && (
                      <p className="mt-2 text-xs text-emerald-200">
                        Status: <span className="font-semibold">{status}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-white/70 md:grid-cols-2">
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <MapPin size={16} className="text-white/60" />
                    {internship.location || 'Remote'}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Briefcase size={16} className="text-white/60" />
                    {internship.work_type || internship.mode || 'Hybrid'}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Clock size={16} className="text-white/60" />
                    {internship.duration || '6 Months'}
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                    <Sparkles size={16} className="text-white/60" />
                    {formatCurrency(internship.stipend)}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Skills</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {coreSkills.slice(0, 4).map((skill) => (
                      <span key={`${internship.id}-${skill}`} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Matched Skills</p>
                  <div className="mt-3 grid gap-2 text-sm">
                    {skillsMatched.slice(0, 3).map((skill) => (
                      <div key={`${internship.id}-match-${skill}`} className="flex items-center gap-2 text-emerald-200">
                        <BadgeCheck size={16} /> {skill}
                      </div>
                    ))}
                    {skillsMissing.slice(0, 2).map((skill) => (
                      <div key={`${internship.id}-missing-${skill}`} className="flex items-center gap-2 text-amber-200">
                        <AlertTriangle size={16} /> Improve {skill}
                      </div>
                    ))}
                    {skillsMatched.length === 0 && skillsMissing.length === 0 && (
                      <p className="text-white/60">Complete an assessment to unlock skill insights.</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => setSelectedInternship(internship)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/80 transition hover:bg-white/5"
                  >
                    View details
                  </button>
                  <button
                    onClick={() => handleApply(internship.id)}
                    className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_15px_45px_rgba(99,102,241,0.35)] transition hover:brightness-110"
                  >
                    Apply now
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSave(internship.id)}
                    className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/5"
                  >
                    {savedIds.has(internship.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                    {savedIds.has(internship.id) ? 'Saved' : 'Save'}
                  </button>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {selectedInternship && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 px-4 py-10">
          <div className="w-full max-w-5xl rounded-[32px] border border-white/10 bg-[#050916] p-8 text-white shadow-[0_60px_140px_rgba(3,4,20,0.8)]">
            <header className="flex flex-col gap-6 border-b border-white/10 pb-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <CompanyLogo />
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/40">Internship</p>
                  <h2 className="mt-2 text-3xl font-semibold">{selectedInternship.title}</h2>
                  <p className="text-lg text-white/70">
                    {selectedInternship.recruiter?.company_name || selectedInternship.company_name || 'Partner company'}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1">
                      <Briefcase size={14} /> {selectedInternship.work_type || selectedInternship.mode || 'Hybrid'}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-emerald-200">
                      Actively hiring
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => toggleSave(selectedInternship.id)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
                >
                  {savedIds.has(selectedInternship.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                  {savedIds.has(selectedInternship.id) ? 'Saved' : 'Save job'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
                >
                  <Share2 size={16} /> Share
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedInternship(null)}
                  className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-4">
              {[
                { label: 'Location', value: selectedInternship.location || 'Remote', icon: <MapPin size={16} /> },
                { label: 'Stipend', value: formatCurrency(selectedInternship.stipend), icon: <Sparkles size={16} /> },
                { label: 'Duration', value: selectedInternship.duration || '6 Months', icon: <Clock size={16} /> },
                { label: 'Start date', value: selectedInternship.start_date || 'Immediate', icon: <Globe size={16} /> },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                  <span className="text-white">{item.icon}</span>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-white/40">{item.label}</p>
                    <p className="font-semibold text-white">{item.value}</p>
                  </div>
                </div>
              ))}
            </section>

            <section className="mt-8 grid gap-6 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Match score</p>
                <div className="mt-3 flex items-center gap-4">
                  <div className="rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/70">AI Match</p>
                    <p className="text-4xl font-semibold text-white">
                      {selectedInternship.recommendation
                        ? Math.round((selectedInternship.recommendation.final_score || 0) * 100)
                        : '—'}
                      %
                    </p>
                  </div>
                  <p className="text-sm text-white/70">
                    {selectedInternship.recommendation
                      ? 'Your verified skills align with this role.'
                      : 'Complete a skill assessment to unlock personalized matches.'}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Matched Skills</p>
                  <div className="mt-2 space-y-1 text-sm text-emerald-200">
                    {(selectedInternship.recommendation?.skills_matched || []).map((skill) => (
                      <div key={`detail-match-${skill}`} className="flex items-center gap-2">
                        <BadgeCheck size={16} /> {skill}
                      </div>
                    ))}
                    {(selectedInternship.recommendation?.skills_matched || []).length === 0 && (
                      <p className="text-white/50">No verified skills yet.</p>
                    )}
                  </div>
                </div>
                {selectedInternship.recommendation?.skills_missing?.length ? (
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-[0.3em] text-white/40">Recommended to improve</p>
                    <div className="mt-2 space-y-1 text-sm text-amber-200">
                      {selectedInternship.recommendation.skills_missing.slice(0, 3).map((skill) => (
                        <div key={`detail-missing-${skill}`} className="flex items-center gap-2">
                          <AlertTriangle size={16} /> {skill}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Key Skills</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(selectedInternship.required_skills || []).map((skill) => (
                    <span
                      key={`detail-skill-${skill}`}
                      className="rounded-full border border-white/10 bg-[#0d1329] px-3 py-1 text-sm text-white/80"
                    >
                      {skill}
                    </span>
                  ))}
                  {(!selectedInternship.required_skills || selectedInternship.required_skills.length === 0) && (
                    <p className="text-sm text-white/50">Recruiter did not specify required skills.</p>
                  )}
                </div>
                <div className="mt-6 flex flex-wrap gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-amber-200">
                    <Star size={14} /> {selectedInternship.recruiter?.rating ? `${selectedInternship.recruiter.rating.toFixed(1)}` : '4.6'} recruiter rating
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-emerald-200">
                    <BadgeCheck size={14} /> Verified recruiter
                  </span>
                </div>
              </div>
            </section>

            <section className="mt-8 grid gap-8 md:grid-cols-2">
              <article>
                <h3 className="text-lg font-semibold text-white">About the role</h3>
                <p className="mt-3 text-sm text-white/70">
                  {selectedInternship.description ||
                    'InternConnect curated description is not available. Expect a fast-paced environment building production-grade features.'}
                </p>
                {normalizeList(selectedInternship.responsibilities).length > 0 && (
                  <>
                    <h4 className="mt-4 text-sm font-semibold text-white">Responsibilities</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
                      {normalizeList(selectedInternship.responsibilities).map((item) => (
                        <li key={`resp-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
                {normalizeList(selectedInternship.requirements).length > 0 && (
                  <>
                    <h4 className="mt-4 text-sm font-semibold text-white">Requirements</h4>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/70">
                      {normalizeList(selectedInternship.requirements).map((item) => (
                        <li key={`req-${item}`}>{item}</li>
                      ))}
                    </ul>
                  </>
                )}
              </article>
              <aside className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/70">
                <h3 className="text-lg font-semibold text-white">Internship details</h3>
                <dl className="mt-3 space-y-2">
                  {[
                    ['Role', selectedInternship.title],
                    ['Company', selectedInternship.recruiter?.company_name || selectedInternship.company_name || 'Partner company'],
                    ['Location', selectedInternship.location || 'Remote'],
                    ['Mode', selectedInternship.work_type || selectedInternship.mode || 'Hybrid'],
                    ['Duration', selectedInternship.duration || '6 Months'],
                    ['Stipend', formatCurrency(selectedInternship.stipend)],
                    ['Posted', timeAgo(selectedInternship.created_at)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between">
                      <dt className="text-white/50">{label}</dt>
                      <dd className="font-semibold text-white">{value}</dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </section>

            <section className="mt-8 grid gap-6 md:grid-cols-2">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-white">Company information</h3>
                <p className="mt-3 text-sm text-white/70">
                  {selectedInternship.recruiter?.company_description ||
                    `${selectedInternship.recruiter?.company_name || 'This organization'} partners with InternConnect to run high-impact internship programs.`}
                </p>
                <dl className="mt-4 space-y-1 text-sm text-white/70">
                  <div className="flex justify-between">
                    <dt>Industry</dt>
                    <dd>{selectedInternship.recruiter?.industry || 'Technology'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Company size</dt>
                    <dd>{selectedInternship.recruiter?.company_size || '500+'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Website</dt>
                    <dd>{selectedInternship.recruiter?.company_website || 'Coming soon'}</dd>
                  </div>
                </dl>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold text-white">Application process</h3>
                <ol className="mt-3 space-y-2 text-sm text-white/70">
                  {normalizeList(selectedInternship.application_process).length > 0
                    ? normalizeList(selectedInternship.application_process).map((step, index) => (
                        <li key={`process-${step}`} className="flex gap-2">
                          <span className="font-semibold text-white">{index + 1}.</span> {step}
                        </li>
                      ))
                    : ['Application review', 'Technical interview', 'Final conversation', 'Offer rollout'].map((step, index) => (
                        <li key={`default-process-${step}`} className="flex gap-2">
                          <span className="font-semibold text-white">{index + 1}.</span> {step}
                        </li>
                      ))}
                </ol>
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h3 className="text-lg font-semibold text-white">Related internships</h3>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {filteredInternships
                  .filter((role) => role.id !== selectedInternship.id)
                  .slice(0, 2)
                  .map((role) => (
                    <div key={`related-${role.id}`} className="rounded-2xl border border-white/10 bg-[#0c122c] p-4">
                      <p className="text-sm font-semibold text-white">{role.title}</p>
                      <p className="text-xs text-white/50">
                        {role.recruiter?.company_name || 'Partner'} • Match{' '}
                        {role.recommendation ? Math.round((role.recommendation.final_score || 0) * 100) : '—'}%
                      </p>
                      <button
                        type="button"
                        onClick={() => setSelectedInternship(role)}
                        className="mt-3 text-sm font-semibold text-indigo-200 hover:text-white"
                      >
                        View
                      </button>
                    </div>
                  ))}
              </div>
            </section>

            <footer className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6">
              <div className="text-sm text-white/60">Posted {selectedInternship.created_at ? timeAgo(selectedInternship.created_at) : 'recently'}</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInternship(null)}
                  className="rounded-full border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 hover:bg-white/5"
                >
                  Maybe later
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApply(selectedInternship.id)
                    setSelectedInternship(null)
                  }}
                  className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_25px_60px_rgba(99,102,241,0.45)] hover:brightness-110"
                >
                  Apply now
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  )
}
