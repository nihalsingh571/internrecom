import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  BarChart3,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck,
  FileCog,
  FileText,
  GraduationCap,
  LineChart,
  LogOut,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Code2,
  Coffee,
  Atom,
  Server,
  Database as DatabaseIcon,
  Cloud,
  Brain,
  GitBranch,
  Boxes,
  PencilRuler,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import API from '../services/api'
import FeedbackToast from '../components/FeedbackToast'

const sidebarLinks = [
  { label: 'Dashboard', icon: LineChart },
  { label: 'Users', icon: Users },
  { label: 'Students', icon: GraduationCap },
  { label: 'Recruiters', icon: Building2 },
  { label: 'Internships', icon: Briefcase },
  { label: 'Applications', icon: ClipboardList },
  { label: 'Assessments', icon: FileCheck },
  { label: 'Skills', icon: Sparkles },
  { label: 'Reports', icon: BarChart3 },
  { label: 'Platform Settings', icon: Settings },
  { label: 'Profile', icon: ShieldCheck },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user, logout, login, refreshUser } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [studentProfiles, setStudentProfiles] = useState([])
  const [recruiterProfiles, setRecruiterProfiles] = useState([])
  const [internshipList, setInternshipList] = useState([])
  const [applications, setApplications] = useState([])
  const [assessmentAttempts, setAssessmentAttempts] = useState([])
  const [skills, setSkills] = useState([])
  const [users, setUsers] = useState([])
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState(null)
  const [pendingAction, setPendingAction] = useState(null)
  const [userActionLoading, setUserActionLoading] = useState(null)
  const [selectedListing, setSelectedListing] = useState(null)
  const [editingListing, setEditingListing] = useState(null)
  const [pendingListingDelete, setPendingListingDelete] = useState(null)
  const [internshipActionLoading, setInternshipActionLoading] = useState(null)
  const [createListingForm, setCreateListingForm] = useState(null)
  const [skillActionLoading, setSkillActionLoading] = useState(null)
  const [selectedSkillForQuestions, setSelectedSkillForQuestions] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionLoading, setQuestionLoading] = useState(false)
  const [questionForm, setQuestionForm] = useState({ text: '', options: ['', '', '', ''], correct_option: 0 })
  const [editingQuestionId, setEditingQuestionId] = useState(null)
  const [questionActionLoading, setQuestionActionLoading] = useState(null)
  const [importingQuestions, setImportingQuestions] = useState(false)
  const [importFeedback, setImportFeedback] = useState(null)
  const fileInputRef = useRef(null)
  const [addSkillForm, setAddSkillForm] = useState({ name: '' })
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [addUserLoading, setAddUserLoading] = useState(false)
  const [newUserForm, setNewUserForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'ADMIN',
    password: '',
  })
  const [profileForm, setProfileForm] = useState({ first_name: '', last_name: '', email: '' })
  const [profileSaving, setProfileSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [enforce2FA, setEnforce2FA] = useState(true)
  const [autoApproveVerified, setAutoApproveVerified] = useState(true)
  const [activeSection, setActiveSection] = useState('Dashboard')
  const [fetchError, setFetchError] = useState(null)
  const [lastSynced, setLastSynced] = useState(null)
  const [selectedAttempt, setSelectedAttempt] = useState(null)
  const formatSkillLabel = useCallback((skill) => {
    if (typeof skill === 'string') return skill
    if (!skill || typeof skill !== 'object') return 'Skill'
    return skill.name || skill.label || skill.title || skill.skill || (typeof skill.id !== 'undefined' ? `Skill #${skill.id}` : 'Skill')
  }, [])
  const formatPercentDisplay = useCallback((value, multiplier = 1) => {
    if (value === null || value === undefined) return '—'
    const computed = Number(value) * multiplier
    if (Number.isNaN(computed)) return '—'
    return `${computed.toFixed(1).replace(/\.0$/, '')}%`
  }, [])

  const verifiedStudents = useMemo(() => studentProfiles.filter((profile) => (profile.vsps_score ?? 0) > 0), [studentProfiles])
  const pendingApplications = useMemo(() => applications.filter((app) => app.status === 'PENDING').length, [applications])
  const activeRecruiters = useMemo(() => recruiterProfiles.filter((rec) => rec.is_verified).length, [recruiterProfiles])

  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
      })
    }
  }, [user])

  const metrics = useMemo(() => {
    const totalStudents = studentProfiles.length
    const totalRecruiters = recruiterProfiles.length
    const totalInternships = internshipList.length
    const totalApplications = applications.length
    const totalUsers = users.length || totalStudents + totalRecruiters
    const totalAssessments = verifiedStudents.length
    const avgVsps = totalAssessments
      ? verifiedStudents.reduce((sum, profile) => sum + (profile.vsps_score || 0), 0) / totalAssessments
      : 0
    const avgInternshipsPerRecruiter = totalRecruiters ? (totalInternships / totalRecruiters).toFixed(1) : '0.0'

    return [
      { title: 'Total Users', value: totalUsers.toLocaleString('en-US'), change: `${totalStudents} students`, icon: Users, glow: 'from-indigo-500/40 to-purple-500/20' },
      { title: 'Total Students', value: totalStudents.toLocaleString('en-US'), change: `${totalAssessments} verified`, icon: GraduationCap, glow: 'from-blue-500/40 to-cyan-500/20' },
      { title: 'Total Recruiters', value: totalRecruiters.toLocaleString('en-US'), change: `${activeRecruiters} verified`, icon: Building2, glow: 'from-fuchsia-500/40 to-indigo-500/20' },
      { title: 'Total Internships', value: totalInternships.toLocaleString('en-US'), change: `${avgInternshipsPerRecruiter} per recruiter`, icon: Briefcase, glow: 'from-purple-500/40 to-blue-500/20' },
      { title: 'Total Applications', value: totalApplications.toLocaleString('en-US'), change: `${pendingApplications} pending`, icon: ClipboardList, glow: 'from-emerald-500/40 to-teal-500/20' },
      { title: 'Assessments Verified', value: totalAssessments.toLocaleString('en-US'), change: `${(avgVsps * 100).toFixed(0)} avg VSPS`, icon: Activity, glow: 'from-pink-500/40 to-indigo-500/20' },
    ]
  }, [studentProfiles, recruiterProfiles, internshipList, applications, verifiedStudents, activeRecruiters, pendingApplications, users])

  const userRows = useMemo(() => {
    const studentByEmail = new Map(studentProfiles.map((profile) => [profile.email?.toLowerCase(), profile]))
    const recruiterByEmail = new Map(recruiterProfiles.map((profile) => [profile.email?.toLowerCase(), profile]))

    return users
      .map((account) => {
        if (!account || !account.role) return null
        const emailKey = (account.email || '').toLowerCase()
        const studentProfile = studentByEmail.get(emailKey)
        const recruiterProfile = recruiterByEmail.get(emailKey)
      const normalizedRole = account.role === 'APPLICANT' ? 'Student' : account.role === 'RECRUITER' ? 'Recruiter' : 'Admin'

      let statusLabel = 'Pending'
      if (!account.is_active) {
        statusLabel = 'Suspended'
      } else if (normalizedRole === 'Student') {
        statusLabel = studentProfile && (studentProfile.vsps_score ?? 0) > 0.05 ? 'Active' : 'Pending'
      } else if (normalizedRole === 'Recruiter') {
        statusLabel = recruiterProfile?.is_verified ? 'Active' : 'Pending Verification'
      } else {
        statusLabel = 'Active'
      }

        return {
          id: `USR-${account.id}`,
          name:
            account.role === 'RECRUITER' && recruiterProfile?.company_name
              ? `${recruiterProfile.company_name} Recruiter`
              : `${account.first_name || ''} ${account.last_name || ''}`.trim() || account.email,
        email: account.email,
        role: normalizedRole,
        status: statusLabel,
        raw: account,
        profile: studentProfile || recruiterProfile || null,
        profileType: studentProfile ? 'student' : recruiterProfile ? 'recruiter' : null,
        }
      })
      .filter(Boolean)
  }, [users, studentProfiles, recruiterProfiles])

  const filteredUserRows = useMemo(() => {
    const query = userSearch.trim().toLowerCase()
    return userRows.filter((row) => {
      const matchesQuery = !query || row.name.toLowerCase().includes(query) || row.email.toLowerCase().includes(query) || row.id.toLowerCase().includes(query)
      const matchesRole = roleFilter === 'ALL' || row.role.toUpperCase() === roleFilter
      const normalizedStatus = row.status.toUpperCase()
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && normalizedStatus.startsWith('ACTIVE')) ||
        (statusFilter === 'PENDING' && (normalizedStatus.includes('PENDING') || normalizedStatus.includes('VERIFICATION'))) ||
        (statusFilter === 'SUSPENDED' && normalizedStatus === 'SUSPENDED')
      return matchesQuery && matchesRole && matchesStatus
    })
  }, [userRows, userSearch, roleFilter, statusFilter])

  const getStatusStyle = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-500/40'
      case 'Suspended':
        return 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-500/40'
      case 'Pending Verification':
        return 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-500/40'
      default:
        return 'bg-indigo-400/15 text-indigo-200 ring-1 ring-indigo-500/40'
    }
  }

  const formatDisplayDate = (value) => {
    if (!value) return '—'
    try {
      return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    } catch {
      return value
    }
  }

  const studentTableRows = useMemo(() => studentProfiles.slice(0, Math.max(5, studentProfiles.length)), [studentProfiles])

  const internshipsByRecruiter = useMemo(() => {
    const map = new Map()
    internshipList.forEach((internship) => {
      const current = map.get(internship.recruiter) || 0
      map.set(internship.recruiter, current + 1)
    })
    return map
  }, [internshipList])

  const recruiterDisplay = useMemo(
    () =>
      recruiterProfiles.map((rec) => ({
        id: rec.id,
        company: rec.company_name || '—',
        recruiter: rec.email,
        internships: internshipsByRecruiter.get(rec.id) || 0,
        verified: rec.is_verified,
      })),
    [recruiterProfiles, internshipsByRecruiter],
  )

  const recruiterOptions = useMemo(
    () =>
      recruiterProfiles.map((rec) => ({
        id: rec.id,
        label: rec.company_name || rec.email || `Recruiter #${rec.id}`,
      })),
    [recruiterProfiles],
  )

  const formatCSVValue = (value) => {
    if (value === null || value === undefined) return ''
    if (Array.isArray(value)) return value.join('; ')
    return String(value).replace(/"/g, '""')
  }

  const iconLookup = useMemo(
    () => [
      { test: /python|django|flask/i, icon: Code2 },
      { test: /java/i, icon: Coffee },
      { test: /react|javascript|typescript|next|frontend/i, icon: Atom },
      { test: /node|express|backend|microservice/i, icon: Server },
      { test: /sql|database|mongo|postgres|mysql|redis/i, icon: DatabaseIcon },
      { test: /aws|cloud|devops|kubernetes/i, icon: Cloud },
      { test: /ai|ml|deep|vision|nlp|data/i, icon: Brain },
      { test: /git|version|pipeline/i, icon: GitBranch },
      { test: /design|ux|ui|figma/i, icon: PencilRuler },
      { test: /security|cyber/i, icon: ShieldCheck },
      { test: /blockchain|web3|solidity/i, icon: Boxes },
    ],
    [],
  )

  const getSkillIcon = (label) => {
    if (!label) return Sparkles
    for (const entry of iconLookup) {
      if (entry.test.test(label)) return entry.icon
    }
    return Sparkles
  }

  const loadSkillQuestions = useCallback(async (skillId) => {
    if (!skillId) {
      setQuestions([])
      return
    }
    setQuestionLoading(true)
    try {
      const res = await API.get(`/api/questions/?skill=${skillId}`)
      setQuestions(res.data ?? [])
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to load assessment questions.' })
      setQuestions([])
    } finally {
      setQuestionLoading(false)
    }
  }, [])

  const handleDocxFileSelected = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const fileName = file.name || ''
    if (!fileName.toLowerCase().endsWith('.docx')) {
      setImportFeedback({ type: 'error', message: 'Please upload a .docx file.' })
      return
    }

    await handleDocxImport(file)
  }

  const handleDocxImport = async (file) => {
    if (!selectedSkillForQuestions) {
      setImportFeedback({ type: 'error', message: 'Select a skill before importing questions.' })
      return
    }

    setImportingQuestions(true)
    setImportFeedback(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('skill_id', selectedSkillForQuestions)

      const res = await API.post('/api/questions/import-docx/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const imported = res.data?.imported
      setImportFeedback({ type: 'success', message: `${imported || 0} questions imported successfully.` })

      // Refresh the question list after importing
      await loadSkillQuestions(selectedSkillForQuestions)
    } catch (error) {
      // Try to show the most relevant error message to the user
      const responseData = error?.response?.data
      const message =
        (responseData && responseData.detail) ||
        (responseData?.errors && Array.isArray(responseData.errors) ? responseData.errors.join(', ') : null) ||
        error?.message ||
        'Failed to import questions. Please check the file format and try again.'

      setImportFeedback({ type: 'error', message })
    } finally {
      setImportingQuestions(false)
    }
  }

  const buildCSV = (headers, rows) => {
    const headerLine = headers.map((h) => `"${h.label}"`).join(',')
    const body = rows
      .map((row) =>
        headers
          .map((h) => {
            const val = typeof h.value === 'function' ? h.value(row) : row[h.value]
            return `"${formatCSVValue(val)}"`
          })
          .join(','),
      )
      .join('\n')
    return `${headerLine}\n${body}`
  }

  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportSectionToCSV = (section) => {
    let headers = []
    let rows = []
    switch (section) {
      case 'users':
        rows = filteredUserRows
        headers = [
          { label: 'User ID', value: (row) => row.id },
          { label: 'Name', value: (row) => row.name },
          { label: 'Email', value: (row) => row.email },
          { label: 'Role', value: (row) => row.role },
          { label: 'Status', value: (row) => row.status },
          { label: 'Joined', value: (row) => (row.raw.date_joined ? new Date(row.raw.date_joined).toISOString() : '') },
        ]
        break
      case 'students':
        rows = studentProfiles
        headers = [
          { label: 'Name', value: (row) => `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.email },
          { label: 'Email', value: (row) => row.email },
          { label: 'University', value: (row) => row.college },
          { label: 'Degree', value: (row) => row.degree },
          { label: 'Major', value: (row) => row.major },
          { label: 'Graduation Year', value: (row) => row.graduation_year },
          { label: 'Skills', value: (row) => (Array.isArray(row.skills) ? row.skills.join('; ') : '') },
          { label: 'VSPS', value: (row) => row.vsps_score },
        ]
        break
      case 'recruiters':
        rows = recruiterDisplay
        headers = [
          { label: 'Company', value: (row) => row.company },
          { label: 'Recruiter Email', value: (row) => row.recruiter },
          { label: 'Active Internships', value: (row) => row.internships },
          { label: 'Verified', value: (row) => (row.verified ? 'Yes' : 'No') },
        ]
        break
      case 'internships':
        rows = internshipList
        headers = [
          { label: 'Title', value: (row) => row.title },
          { label: 'Company', value: (row) => row.company_name },
          { label: 'Recruiter', value: (row) => row.recruiter_name || row.recruiter_email },
          { label: 'Location', value: (row) => row.location },
          { label: 'Work Type', value: (row) => row.work_type || row.type },
          { label: 'Stipend', value: (row) => row.stipend },
          { label: 'Skills', value: (row) => (Array.isArray(row.required_skills) ? row.required_skills.join('; ') : '') },
          { label: 'Posted On', value: (row) => row.created_at },
          { label: 'Status', value: (row) => ((row.recruiter_rating || 0) >= 0.7 ? 'Approved' : 'Pending') },
        ]
        break
      case 'applications':
        rows = applicationsDisplay
        headers = [
          { label: 'Student', value: (row) => row.student },
          { label: 'Internship', value: (row) => row.internship },
          { label: 'Company', value: (row) => row.company },
          { label: 'Status', value: (row) => row.status },
        ]
        break
      case 'skills':
        rows = skills
        headers = [
          { label: 'Skill', value: (row) => formatSkillLabel(row) },
          { label: 'ID', value: (row) => row.id || '' },
        ]
        break
      case 'assessments':
        rows = assessmentAttempts
        headers = [
          { label: 'Attempt ID', value: (row) => row.id },
          { label: 'User', value: (row) => row.user_name },
          { label: 'Email', value: (row) => row.user_email },
          { label: 'Skills', value: (row) => (Array.isArray(row.skills) ? row.skills.join('|') : '') },
          { label: 'Status', value: (row) => row.status },
          { label: 'Score %', value: (row) => (typeof row.score_percent === 'number' ? row.score_percent : '') },
          { label: 'VSPS', value: (row) => (typeof row.final_vsps === 'number' ? row.final_vsps : '') },
          { label: 'Violations', value: (row) => row.violation_count ?? 0 },
          { label: 'Started', value: (row) => row.start_time },
          { label: 'Completed', value: (row) => row.end_time || '' },
        ]
        break
      default:
        break
    }

    if (!rows || rows.length === 0) {
      setFeedback({ type: 'error', message: 'No data available to export yet.' })
      return
    }

    const csv = buildCSV(headers, rows)
    downloadCSV(csv, `internconnect-${section}-${new Date().toISOString().slice(0, 10)}.csv`)
    setFeedback({ type: 'success', message: 'CSV export ready.' })
  }

  const internshipLookup = useMemo(() => {
    const lookup = new Map()
    internshipList.forEach((internship) => {
      lookup.set(internship.id, internship)
    })
    return lookup
  }, [internshipList])

  const applicationsDisplay = useMemo(
    () =>
      applications.map((app) => {
        const internship = internshipLookup.get(app.internship)
        return {
          id: app.id,
          student: app.applicant_name || 'Applicant',
          internship: internship?.title || `Internship #${app.internship}`,
          company: internship?.company_name || '—',
          status: app.status,
        }
      }),
    [applications, internshipLookup],
  )

  const chartData = useMemo(() => {
    const growthBuckets = new Array(7).fill(0)
    studentProfiles.forEach((student, index) => {
      const bucket = index % 7
      const contribution = Math.round(((student.vsps_score ?? student.recency_score ?? 0.2) + 0.05) * 100)
      growthBuckets[bucket] = Math.min(100, growthBuckets[bucket] + contribution)
    })
    if (growthBuckets.every((value) => value === 0)) {
      growthBuckets.fill(25)
    }

    const internshipTrend = new Array(7).fill(0)
    internshipList.forEach((internship) => {
      const created = internship.created_at ? new Date(internship.created_at) : null
      const bucket = created ? created.getDay() % 7 : Math.floor(Math.random() * 7)
      internshipTrend[bucket] += 1
    })
    if (internshipTrend.every((value) => value === 0)) {
      internshipTrend.fill(1)
    }

    const assessmentTrend = new Array(7).fill(0)
    verifiedStudents.forEach((student, index) => {
      const bucket = index % 7
      assessmentTrend[bucket] += Math.max(1, Math.round((student.vsps_score || 0.2) * 10))
    })
    if (assessmentTrend.every((value) => value === 0)) {
      assessmentTrend.fill(2)
    }

    return {
      growth: growthBuckets,
      internships: internshipTrend,
      assessments: assessmentTrend,
    }
  }, [studentProfiles, internshipList, verifiedStudents])

  const handleAdminLogin = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const res = await login(email, password, null)
    setIsSubmitting(false)
    if (!res.success) {
      if (res.twoFactorRequired) {
        setFeedback({ type: 'error', message: '2FA required. Continue in the verification window.' })
      } else if (res.twoFactorEnforced) {
        setFeedback({
          type: 'error',
          message: res.error || 'Enable two-factor authentication from the Security Center to proceed.',
        })
      } else {
        setFeedback({ type: 'error', message: res.error || 'Admin login failed.' })
      }
      return
    }
    if (res.twoFactorSetupRequired) {
      setFeedback({
        type: 'info',
        message: res.twoFactorSetupDetail || 'Complete your two-factor setup in the Security Center.',
      })
      navigate('/settings/security', { state: { fromLogin: true } })
      return
    }
    setFeedback({ type: 'success', message: 'Welcome back, Control Center unlocked.' })
  }

  const handleUserAction = async (action, row) => {
    if (!row) return
    if (action === 'view') {
      setSelectedUser(row)
      return
    }
    const actionKey = `${action}-${row.raw.id}`
    setUserActionLoading(actionKey)
    try {
      if (action === 'suspend') {
        await API.post(`/api/users/${row.raw.id}/suspend/`)
        setFeedback({ type: 'success', message: `${row.name} suspended.` })
      } else if (action === 'activate') {
        await API.post(`/api/users/${row.raw.id}/activate/`)
        setFeedback({ type: 'success', message: `${row.name} reactivated.` })
      } else if (action === 'promote') {
        await API.patch(`/api/users/${row.raw.id}/`, { role: 'ADMIN' })
        setFeedback({ type: 'success', message: `${row.name} is now an Admin.` })
      } else if (action === 'delete') {
        await API.delete(`/api/users/${row.raw.id}/`)
        setFeedback({ type: 'success', message: `${row.name} removed.` })
      } else if (action === 'verify' && row.profileType === 'recruiter' && row.profile?.id) {
        await API.patch(`/api/recruiters/${row.profile.id}/`, { is_verified: true })
        setFeedback({ type: 'success', message: `${row.name} verified.` })
      }
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to update account. Please try again.' })
    } finally {
      setUserActionLoading(null)
    }
  }

  const confirmPendingAction = async () => {
    if (!pendingAction) return
    await handleUserAction(pendingAction.action, pendingAction.row)
    setPendingAction(null)
  }

  const openListingEditor = (listing) => {
    setEditingListing({
      id: listing.id,
      title: listing.title,
      location: listing.location || 'Remote',
      work_type: listing.work_type || 'On-site',
      stipend: listing.stipend ?? '',
      required_skills: Array.isArray(listing.required_skills) ? listing.required_skills.join(', ') : '',
      description: listing.description || '',
    })
  }

  const handleListingToggle = async (listing) => {
    const key = `toggle-${listing.id}`
    setInternshipActionLoading(key)
    const approved = (listing.recruiter_rating ?? 0) >= 0.7
    try {
      await API.patch(`/api/internships/${listing.id}/`, { recruiter_rating: approved ? 0.3 : 0.9 })
      setFeedback({ type: 'success', message: approved ? 'Internship paused.' : 'Internship approved.' })
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to update internship status.' })
    } finally {
      setInternshipActionLoading(null)
    }
  }

  const handleListingSave = async () => {
    if (!editingListing) return
    const key = `edit-${editingListing.id}`
    setInternshipActionLoading(key)
    try {
      const skills = editingListing.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await API.patch(`/api/internships/${editingListing.id}/`, {
        location: editingListing.location,
        work_type: editingListing.work_type,
        stipend: editingListing.stipend || null,
        description: editingListing.description,
        required_skills: skills,
      })
      setFeedback({ type: 'success', message: 'Internship updated.' })
      setEditingListing(null)
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to save internship changes.' })
    } finally {
      setInternshipActionLoading(null)
    }
  }

  const confirmListingDelete = async () => {
    if (!pendingListingDelete) return
    const key = `delete-${pendingListingDelete.id}`
    setInternshipActionLoading(key)
    try {
      await API.delete(`/api/internships/${pendingListingDelete.id}/`)
      setFeedback({ type: 'success', message: 'Internship removed.' })
      setPendingListingDelete(null)
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to delete internship.' })
    } finally {
      setInternshipActionLoading(null)
    }
  }

  const openCreateListing = () => {
    if (recruiterOptions.length === 0) {
      setFeedback({ type: 'error', message: 'No recruiter profiles available. Create a recruiter first.' })
      return
    }
    setCreateListingForm({
      recruiter_id: recruiterOptions[0]?.id || '',
      title: '',
      location: 'Remote',
      work_type: 'On-site',
      stipend: '',
      required_skills: '',
      description: '',
    })
  }

  const handleCreateListing = async () => {
    if (!createListingForm?.recruiter_id) {
      setFeedback({ type: 'error', message: 'Please select a recruiter.' })
      return
    }
    const key = 'create-listing'
    setInternshipActionLoading(key)
    try {
      const skills = createListingForm.required_skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      await API.post('/api/internships/', {
        title: createListingForm.title,
        location: createListingForm.location,
        work_type: createListingForm.work_type,
        stipend: createListingForm.stipend || null,
        description: createListingForm.description,
        required_skills: skills,
        recruiter_id: createListingForm.recruiter_id,
      })
      setFeedback({ type: 'success', message: 'Internship posted.' })
      setCreateListingForm(null)
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to post internship.' })
    } finally {
      setInternshipActionLoading(null)
    }
  }

  const handleSkillDelete = async (skillId) => {
    if (!skillId) return
    setSkillActionLoading(skillId)
    try {
      await API.delete(`/api/skills/${skillId}/`)
      setFeedback({ type: 'success', message: 'Skill removed.' })
      await fetchAdminData()
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to delete skill.' })
    } finally {
      setSkillActionLoading(null)
    }
  }

