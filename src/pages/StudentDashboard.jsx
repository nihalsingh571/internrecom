import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import API from '../services/api'
import { useAuth } from '../context/AuthContext'

export default function StudentDashboard() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [internships, setInternships] = useState([])
  const [loading, setLoading] = useState(true)

  const [newSkill, setNewSkill] = useState('')
  const [isAddingSkill, setIsAddingSkill] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const profileRes = await API.get('/api/applicants/me/')
      setProfile(profileRes.data)

      const internRes = await API.get('/api/internships/')
      setInternships(internRes.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data', error)
    } finally {
      setLoading(false)
    }
  }

  const addSkill = async () => {
    if (!newSkill) return
    try {
      const skillObj = { name: newSkill, status: 'pending' }
      const existing = Array.isArray(profile?.skills) ? profile.skills : []
      const updatedSkills = [...existing, skillObj]
      await API.patch('/api/applicants/me/', { skills: updatedSkills })
      setProfile({ ...profile, skills: updatedSkills })
      setNewSkill('')
      setIsAddingSkill(false)

      navigate('/assessment', { state: { skills: [newSkill] } })
    } catch (error) {
      alert('Failed to update skills')
    }
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  const isVerified = profile?.vsps_score > 0.0
  const skills = Array.isArray(profile?.skills) ? profile.skills : []
  const featured = internships.slice(0, 3)

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar similar to Unstop left rail */}
      <aside className="hidden md:flex w-20 bg-white border-r border-slate-200 flex-col items-center py-4 space-y-6">
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 shadow-sm" />
        <nav className="flex-1 flex flex-col items-center gap-4 text-[11px] text-slate-500">
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 text-sm font-semibold">
              T
            </span>
            <span>Talent</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 text-sm font-semibold">
              M
            </span>
            <span>Mentor</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 text-slate-500 text-sm font-semibold">
              R
            </span>
            <span>Recruiter</span>
          </div>
        </nav>
        <div className="h-9 w-9 rounded-full bg-slate-200 overflow-hidden" />
      </aside>

      {/* Main content column */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with search and logout */}
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4 justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Student Dashboard
              </p>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                Internships tailored to your skills
              </h1>
            </div>
            <div className="hidden md:flex flex-1 max-w-md">
              <div className="relative w-full">
                <span className="pointer-events-none absolute left-3 top-2.5 text-slate-400 text-sm">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search internships"
                  className="w-full rounded-full border border-slate-200 bg-slate-50 pl-8 pr-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>
            <button
              onClick={logout}
              className="text-xs sm:text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
            {/* Profile + skills card */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">
                    Welcome back
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {user?.first_name || 'Student'}
                  </h2>
                  <p className="mt-2 text-sm text-slate-600 max-w-md">
                    Your verified skills are used to rank internships in real
                    time using TF-IDF similarity, performance scores and trust
                    metrics.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
                    <div>
                      <p className="text-slate-500">VSPS Score</p>
                      <p
                        className={`mt-1 text-base font-semibold ${
                          isVerified ? 'text-emerald-600' : 'text-slate-500'
                        }`}
                      >
                        {profile?.vsps_score?.toFixed(2) ?? '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Status</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {isVerified ? 'Verified' : 'Unverified'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Active applications</p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {profile?.applications?.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  {!isVerified ? (
                    <button
                      onClick={() => navigate('/assessment')}
                      className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md"
                    >
                      Take Skill Assessment
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate('/assessment')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Retake Assessment
                    </button>
                  )}
                  <p className="text-[11px] text-slate-500 max-w-xs text-right">
                    Assessments update your VSPS score, which directly impacts
                    how internships are ranked for you.
                  </p>
                </div>
              </div>

              {/* Skills chips */}
              <div className="mt-6 border-t border-slate-100 pt-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Your verified skills
                </h3>
                <div className="flex flex-wrap gap-2 items-center">
                  {skills.map((skill, idx) => {
                    const skillName =
                      typeof skill === 'string'
                        ? skill
                        : skill?.name || 'Skill'
                    const status =
                      typeof skill === 'string'
                        ? 'verified'
                        : skill?.status || 'pending'
                    const isPending = status !== 'verified'
                    return (
                      <span
                        key={`${skillName}-${idx}`}
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${
                          isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {skillName}
                        {isPending && (
                          <span className="ml-1 text-[9px] uppercase tracking-wide">
                            Pending
                          </span>
                        )}
                      </span>
                    )
                  })}

                  {isAddingSkill ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        autoFocus
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                        placeholder="Java, SQL..."
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                      />
                      <button
                        onClick={addSkill}
                        className="text-xs font-semibold text-emerald-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setIsAddingSkill(false)}
                        className="text-xs text-slate-400"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAddingSkill(true)}
                      className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-500 hover:border-indigo-500 hover:text-indigo-600"
                    >
                      + Add Skill
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Categories row similar to Unstop */}
            <section className="flex flex-wrap gap-3">
              {[
                'Developer',
                'Product',
                'Analytics',
                'Marketing',
                'Sales',
                'Ops',
                'Design',
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="group flex flex-col items-center justify-center rounded-2xl bg-slate-50 px-5 py-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <span className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm group-hover:text-indigo-600">
                    •
                  </span>
                  {label}
                </button>
              ))}
            </section>

            {/* Filter chips */}
            <section className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-500 uppercase">
                Filters
              </span>
              {['Type', 'Location', 'Roles', 'Sort by'].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:border-indigo-500 hover:text-indigo-600"
                >
                  {label}
                </button>
              ))}
              {!isVerified && (
                <span className="text-[11px] text-red-500">
                  Complete an assessment to unlock personalised ranking.
                </span>
              )}
            </section>

            {/* Main grid: internships + sidebar */}
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900">
                  Recommended Internships
                </h3>

                {!isVerified ? (
                  <div className="bg-slate-100 rounded-2xl p-10 text-center border-2 border-dashed border-slate-300">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow">
                      🔒
                    </div>
                    <h4 className="text-lg font-semibold text-slate-900">
                      Recommendations Locked
                    </h4>
                    <p className="mt-2 text-sm text-slate-500">
                      Complete the skill assessment to see personalised
                      internship matches.
                    </p>
                    <button
                      type="button"
                      onClick={() => navigate('/assessment')}
                      className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Start Assessment
                    </button>
                  </div>
                ) : internships.length === 0 ? (
                  <p className="text-sm text-slate-600">
                    No internships found yet. Check back later or update your
                    skills.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {internships.map((internship) => {
                      const skillsRow =
                        internship.required_skills ||
                        internship.skillsRequired ||
                        []
                      const matchPercent = (
                        (internship.recruiter_rating || profile?.vsps_score || 0) *
                        100
                      ).toFixed(0)

                      return (
                        <motion.div
                          key={internship.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                        >
                          <div className="p-5 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                                  {internship.title}
                                </h4>
                                <p className="text-xs text-slate-500">
                                  {internship.company_name ||
                                    internship.recruiter?.company_name ||
                                    'Company'}
                                </p>
                              </div>
                              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-[11px] font-medium text-slate-500">
                                {internship.location
                                  ? internship.location.slice(0, 3).toUpperCase()
                                  : 'LOC'}
                              </span>
                            </div>

                            <p className="text-xs sm:text-sm text-slate-600 line-clamp-3">
                              {internship.description}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-2">
                              {skillsRow?.slice(0, 5).map((skill) => (
                                <span
                                  key={String(skill)}
                                  className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                                >
                                  {String(skill)}
                                </span>
                              ))}
                            </div>

                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                              <span>Posted recently</span>
                              <span className="text-emerald-600 font-semibold">
                                {matchPercent}% match
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Sidebar: featured + explainer */}
              <aside className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Featured Internships
                  </h4>
                  <div className="mt-3 space-y-3 text-xs">
                    {featured.length === 0 ? (
                      <p className="text-slate-500">
                        Featured internships will appear here once available.
                      </p>
                    ) : (
                      featured.map((i) => (
                        <div
                          key={i.id}
                          className="flex items-start gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                        >
                          <div className="mt-1 h-7 w-7 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-500">
                            {i.title.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {i.title}
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              {i.company_name ||
                                i.recruiter?.company_name ||
                                'Company'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-indigo-50 p-4 text-xs text-slate-700 shadow-sm">
                  <h4 className="text-sm font-semibold text-slate-900 mb-1">
                    How recommendations work
                  </h4>
                  <p>
                    We compute TF-IDF vectors for your skills and internship
                    descriptions, measure cosine similarity, and then weight
                    results using your VSPS and recruiter trust scores.
                  </p>
                </div>
              </aside>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}

