import { useEffect, useState } from 'react'
import API from '../services/api'
import { Upload } from 'lucide-react'

export default function StudentProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    mobile_number: '',
    github_link: '',
    linkedin_link: '',
    college: '',
    degree: '',
  })

  useEffect(() => {
    API.get('/api/applicants/me/')
      .then((res) => {
        const data = res.data
        setProfile(data)
        setFormData({
          email: data.email || '',
          mobile_number: data.mobile_number || '',
          github_link: data.github_link || '',
          linkedin_link: data.linkedin_link || '',
          college: data.college || '',
          degree: data.degree || '',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const res = await API.patch('/api/applicants/me/', formData)
      setProfile(res.data)
      setIsEditing(false)
      alert('Profile updated successfully!')
    } catch (error) {
      console.error(error)
      alert('Failed to update profile.')
    }
  }

  if (loading) return <div className="text-white">Loading...</div>

  return (
    <div className="space-y-6 text-white">
      <section className="rounded-3xl border border-white/10 bg-[#080d1f] p-8 shadow-[0_25px_80px_rgba(4,7,19,0.7)]">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Profile</p>
            <h1 className="mt-2 text-3xl font-semibold">Professional identity</h1>
            <p className="mt-2 text-sm text-white/60">
              Keep your academic and portfolio details up to date so recruiters get the most accurate view of your experience.
            </p>
          </div>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white"
            >
              Edit profile
            </button>
          )}
        </div>
      </section>

      <div className="rounded-3xl border border-white/10 bg-[#050916]/90 p-8 backdrop-blur">
        {isEditing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { label: 'Email address', name: 'email', type: 'email' },
                { label: 'Mobile number', name: 'mobile_number', type: 'text' },
                { label: 'College / University', name: 'college', type: 'text' },
                { label: 'Degree / Major', name: 'degree', type: 'text' },
                { label: 'GitHub profile', name: 'github_link', type: 'url' },
                { label: 'LinkedIn profile', name: 'linkedin_link', type: 'url' },
              ].map((field) => (
                <label key={field.name} className="text-xs uppercase tracking-[0.3em] text-white/40">
                  {field.label}
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name]}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-2xl border border-white/15 bg-[#070b1c] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </label>
              ))}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-full border border-white/20 px-6 py-2 text-sm font-semibold text-white/80"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-2 text-sm font-semibold text-white shadow-[0_15px_45px_rgba(99,102,241,0.35)]"
              >
                Save changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <ProfileCard title="Identity" data={[['Name', `${profile?.first_name || ''} ${profile?.last_name || ''}`], ['Email', profile?.email], ['Phone', profile?.mobile_number || 'Not provided']]} />
            <ProfileCard title="Education" data={[['University', profile?.college || 'Not set'], ['Degree', profile?.degree || 'Not set']]} />
            <ProfileCard title="Links" data={[['GitHub', profile?.github_link || 'Not linked'], ['LinkedIn', profile?.linkedin_link || 'Not linked']]} />
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Resume upload</p>
              <div className="mt-3 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/20 bg-[#080d1f] p-6 text-center text-sm text-white/60">
                <Upload className="mb-3 h-8 w-8 text-white/50" />
                <p>Drag & drop resume, or click to replace</p>
                <button className="mt-4 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white">Upload</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileCard({ title, data }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-white/80">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>
      <div className="mt-3 space-y-2 text-sm">
        {data.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 text-white">
            <span className="text-white/50">{label}</span>
            <span className="text-right text-white">{value || '—'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