const handleSkillAdd = async (e) => {
    e.preventDefault()
    if (!addSkillForm.name.trim()) {
      setFeedback({ type: 'error', message: 'Skill name cannot be empty.' })
      return
    }
    setSkillActionLoading('create-skill')
    try {
      const response = await API.post('/api/skills/', { name: addSkillForm.name.trim() })
      const successMessage = response.data?.message || `${addSkillForm.name} added.`
      setFeedback({ type: 'success', message: successMessage })
      setAddSkillForm({ name: '' })
      await fetchAdminData()
    } catch (error) {
      const duplicateMessage = error.response?.data?.name?.[0]
      if (duplicateMessage && duplicateMessage.toLowerCase().includes('exists')) {
        setFeedback({ type: 'error', message: 'Skill already exists in the catalog.' })
      } else {
        setFeedback({ type: 'error', message: 'Unable to add skill.' })
      }
    } finally {
      setSkillActionLoading(null)
    }
  }

  const closeAddUserModal = () => {
    setShowAddUserModal(false)
    resetNewUserForm()
  }

  const resetNewUserForm = () => {
    setNewUserForm({
      first_name: '',
      last_name: '',
      email: '',
      role: 'ADMIN',
      password: '',
    })
  }

  const handleAddUserSubmit = async (e) => {
    e.preventDefault()
    if (!newUserForm.email.trim() || !newUserForm.password.trim()) {
      setFeedback({ type: 'error', message: 'Email and password are required.' })
      return
    }
    setAddUserLoading(true)
    try {
      const payload = {
        email: newUserForm.email.trim(),
        password: newUserForm.password,
        first_name: newUserForm.first_name.trim(),
        last_name: newUserForm.last_name.trim(),
        role: newUserForm.role,
      }
      await API.post('/api/users/', payload)
      setFeedback({ type: 'success', message: 'User account created.' })
      resetNewUserForm()
      setShowAddUserModal(false)
      await fetchAdminData()
    } catch (error) {
      const detail =
        error.response?.data?.email?.[0] ||
        error.response?.data?.password?.[0] ||
        error.response?.data?.detail ||
        'Unable to create user.'
      setFeedback({ type: 'error', message: detail })
    } finally {
      setAddUserLoading(false)
    }
  }

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileSaving(true)
    try {
      await API.patch('/auth/users/me/', {
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        email: profileForm.email.trim(),
      })
      await refreshUser()
      setFeedback({ type: 'success', message: 'Profile updated.' })
    } catch (error) {
      const detail =
        error.response?.data?.email?.[0] ||
        error.response?.data?.detail ||
        'Unable to update profile.'
      setFeedback({ type: 'error', message: detail })
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (!passwordForm.current_password || !passwordForm.new_password) {
      setFeedback({ type: 'error', message: 'Current and new password are required.' })
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setFeedback({ type: 'error', message: 'New passwords do not match.' })
      return
    }
    setPasswordSaving(true)
    try {
      await API.post('/auth/users/set_password/', {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })
      setFeedback({ type: 'success', message: 'Password updated successfully.' })
    } catch (error) {
      const detail = error.response?.data?.current_password?.[0] || error.response?.data?.new_password?.[0] || error.response?.data?.detail || 'Unable to change password.'
      setFeedback({ type: 'error', message: detail })
    } finally {
      setPasswordSaving(false)
    }
  }

  const handlePlatformSettingChange = async (setting, value) => {
    try {
      await API.patch('/api/platform-settings/update_settings/', { [setting]: value })
      if (setting === 'enforce_2fa_for_admins_recruiters') {
        setEnforce2FA(value)
        if (value && !user?.two_factor_enabled) {
          setFeedback({
            type: 'info',
            message: '2FA enforcement enabled. Complete setup in the Security Center to avoid being locked out.',
          })
          navigate('/settings/security', { state: { fromPlatformSettings: true } })
          return
        }
      } else if (setting === 'auto_approve_verified_recruiters') {
        setAutoApproveVerified(value)
      }
      setFeedback({ type: 'success', message: 'Platform settings updated successfully.' })
    } catch (error) {
      setFeedback({ type: 'error', message: 'Failed to update platform settings.' })
    }
  }

  const updateQuestionOption = (index, value) => {
    setQuestionForm((prev) => {
      const options = [...prev.options]
      options[index] = value
      return { ...prev, options }
    })
  }

  const handleQuestionSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSkillForQuestions) {
      setFeedback({ type: 'error', message: 'Select a skill first.' })
      return
    }
    const trimmedText = questionForm.text.trim()
    if (!trimmedText) {
      setFeedback({ type: 'error', message: 'Question text cannot be empty.' })
      return
    }
    const normalizedOptions = questionForm.options.map((opt) => opt.trim())
    if (normalizedOptions.some((opt) => !opt)) {
      setFeedback({ type: 'error', message: 'All answer options are required.' })
      return
    }
    const payload = {
      text: trimmedText,
      options: normalizedOptions,
      correct_option: questionForm.correct_option,
      skill: selectedSkillForQuestions,
    }
    const actionKey = editingQuestionId ? `update-${editingQuestionId}` : 'create-question'
    setQuestionActionLoading(actionKey)
    try {
      if (editingQuestionId) {
        await API.patch(`/api/questions/${editingQuestionId}/`, payload)
        setFeedback({ type: 'success', message: 'Question updated.' })
      } else {
        await API.post('/api/questions/', payload)
        setFeedback({ type: 'success', message: 'Question added.' })
      }
      resetQuestionForm()
      await loadSkillQuestions(selectedSkillForQuestions)
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to save question.' })
    } finally {
      setQuestionActionLoading(null)
    }
  }

  const handleQuestionEdit = (question) => {
    const buffer = Array.isArray(question.options) ? [...question.options] : []
    while (buffer.length < 4) buffer.push('')
    setQuestionForm({
      text: question.text,
      options: buffer.slice(0, 4),
      correct_option: question.correct_option ?? 0,
    })
    setEditingQuestionId(question.id)
  }

  const handleQuestionDelete = async (questionId) => {
    setQuestionActionLoading(`delete-${questionId}`)
    try {
      await API.delete(`/api/questions/${questionId}/`)
      setFeedback({ type: 'success', message: 'Question removed.' })
      await loadSkillQuestions(selectedSkillForQuestions)
      if (editingQuestionId === questionId) {
        resetQuestionForm()
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Unable to delete question.' })
    } finally {
      setQuestionActionLoading(null)
    }
  }

  const cancelPendingAction = () => {
    if (userActionLoading) return
    setPendingAction(null)
  }

  const fetchAdminData = useCallback(
    async (options = {}) => {
      const { signal } = options
      if (!user || user.role !== 'ADMIN') {
        setLoading(false)
        return
      }
      setLoading(true)
      setFetchError(null)
    try {
      const responses = await Promise.allSettled([
        API.get('/api/users/'),
        API.get('/api/applicants/'),
        API.get('/api/recruiters/'),
        API.get('/api/internships/'),
        API.get('/api/applications/'),
        API.get('/api/assessments/attempts/?limit=120'),
        API.get('/api/skills/'),
        API.get('/api/platform-settings/settings/'),
      ])
      if (signal?.aborted) return

      const [
        usersRes,
        applicantsRes,
        recruitersRes,
        internshipsRes,
        applicationsRes,
        attemptsRes,
        skillsRes,
        platformSettingsRes,
      ] = responses

      const getData = (result) => (result.status === 'fulfilled' ? result.value.data : null)

      const usersData = getData(usersRes)
      const applicantsData = getData(applicantsRes)
      const recruitersData = getData(recruitersRes)
      const internshipsData = getData(internshipsRes)
      const applicationsData = getData(applicationsRes)
      const skillsData = getData(skillsRes)
      const attemptsData = getData(attemptsRes)
      const platformSettingsData = getData(platformSettingsRes)

      setUsers(usersData ?? [])
      setStudentProfiles(applicantsData ?? [])
      setRecruiterProfiles(recruitersData ?? [])
      setInternshipList(internshipsData ?? [])
      setApplications(applicationsData ?? [])
      setSkills(skillsData ?? [])
      setAssessmentAttempts(attemptsData ?? [])

      if (platformSettingsData) {
        setEnforce2FA(platformSettingsData.enforce_2fa_for_admins_recruiters ?? true)
        setAutoApproveVerified(platformSettingsData.auto_approve_verified_recruiters ?? false)
      }

      const hadFailures = responses.some((result) => result.status === 'rejected')
      setFetchError(hadFailures ? 'Unable to sync some admin data. Please try again.' : null)
      if (!hadFailures) {
        setLastSynced(new Date())
      }
    } catch (error) {
      if (signal?.aborted) return
      setFetchError('Unable to sync admin data. Please try again.')
      setUsers([])
      setStudentProfiles([])
      setRecruiterProfiles([])
      setInternshipList([])
      setApplications([])
      setSkills([])
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  },
    [user],
  )

  useEffect(() => {
    const controller = new AbortController()
    fetchAdminData({ signal: controller.signal })
    return () => controller.abort()
  }, [fetchAdminData])

  useEffect(() => {
    if (skills.length > 0) {
      setSelectedSkillForQuestions((prev) => prev ?? skills[0].id)
    } else {
      setSelectedSkillForQuestions(null)
      setQuestions([])
    }
  }, [skills])

  useEffect(() => {
    if (selectedSkillForQuestions) {
      loadSkillQuestions(selectedSkillForQuestions)
    } else {
      setQuestions([])
    }
  }, [selectedSkillForQuestions, loadSkillQuestions])

  const renderMetricGrid = () => (
    <section className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <div key={metric.title} className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-[0_25px_80px_rgba(5,8,25,0.55)] transition hover:border-white/20 hover:shadow-[0_35px_120px_rgba(88,80,255,0.35)]">
          <div className="flex items-center justify-between">
            <span className={`rounded-2xl bg-gradient-to-br ${metric.glow} p-3`}>
              <metric.icon size={20} />
            </span>
            <span className="text-xs text-emerald-300">{metric.change}</span>
          </div>
          <p className="mt-6 text-sm uppercase tracking-[0.4em] text-white/40">{metric.title}</p>
          <p className="mt-2 text-3xl font-semibold">{metric.value}</p>
        </div>
      ))}
    </section>
  )

  const renderGrowthPanels = () => (
    <section className="mt-10 grid gap-6 md:grid-cols-2">
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(7,10,30,0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">User Growth</p>
            <h3 className="text-xl font-semibold">MAU trajectory</h3>
          </div>
          <TrendingUp className="text-indigo-300" />
        </div>
        <div className="mt-6 flex h-40 items-end gap-2">
          {chartData.growth.map((value, index) => (
            <div key={`growth-${index}`} className="flex-1 rounded-t-full bg-gradient-to-t from-indigo-500/40 to-cyan-400/80" style={{ height: `${value}%` }} />
          ))}
        </div>
      </div>
      <div className="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_100px_rgba(7,10,30,0.5)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Internships</p>
            <h3 className="text-xl font-semibold">Posting Trend</h3>
          </div>
          <Briefcase className="text-indigo-300" />
        </div>
        <div className="mt-6 grid grid-cols-7 gap-2 text-center text-xs text-white/60">
          {chartData.internships.map((value, index) => (
            <div key={`internship-${index}`} className="flex flex-col items-center gap-2">
              <span className="flex h-24 w-full items-end justify-center rounded-full bg-gradient-to-b from-fuchsia-500/60 to-indigo-600/20">
                <span className="mb-2 text-xs">{value}</span>
              </span>
              <span>W{index + 1}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )

  const renderUserManagement = () => {
    const rows = filteredUserRows
    return (
      <div className="rounded-[36px] border border-white/10 bg-gradient-to-br from-[#0b122c] via-[#070d1c] to-[#050711] p-6 shadow-[0_35px_90px_rgba(4,6,18,0.75)]">
        <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
            Search Directory
            <span className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-white/70 shadow-[0_10px_35px_rgba(6,8,20,0.55)]">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Search by name, email, or ID"
                className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
              />
            </span>
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
            Role
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-3xl border border-white/10 bg-[#0f152f]/80 px-4 py-2 text-sm text-white shadow-[0_10px_35px_rgba(6,8,20,0.4)] focus:border-indigo-400 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="STUDENT">Students</option>
              <option value="RECRUITER">Recruiters</option>
              <option value="ADMIN">Admins</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
            Status
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-3xl border border-white/10 bg-[#0f152f]/80 px-4 py-2 text-sm text-white shadow-[0_10px_35px_rgba(6,8,20,0.4)] focus:border-indigo-400 focus:outline-none"
            >
              <option value="ALL">All</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING">Pending</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </label>
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-white/60">
          <p>
            Showing <span className="text-white font-semibold">{rows.length}</span> of <span className="text-white font-semibold">{userRows.length}</span> accounts
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => fetchAdminData()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-indigo-200 transition hover:border-white/40 hover:text-white"
            >
              Sync Now
            </button>
            <button
              onClick={() => exportSectionToCSV('users')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.35em] text-indigo-200 transition hover:border-white/40 hover:text-white"
            >
              Export CSV
            </button>
            <button
              onClick={() => setShowAddUserModal(true)}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white shadow-[0_10px_35px_rgba(79,70,229,0.5)] transition hover:brightness-110"
            >
              + Add User
            </button>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/60">No users match the current filters.</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-white/50">
                <tr>
                  <th className="px-4 py-3 text-left">User ID</th>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSuspended = row.status === 'Suspended'
                  const needsVerification = row.status === 'Pending Verification' && row.profileType === 'recruiter'
                  const suspendKey = `${row.raw.is_active ? 'suspend' : 'activate'}-${row.raw.id}`
                  const deleteKey = `delete-${row.raw.id}`
                  const promoteKey = `promote-${row.raw.id}`
                  const verifyKey = `verify-${row.raw.id}`
                  const isSelf = user && row.raw.id === user.id
                  return (
                    <tr key={row.id} className="border-b border-white/5">
                      <td className="px-4 py-3 text-white/70">{row.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold">{row.name}</div>
                        <div className="text-xs text-white/50">{row.email}</div>
                      </td>
                      <td className="px-4 py-3 text-white/70">{row.role}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs ${getStatusStyle(row.status)}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-white/60">{row.raw.date_joined ? new Date(row.raw.date_joined).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-xs text-indigo-200">
                        <button className="mr-3 hover:text-white" onClick={() => handleUserAction('view', row)}>
                          View
                        </button>
                        <button
                          className={`mr-3 ${isSuspended ? 'hover:text-emerald-300' : 'hover:text-amber-200'}`}
                          onClick={() => handleUserAction(isSuspended ? 'activate' : 'suspend', row)}
                          disabled={userActionLoading === suspendKey || isSelf}
                        >
                          {isSelf ? 'Locked' : userActionLoading === suspendKey ? 'Working…' : isSuspended ? 'Activate' : 'Suspend'}
                        </button>
                        {row.role !== 'Admin' && (
                          <button
                            className="mr-3 hover:text-indigo-200"
                            onClick={() => handleUserAction('promote', row)}
                            disabled={userActionLoading === promoteKey}
                          >
                            {userActionLoading === promoteKey ? 'Updating…' : 'Make Admin'}
                          </button>
                        )}
                        {needsVerification && (
                          <button
                            className="mr-3 hover:text-emerald-300"
                            onClick={() => handleUserAction('verify', row)}
                            disabled={userActionLoading === verifyKey}
                          >
                            {userActionLoading === verifyKey ? 'Verifying…' : 'Verify'}
                          </button>
                        )}
                        <button
                          className="hover:text-rose-300"
                          onClick={() => !isSelf && setPendingAction({ action: 'delete', row })}
                          disabled={userActionLoading === deleteKey || isSelf}
                        >
                          {isSelf ? 'Locked' : userActionLoading === deleteKey ? 'Removing…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  const renderStudentIntel = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Student Intelligence</h3>
        <div className="flex items-center gap-3 text-xs text-indigo-200">
          <span>{verifiedStudents.length} verified</span>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
            onClick={() => exportSectionToCSV('students')}
          >
            Export CSV
          </button>
        </div>
      </div>
      {studentTableRows.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/60">No applicant profiles available yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.3em] text-white/40">
            <tr>
              <th className="pb-3 text-left">Name</th>
              <th className="pb-3 text-left">University</th>
              <th className="pb-3 text-left">Skills</th>
              <th className="pb-3 text-left">VSPS</th>
              <th className="pb-3 text-left">Accuracy</th>
            </tr>
          </thead>
          <tbody>
            {studentTableRows.map((student) => {
              const skillList = Array.isArray(student.skills)
                ? student.skills
                    .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
                    .filter(Boolean)
                    .join(', ')
                : ''
              const vsps = Math.round((student.vsps_score ?? 0) * 100)
              const accuracy = Math.round((student.assessment_accuracy ?? 0) * 100)
              return (
                <tr key={student.id} className="border-b border-white/5">
                  <td className="py-3">{student.first_name || student.last_name ? `${student.first_name || ''} ${student.last_name || ''}` : student.email}</td>
                  <td className="py-3 text-white/60">{student.college || '—'}</td>
                  <td className="py-3 text-white/60">{skillList || 'No skills'}</td>
                  <td className="py-3 font-semibold text-indigo-200">{vsps}%</td>
                  <td className="py-3 text-white/60">{accuracy}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )

  const renderRecruiterPipeline = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Recruiter Pipeline</h3>
        <div className="flex items-center gap-3 text-xs text-indigo-200">
          <span>{activeRecruiters} verified</span>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
            onClick={() => exportSectionToCSV('recruiters')}
          >
            Export CSV
          </button>
        </div>
      </div>
      {recruiterDisplay.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/60">No recruiters found.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.3em] text-white/40">
            <tr>
              <th className="pb-3 text-left">Company</th>
              <th className="pb-3 text-left">Contact</th>
              <th className="pb-3 text-left">Internships</th>
              <th className="pb-3 text-left">Verification</th>
            </tr>
          </thead>
          <tbody>
            {recruiterDisplay.map((rec) => (
              <tr key={rec.id} className="border-b border-white/5">
                <td className="py-3">{rec.company}</td>
                <td className="py-3 text-white/60">{rec.recruiter}</td>
                <td className="py-3 text-white/60">{rec.internships}</td>
                <td className="py-3">
                  <span className={`rounded-full px-2 py-1 text-xs ${rec.verified ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{rec.verified ? 'Verified' : 'Pending'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  const renderInternshipTable = () => (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold">Internships</h3>
          <span className="text-xs text-indigo-200">{internshipList.length} listings</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => exportSectionToCSV('internships')}
            className="rounded-full border border-white/10 px-3 py-2 text-[11px] uppercase tracking-[0.35em] text-indigo-100 hover:border-white/30"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={openCreateListing}
            className="rounded-full border border-indigo-400/40 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-indigo-100 shadow-[0_15px_45px_rgba(88,80,255,0.35)] hover:brightness-110"
          >
            New Listing
          </button>
        </div>
      </div>
      {internshipList.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/60">No internships posted.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-white/50">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left">Skills</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {internshipList.map((role) => {
                const status = role.recruiter_rating && role.recruiter_rating >= 0.7 ? 'Approved' : 'Pending'
                const skillList = Array.isArray(role.required_skills) ? role.required_skills.join(', ') : ''
                const recruiterContact = role.recruiter_name && role.recruiter_name.trim().length > 0 ? role.recruiter_name : role.recruiter_email
                return (
                  <tr key={role.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{role.title}</div>
                      <div className="text-xs text-white/50">{role.location || 'Remote'}</div>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      <div>{role.company_name ? `${role.company_name} • Partner` : '—'}</div>
                      {recruiterContact && <div className="text-[11px] uppercase tracking-[0.25em] text-white/40">{recruiterContact}</div>}
                    </td>
                    <td className="px-4 py-3 text-white/60">{skillList || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${status === 'Approved' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-indigo-200">
                      <button className="mr-2 hover:text-white" onClick={() => setSelectedListing(role)}>
                        View
                      </button>
                      <button className="mr-2 hover:text-white" onClick={() => openListingEditor(role)}>
                        Edit
                      </button>
                      <button className="mr-2 hover:text-rose-300" onClick={() => setPendingListingDelete(role)} disabled={internshipActionLoading === `delete-${role.id}`}>
                        {internshipActionLoading === `delete-${role.id}` ? 'Removing…' : 'Delete'}
                      </button>
                      <button
                        className="hover:text-emerald-300"
                        onClick={() => handleListingToggle(role)}
                        disabled={internshipActionLoading === `toggle-${role.id}`}
                      >
                        {internshipActionLoading === `toggle-${role.id}` ? 'Updating…' : status === 'Approved' ? 'Pause' : 'Approve'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderApplicationsPanel = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Applications</h3>
        <div className="flex items-center gap-3 text-xs text-indigo-200">
          <span>{pendingApplications} pending</span>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
            onClick={() => exportSectionToCSV('applications')}
          >
            Export CSV
          </button>
        </div>
      </div>
      {applicationsDisplay.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/60">No applications submitted.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs uppercase tracking-[0.3em] text-white/40">
            <tr>
              <th className="pb-3 text-left">Student</th>
              <th className="pb-3 text-left">Internship</th>
              <th className="pb-3 text-left">Company</th>
              <th className="pb-3 text-left">Status</th>
              <th className="pb-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {applicationsDisplay.map((app) => (
              <tr key={app.id} className="border-b border-white/5">
                <td className="py-3">{app.student}</td>
                <td className="py-3 text-white/60">{app.internship}</td>
                <td className="py-3 text-white/60">{app.company}</td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2 py-1 text-xs ${
                      app.status === 'ACCEPTED' ? 'bg-emerald-500/20 text-emerald-300' : app.status === 'REJECTED' ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </td>
                <td className="py-3 text-xs text-indigo-200">
                  <button className="mr-2 hover:text-emerald-300">Accept</button>
                  <button className="mr-2 hover:text-rose-300">Reject</button>
                  <button className="hover:text-white">Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )

  const renderSkillsPanel = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Skills</h3>
        <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200">
          <span>{skills.length} tracked</span>
          <form onSubmit={handleSkillAdd} className="flex items-center gap-2 text-[11px]">
            <input
              type="text"
              value={addSkillForm.name}
              onChange={(e) => setAddSkillForm({ name: e.target.value })}
              placeholder="+ New skill"
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={skillActionLoading === 'create-skill'}
              className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 transition hover:border-white/30 disabled:opacity-40"
            >
              {skillActionLoading === 'create-skill' ? 'Adding…' : 'Add'}
            </button>
          </form>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
            onClick={() => exportSectionToCSV('skills')}
          >
            Export CSV
          </button>
        </div>
      </div>
      {skills.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/60">No skills have been added to the catalog.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {skills.map((skill, idx) => {
            const label = formatSkillLabel(skill)
            const Icon = getSkillIcon(label)
            return (
              <span
                key={skill?.id || `${label}-${idx}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#101737] px-4 py-2 text-xs text-white/70 shadow-[0_10px_30px_rgba(10,11,35,0.55)]"
              >
                <Icon size={14} className="text-indigo-200" />
                {label}
                {skill?.id && (
                  <button
                    type="button"
                    onClick={() => handleSkillDelete(skill.id)}
                    disabled={skillActionLoading === skill.id}
                    className="ml-2 rounded-full border border-white/10 p-1 text-white/60 hover:text-rose-300"
                  >
                    {skillActionLoading === skill.id ? (
                      <span className="text-[9px] uppercase tracking-[0.3em]">Wait</span>
                    ) : (
                      <Trash2 size={12} />
                    )}
                  </button>
                )}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )

  const renderAssessmentAudit = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Assessment activity</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Proctoring & Scores</h3>
          <p className="text-sm text-white/60">Trace every attempt, score, and violation report.</p>
        </div>
        <button
          type="button"
          onClick={() => exportSectionToCSV('assessments')}
          className="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
        >
          Export CSV
        </button>
      </div>
      {assessmentAttempts.length === 0 ? (
        <p className="py-6 text-center text-sm text-white/60">No assessments recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.3em] text-white/40">
              <tr>
                <th className="px-4 py-3 text-left">Candidate</th>
                <th className="px-4 py-3 text-left">Score</th>
                <th className="px-4 py-3 text-left">Violations</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Attempted</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {assessmentAttempts.map((attempt) => {
                const violationBadgeClass =
                  attempt.violation_count && attempt.violation_count > 0
                    ? 'bg-rose-500/20 text-rose-200'
                    : 'bg-emerald-500/20 text-emerald-200'
                const statusBadgeClass =
                  attempt.status === 'COMPLETED'
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : attempt.status === 'FAILED'
                      ? 'bg-rose-500/15 text-rose-200'
                      : 'bg-amber-500/20 text-amber-200'
                const attemptMoment = attempt.end_time || attempt.start_time
                const attemptSkills = Array.isArray(attempt.skills) ? attempt.skills.join(', ') : '—'
                return (
                  <tr key={`attempt-${attempt.id}`} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{attempt.user_name}</div>
                      <div className="text-xs text-white/50">{attempt.user_email}</div>
                      <div className="mt-1 text-xs text-white/60">{attemptSkills}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      <div className="text-base font-semibold">{formatPercentDisplay(attempt.score_percent, 1)}</div>
                      <p className="text-xs text-white/50">VSPS {formatPercentDisplay(attempt.final_vsps, 100)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${violationBadgeClass}`}>
                        {attempt.violation_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass}`}>{attempt.status}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {attemptMoment ? new Date(attemptMoment).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setSelectedAttempt(attempt)}
                        className="rounded-full border border-white/10 px-3 py-1 text-xs text-indigo-100 hover:text-white"
                      >
                        View log
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const renderAssessmentBuilder = () => (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Assessment Builder</p>
          <h3 className="mt-2 text-xl font-semibold text-white">Question Bank by Skill</h3>
          <p className="text-sm text-white/60">Create and curate the prompts powering the adaptive assessment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {skills.length > 0 ? (
            <select
              value={selectedSkillForQuestions ?? ''}
              onChange={(e) => setSelectedSkillForQuestions(Number(e.target.value))}
              className="rounded-3xl border border-white/10 bg-[#0f152f]/80 px-4 py-2 text-sm text-white focus:border-indigo-400 focus:outline-none"
            >
              {skills.map((skill) => (
                <option key={skill.id} value={skill.id}>
                  {formatSkillLabel(skill)}
                </option>
              ))}
            </select>
          ) : (
            <span className="rounded-full border border-white/10 px-4 py-2 text-xs text-white/60">Add a skill to begin</span>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!selectedSkillForQuestions || importingQuestions}
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
          >
            {importingQuestions ? 'Importing…' : 'Import DOCX'}
          </button>
          <a
            href="/sample_questions.docx"
            download
            className="rounded-3xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Download template
          </a>
        </div>
      </div>
      <input
        type="file"
        accept=".docx"
        ref={fileInputRef}
        className="hidden"
        onChange={handleDocxFileSelected}
      />
      {importFeedback && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
            importFeedback.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
          }`}
        >
          {importFeedback.message}
        </div>
      )}
      {skills.length === 0 ? (
        <p className="text-sm text-white/60">Add at least one skill to start creating assessments.</p>
      ) : (
        <>
          <form onSubmit={handleQuestionSubmit} className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-4">
            <label className="block text-xs uppercase tracking-[0.3em] text-white/50">
              Question
              <textarea
                value={questionForm.text}
                onChange={(e) => setQuestionForm((prev) => ({ ...prev, text: e.target.value }))}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-[#101737] px-4 py-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                rows={3}
                placeholder="Enter the assessment prompt..."
              />
            </label>
            <div className="grid gap-3 md:grid-cols-2">
              {questionForm.options.map((option, idx) => (
                <label key={`option-${idx}`} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#0f152f] px-3 py-2 text-xs text-white/60">
                  <input
                    type="radio"
                    name="correct-option"
                    checked={questionForm.correct_option === idx}
                    onChange={() => setQuestionForm((prev) => ({ ...prev, correct_option: idx }))}
                    className="text-indigo-500"
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateQuestionOption(idx, e.target.value)}
                    placeholder={`Option ${idx + 1}`}
                    className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {editingQuestionId && (
                <button type="button" className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white" onClick={resetQuestionForm}>
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:opacity-50"
                disabled={Boolean(questionActionLoading)}
              >
                {editingQuestionId ? (questionActionLoading ? 'Updating…' : 'Update Question') : questionActionLoading ? 'Adding…' : 'Add Question'}
              </button>
            </div>
          </form>
          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
            <div className="mb-4 flex items-center justify-between text-sm text-white/60">
              <span>{questions.length} questions</span>
              <button
                type="button"
                onClick={() => selectedSkillForQuestions && loadSkillQuestions(selectedSkillForQuestions)}
                className="rounded-full border border-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-indigo-100 hover:border-white/30"
              >
                Refresh
              </button>
            </div>
            {questionLoading ? (
              <p className="py-6 text-center text-sm text-white/60">Loading questions…</p>
            ) : questions.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/60">No questions for this skill yet.</p>
            ) : (
              <div className="space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="rounded-2xl border border-white/10 bg-[#0d1228] p-4 shadow-[0_15px_40px_rgba(5,7,25,0.6)]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-white/50">{question.skill_name}</p>
                        <p className="text-base font-semibold text-white">{question.text}</p>
                        <p className="text-[11px] uppercase tracking-[0.3em] text-white/40 mt-1">Created {formatDisplayDate(question.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <button
                          className="rounded-full border border-white/10 px-3 py-1 text-white/70 hover:text-white"
                          onClick={() => handleQuestionEdit(question)}
                          disabled={questionActionLoading?.startsWith('update-')}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full border border-white/10 px-3 py-1 text-rose-200 hover:text-rose-100"
                          onClick={() => handleQuestionDelete(question.id)}
                          disabled={questionActionLoading === `delete-${question.id}`}
                        >
                          {questionActionLoading === `delete-${question.id}` ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-2 text-sm">
                      {question.options.map((option, idx) => (
                        <li
                          key={`${question.id}-opt-${idx}`}
                          className={`rounded-xl border px-3 py-2 ${
                            question.correct_option === idx
                              ? 'border-emerald-400/50 bg-emerald-500/10 text-emerald-100'
                              : 'border-white/10 bg-white/5 text-white/70'
                          }`}
                        >
                          <span className="mr-2 text-xs text-white/40">{String.fromCharCode(65 + idx)}.</span>
                          {option}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  const renderReportsPanel = () => (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Reports & Analytics</h3>
        <button className="text-xs text-indigo-200 hover:text-white">Export CSV</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {metrics.slice(0, 4).map((metric) => (
          <div key={`report-${metric.title}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">{metric.title}</p>
            <p className="mt-2 text-2xl font-semibold">{metric.value}</p>
            <p className="text-xs text-emerald-200">{metric.change}</p>
          </div>
        ))}
      </div>
    </div>
  )

  const renderPlatformSettings = () => (
    <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-semibold">Platform Settings</h3>
        <span className="text-xs text-indigo-200">Security layer</span>
      </div>
      <div className="space-y-4 text-sm">
        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="font-semibold">Enforce two-factor authentication</p>
            <p className="text-xs text-white/60">Applies to all admins and recruiters</p>
          </div>
          <button
            type="button"
            onClick={() => handlePlatformSettingChange('enforce_2fa_for_admins_recruiters', !enforce2FA)}
            className={`relative h-6 w-12 rounded-full transition ${enforce2FA ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${enforce2FA ? 'right-1' : 'left-1'}`} />
          </button>
        </label>
        <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <div>
            <p className="font-semibold">Auto-approve verified recruiters</p>
            <p className="text-xs text-white/60">Fast-track partners with trust score</p>
          </div>
          <button
            type="button"
            onClick={() => handlePlatformSettingChange('auto_approve_verified_recruiters', !autoApproveVerified)}
            className={`relative h-6 w-12 rounded-full transition ${autoApproveVerified ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-white/20'}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${autoApproveVerified ? 'right-1' : 'left-1'}`} />
          </button>
        </label>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">
          Active recruiters: {activeRecruiters} • Pending applications: {pendingApplications}
        </div>
      </div>
    </div>
  )

  const renderAdminProfile = () => (
    <div className="grid gap-6 lg:grid-cols-2">
      <form className="rounded-[32px] border border-white/10 bg-white/5 p-6" onSubmit={handleProfileUpdate}>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Profile</p>
          <h3 className="text-2xl font-semibold text-white">Account Details</h3>
          <p className="text-sm text-white/60">Update your name or contact email.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            First Name
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              value={profileForm.first_name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, first_name: e.target.value }))}
            />
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Last Name
            <input
              type="text"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              value={profileForm.last_name}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, last_name: e.target.value }))}
            />
          </label>
        </div>
        <label className="mt-4 block text-xs uppercase tracking-[0.3em] text-white/50">
          Email
          <input
            type="email"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={profileForm.email}
            onChange={(e) => setProfileForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setProfileForm({ first_name: user?.first_name || '', last_name: user?.last_name || '', email: user?.email || '' })}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={profileSaving}
            className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(88,80,241,0.45)] disabled:opacity-60"
          >
            {profileSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </form>
      <form className="rounded-[32px] border border-white/10 bg-white/5 p-6" onSubmit={handlePasswordChange}>
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.4em] text-white/50">Security</p>
          <h3 className="text-2xl font-semibold text-white">Change Password</h3>
          <p className="text-sm text-white/60">Use a strong password with at least 8 characters.</p>
        </div>
        <label className="text-xs uppercase tracking-[0.3em] text-white/50">
          Current Password
          <input
            type="password"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={passwordForm.current_password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
          />
        </label>
        <label className="mt-4 text-xs uppercase tracking-[0.3em] text-white/50">
          New Password
          <input
            type="password"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={passwordForm.new_password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
          />
        </label>
        <label className="mt-4 text-xs uppercase tracking-[0.3em] text-white/50">
          Confirm Password
          <input
            type="password"
            required
            className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            value={passwordForm.confirm_password}
            onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setPasswordForm({ current_password: '', new_password: '', confirm_password: '' })}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Clear
          </button>
          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(16,185,129,0.35)] disabled:opacity-60"
          >
            {passwordSaving ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  )

  const renderAttemptModal = () => {
    if (!selectedAttempt) return null
    const violations = Array.isArray(selectedAttempt.violation_log) ? selectedAttempt.violation_log : []
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
        <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0f172f] to-[#090d1d] p-8 text-white shadow-[0_40px_120px_rgba(5,6,20,0.85)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-white/40">Assessment attempt</p>
              <h3 className="mt-2 text-2xl font-semibold">{selectedAttempt.user_name}</h3>
              <p className="text-sm text-white/60">{selectedAttempt.user_email}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAttempt(null)}
              className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white"
            >
              Close
            </button>
          </div>
          <div className="mt-6 grid gap-4 text-sm text-white/70 md:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Score</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatPercentDisplay(selectedAttempt.score_percent, 1)}</p>
              <p className="text-xs text-white/50">VSPS {formatPercentDisplay(selectedAttempt.final_vsps, 100)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Violations</p>
              <p className="mt-2 text-xl font-semibold text-white">{selectedAttempt.violation_count || 0}</p>
              <p className="text-xs text-white/50">{selectedAttempt.status}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Skills</p>
              <p className="mt-2 text-white">{Array.isArray(selectedAttempt.skills) ? selectedAttempt.skills.join(', ') : '—'}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Time</p>
              <p className="mt-2 text-white/80">Started: {selectedAttempt.start_time ? new Date(selectedAttempt.start_time).toLocaleString() : '—'}</p>
              <p className="text-white/80">Ended: {selectedAttempt.end_time ? new Date(selectedAttempt.end_time).toLocaleString() : '—'}</p>
            </div>
          </div>
          <div className="mt-6">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Violation log</p>
            {violations.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
                No violations were recorded for this attempt.
              </p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-3 overflow-auto pr-2">
                {violations.map((event, idx) => (
                  <li key={`violation-${selectedAttempt.id}-${idx}`} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <p className="text-sm font-semibold text-white">{event?.type || 'Event'}</p>
                    <p className="text-xs text-white/60">{event?.timestamp ? new Date(event.timestamp).toLocaleString() : '—'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    )
  }

  const renderSectionContent = () => {
    switch (activeSection) {
      case 'Dashboard':
        return (
          <>
            {renderMetricGrid()}
            {renderGrowthPanels()}
            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              {renderUserManagement()}
              <div className="space-y-6">
                {renderStudentIntel()}
                {renderRecruiterPipeline()}
              </div>
            </section>
            <section className="mt-10 grid gap-6 xl:grid-cols-2">
              {renderInternshipTable()}
              <div className="space-y-6">
                {renderApplicationsPanel()}
                {renderSkillsPanel()}
              </div>
            </section>
            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              {renderReportsPanel()}
              {renderPlatformSettings()}
            </section>
          </>
        )
      case 'Users':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10">{renderUserManagement()}</section>
          </>
        )
      case 'Students':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 space-y-6">{renderStudentIntel()}</section>
          </>
        )
      case 'Recruiters':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 space-y-6">{renderRecruiterPipeline()}</section>
          </>
        )
      case 'Internships':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10">{renderInternshipTable()}</section>
          </>
        )
      case 'Applications':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 space-y-6">{renderApplicationsPanel()}</section>
          </>
        )
      case 'Assessments':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 grid gap-6 lg:grid-cols-2">
              {renderAssessmentAudit()}
              {renderAssessmentBuilder()}
            </section>
          </>
        )
      case 'Skills':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10">{renderSkillsPanel()}</section>
          </>
        )
      case 'Reports':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 grid gap-6 lg:grid-cols-2">{renderReportsPanel()}</section>
            <section className="mt-10 space-y-6">{renderStudentIntel()}</section>
          </>
        )
      case 'Platform Settings':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10 grid gap-6 lg:grid-cols-2">{renderPlatformSettings()}</section>
          </>
        )
      case 'Profile':
        return (
          <>
            {renderMetricGrid()}
            <section className="mt-10">{renderAdminProfile()}</section>
          </>
        )
      default:
        return null
    }
  }

  const renderAddUserModal = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-gradient-to-br from-[#0a1026] via-[#070b1a] to-[#05060f] p-6 text-white shadow-[0_40px_120px_rgba(2,4,14,0.9)]">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Create User Account</h3>
          <button type="button" onClick={closeAddUserModal} className="text-white/70 hover:text-white">
            Close
          </button>
        </div>
        <form className="space-y-4" onSubmit={handleAddUserSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
              First Name
              <input
                type="text"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={newUserForm.first_name}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, first_name: e.target.value }))}
              />
            </label>
            <label className="text-xs uppercase tracking-[0.3em] text-white/50">
              Last Name
              <input
                type="text"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                value={newUserForm.last_name}
                onChange={(e) => setNewUserForm((prev) => ({ ...prev, last_name: e.target.value }))}
              />
            </label>
          </div>
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Email Address
            <input
              type="email"
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              value={newUserForm.email}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, email: e.target.value }))}
            />
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Temporary Password
            <input
              type="password"
              required
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              value={newUserForm.password}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
            />
          </label>
          <label className="text-xs uppercase tracking-[0.3em] text-white/50">
            Role
            <select
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              value={newUserForm.role}
              onChange={(e) => setNewUserForm((prev) => ({ ...prev, role: e.target.value }))}
            >
              <option value="ADMIN">Admin</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="APPLICANT">Student</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={closeAddUserModal}
              className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:border-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={addUserLoading}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(88,80,241,0.5)] disabled:opacity-60"
            >
              {addUserLoading ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-[#050713] text-white">
        <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
        <div className="absolute inset-0 animate-pulse bg-[radial-gradient(circle_at_top,_rgba(88,80,255,0.25),transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,rgba(32,211,238,0.12),transparent_45%)]" />
        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-12">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#0b1024]/70 p-10 shadow-[0_35px_120px_rgba(4,6,20,0.75)] backdrop-blur">
            <div className="space-y-3 text-center">
              <Shield className="mx-auto h-10 w-10 text-indigo-300" />
              <p className="text-xs uppercase tracking-[0.5em] text-white/40">InternConnect</p>
              <h1 className="text-3xl font-semibold">Admin Control Center</h1>
              <p className="text-sm text-white/60">Secure access for platform operators. Two-factor ready.</p>
            </div>
            <form className="mt-8 space-y-5" onSubmit={handleAdminLogin}>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">Admin Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#12172f] px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="admin@internconnect.ai"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#12172f] px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="••••••••••"
                  required
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-[0.3em] text-white/60">2FA Code (optional)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#12172f] px-4 py-3 text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="6-digit code"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-white shadow-[0_25px_60px_rgba(99,102,241,0.45)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Authenticating…' : 'Login'}
              </button>
              <button type="button" className="w-full text-sm text-indigo-200 hover:text-white">
                Forgot password?
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050713] text-white">
        <p className="text-sm uppercase tracking-[0.4em] text-white/60">Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#050713] text-white">
      <FeedbackToast feedback={feedback} onClose={() => setFeedback(null)} />
      {showAddUserModal && renderAddUserModal()}
      {selectedAttempt && renderAttemptModal()}
      {selectedUser && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0f172f] to-[#090d1d] p-8 shadow-[0_40px_120px_rgba(5,6,20,0.85)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Account Snapshot</p>
                <h3 className="mt-2 text-2xl font-semibold">{selectedUser.name}</h3>
                <p className="text-sm text-white/60">{selectedUser.email}</p>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white" onClick={() => setSelectedUser(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-3 text-sm text-white/70">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Role</span>
                <span className="font-semibold text-white">{selectedUser.role}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Status</span>
                <span className="font-semibold text-white">{selectedUser.status}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <span>Joined</span>
                <span>{selectedUser.raw.date_joined ? new Date(selectedUser.raw.date_joined).toLocaleString() : '—'}</span>
              </div>
              {selectedUser.profileType === 'student' && selectedUser.profile ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Student Signals</p>
                  <p className="mt-2 text-sm text-white/70">
                    VSPS Score: <span className="text-indigo-200">{Math.round((selectedUser.profile.vsps_score ?? 0) * 100)}%</span>
                  </p>
                  <p className="text-sm text-white/70">University: {selectedUser.profile.college || 'Not provided'}</p>
                  <p className="text-sm text-white/70">
                    Skills:{' '}
                    {Array.isArray(selectedUser.profile.skills) && selectedUser.profile.skills.length > 0
                      ? selectedUser.profile.skills
                          .map((skill) => (typeof skill === 'string' ? skill : skill?.name))
                          .filter(Boolean)
                          .join(', ')
                      : 'Not provided'}
                  </p>
                </div>
              ) : null}
              {selectedUser.profileType === 'recruiter' && selectedUser.profile ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recruiter Details</p>
                  <p className="mt-2 text-sm text-white/70">Company: {selectedUser.profile.company_name || '—'}</p>
                  <p className="text-sm text-white/70">Verification: {selectedUser.profile.is_verified ? 'Verified' : 'Pending'}</p>
                  <p className="text-sm text-white/70">Website: {selectedUser.profile.company_website || '—'}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      {selectedListing && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0d1428] to-[#070b14] p-8 shadow-[0_40px_120px_rgba(3,4,12,0.85)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[250px]">
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Internship Overview</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{selectedListing.title}</h3>
                <p className="text-sm text-white/70">{selectedListing.company_name || 'Partner'} • {selectedListing.location || 'Remote'} • {selectedListing.work_type || selectedListing.type}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.35em] text-white/40">
                  Posted {formatDisplayDate(selectedListing.created_at)} by {selectedListing.recruiter_name || selectedListing.recruiter_email || 'Recruiter'}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Compensation</p>
                <p className="mt-2">{selectedListing.stipend ? `₹${selectedListing.stipend.toLocaleString('en-IN')}` : 'Not disclosed'}</p>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white" onClick={() => setSelectedListing(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 space-y-4 text-sm text-white/80">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Recruiter</p>
                  <p className="mt-2 text-white/80">{selectedListing.recruiter_name || 'Recruiter'}</p>
                  <p className="text-xs text-white/50">{selectedListing.recruiter_email || 'Not provided'}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Work Type</p>
                  <p className="mt-2 text-white/80">{selectedListing.work_type || selectedListing.type || '—'}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Required Skills</p>
                <p className="mt-2">{Array.isArray(selectedListing.required_skills) ? selectedListing.required_skills.join(', ') : '—'}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Description</p>
                <p className="mt-2 text-white/70">{selectedListing.description || 'No description provided.'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {createListingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-gradient-to-br from-[#080f25] to-[#050713] p-8 shadow-[0_45px_140px_rgba(3,4,12,0.95)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Create Listing</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">Post a new opportunity</h3>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white" onClick={() => setCreateListingForm(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Role Title
                <input
                  type="text"
                  value={createListingForm.title}
                  onChange={(e) => setCreateListingForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Recruiter
                <select
                  value={createListingForm.recruiter_id}
                  onChange={(e) => setCreateListingForm((prev) => ({ ...prev, recruiter_id: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                >
                  {recruiterOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Location
                  <input
                    type="text"
                    value={createListingForm.location}
                    onChange={(e) => setCreateListingForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </label>
                <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Work Type
                  <select
                    value={createListingForm.work_type}
                    onChange={(e) => setCreateListingForm((prev) => ({ ...prev, work_type: e.target.value }))}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="On-site">On-site</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Remote">Remote</option>
                  </select>
                </label>
              </div>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Stipend (₹)
                <input
                  type="number"
                  value={createListingForm.stipend}
                  onChange={(e) => setCreateListingForm((prev) => ({ ...prev, stipend: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Required Skills (comma separated)
                <textarea
                  value={createListingForm.required_skills}
                  onChange={(e) => setCreateListingForm((prev) => ({ ...prev, required_skills: e.target.value }))}
                  className="mt-2 h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Description
                <textarea
                  value={createListingForm.description}
                  onChange={(e) => setCreateListingForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-2 h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white" onClick={() => setCreateListingForm(null)}>
                Cancel
              </button>
              <button
                className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] hover:brightness-110 disabled:opacity-60"
                onClick={handleCreateListing}
                disabled={internshipActionLoading === 'create-listing'}
              >
                {internshipActionLoading === 'create-listing' ? 'Posting…' : 'Post Listing'}
              </button>
            </div>
          </div>
        </div>
      )}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-gradient-to-br from-[#0b1127] to-[#050814] p-8 shadow-[0_45px_140px_rgba(3,4,12,0.9)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Edit Internship</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{editingListing.title}</h3>
              </div>
              <button className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:text-white" onClick={() => setEditingListing(null)}>
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Location
                <input
                  type="text"
                  value={editingListing.location}
                  onChange={(e) => setEditingListing((prev) => ({ ...prev, location: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Work Type
                <select
                  value={editingListing.work_type}
                  onChange={(e) => setEditingListing((prev) => ({ ...prev, work_type: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="On-site">On-site</option>
                  <option value="Hybrid">Hybrid</option>
                  <option value="Remote">Remote</option>
                </select>
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Stipend (₹)
                <input
                  type="number"
                  value={editingListing.stipend}
                  onChange={(e) => setEditingListing((prev) => ({ ...prev, stipend: e.target.value }))}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Skills (comma separated)
                <textarea
                  value={editingListing.required_skills}
                  onChange={(e) => setEditingListing((prev) => ({ ...prev, required_skills: e.target.value }))}
                  className="mt-2 h-24 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
              <label className="text-xs uppercase tracking-[0.3em] text-white/50">
                Description
                <textarea
                  value={editingListing.description}
                  onChange={(e) => setEditingListing((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-2 h-32 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </label>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-white/70 hover:text-white" onClick={() => setEditingListing(null)}>
                Cancel
              </button>
              <button
                className="rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.45)] hover:brightness-110 disabled:opacity-60"
                onClick={handleListingSave}
                disabled={internshipActionLoading === `edit-${editingListing.id}`}
              >
                {internshipActionLoading === `edit-${editingListing.id}` ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingListingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0a0f1f] p-8 shadow-[0_40px_120px_rgba(5,6,20,0.95)]">
            <p className="text-xs uppercase tracking-[0.4em] text-rose-200/60">Confirm Action</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Delete internship?</h3>
            <p className="mt-2 text-sm text-white/70">
              “{pendingListingDelete.title}” will be removed from the marketplace.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                className="rounded-2xl border border-white/15 px-5 py-2 text-sm text-white/80 hover:text-white"
                onClick={() => setPendingListingDelete(null)}
                disabled={Boolean(internshipActionLoading)}
              >
                Cancel
              </button>
              <button
                className="rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_45px_rgba(244,63,94,0.4)] hover:brightness-110 disabled:opacity-70"
                onClick={confirmListingDelete}
                disabled={Boolean(internshipActionLoading)}
              >
                {internshipActionLoading ? 'Removing…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {pendingAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 py-10">
          <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[#0a0f1f] p-8 shadow-[0_40px_120px_rgba(5,6,20,0.95)]">
            <p className="text-xs uppercase tracking-[0.4em] text-rose-200/60">Confirm Action</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">Delete this account?</h3>
            <p className="mt-2 text-sm text-white/70">
              You’re about to permanently remove <span className="text-white">{pendingAction.row.name}</span>. This can’t be undone.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelPendingAction}
                className="rounded-2xl border border-white/15 px-5 py-2 text-sm font-semibold text-white/80 transition hover:text-white"
                disabled={Boolean(userActionLoading)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPendingAction}
                className="rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-[0_15px_45px_rgba(244,63,94,0.4)] transition hover:brightness-110 disabled:opacity-70"
                disabled={Boolean(userActionLoading)}
              >
                {userActionLoading ? 'Removing…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-[#070b1a]/90 p-6 backdrop-blur lg:flex">
        <div className="mb-10 space-y-2">
          <p className="text-xs uppercase tracking-[0.5em] text-white/40">InternConnect</p>
          <h1 className="text-xl font-semibold">Admin Portal</h1>
        </div>
        <nav className="flex flex-1 flex-col gap-2 text-sm">
          {sidebarLinks.map((link) => {
            const isActive = activeSection === link.label
            return (
              <button
                key={link.label}
                type="button"
                aria-pressed={isActive}
                onClick={() => setActiveSection(link.label)}
                className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                  isActive ? 'border-white/20 bg-white/10 text-white shadow-[0_15px_45px_rgba(80,63,205,0.35)]' : 'border-transparent text-white/70 hover:border-white/10 hover:text-white'
                }`}
              >
                <link.icon size={18} />
                {link.label}
              </button>
            )
          })}
        </nav>
        <button onClick={() => logout()} className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:text-white">
          <LogOut size={18} />
          Sign Out
        </button>
      </aside>
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(88,80,255,0.12),transparent_60%)] px-6 py-8 lg:px-10">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Control Center</p>
            <p className="text-xs text-white/50">Admin Dashboard</p>
            <h2 className="text-3xl font-semibold">Welcome back, {user.first_name || 'Admin'}</h2>
            <p className="text-sm text-white/60">Review real-time intelligence across the InternConnect network.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-white/60">
            <span className="rounded-full border border-white/10 px-4 py-2">{lastSynced ? `Last sync • ${lastSynced.toLocaleTimeString()}` : 'Awaiting sync...'}</span>
            <span className="rounded-full border border-white/10 px-4 py-2">Verified recruiters • {activeRecruiters}</span>
            <span className="rounded-full border border-white/10 px-4 py-2">Pending applications • {pendingApplications}</span>
          </div>
        </header>
        <div className="mt-10 space-y-10">{renderSectionContent()}</div>
      </main>
    </div>
  )
}
