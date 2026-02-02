import { useEffect, useState, type FormEvent } from 'react'
import type { Internship } from '../ml/recommender'
import {
  defaultInternships,
  loadInternships,
  saveInternships,
} from '../data/internships'

type InternshipFormState = {
  id: string | null
  title: string
  company: string
  location: string
  description: string
  skillsRequired: string
  recruiterRating: string
  verificationRecencyDays: string
}

const emptyForm: InternshipFormState = {
  id: null,
  title: '',
  company: '',
  location: '',
  description: '',
  skillsRequired: '',
  recruiterRating: '',
  verificationRecencyDays: '',
}

export default function RecruiterDashboard() {
  const [internships, setInternships] = useState<Internship[]>(defaultInternships)
  const [form, setForm] = useState<InternshipFormState>(emptyForm)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = loadInternships()
    setInternships(stored)
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveInternships(internships)
  }, [internships, loaded])

  const startEdit = (internship: Internship) => {
    setForm({
      id: internship.id,
      title: internship.title,
      company: internship.company,
      location: internship.location,
      description: internship.description,
      skillsRequired: internship.skillsRequired.join(', '),
      recruiterRating:
        internship.recruiterRating != null
          ? String(internship.recruiterRating)
          : '',
      verificationRecencyDays:
        internship.verificationRecencyDays != null
          ? String(internship.verificationRecencyDays)
          : '',
    })
  }

  const resetForm = () => setForm(emptyForm)

  const handleChange = (field: keyof InternshipFormState, value: string) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const skillsArray = form.skillsRequired
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)

    const rating = form.recruiterRating.trim()
      ? Math.min(5, Math.max(0, Number(form.recruiterRating)))
      : undefined

    const recency = form.verificationRecencyDays.trim()
      ? Math.max(0, Number(form.verificationRecencyDays))
      : undefined

    const base: Internship = {
      id: form.id ?? `int-${Date.now()}`,
      title: form.title || 'Untitled Internship',
      company: form.company || 'Unknown Company',
      location: form.location || 'Remote',
      description: form.description || 'No description provided.',
      skillsRequired: skillsArray.length ? skillsArray : ['general'],
      recruiterRating: rating,
      verificationRecencyDays: recency,
    }

    setInternships((prev) => {
      if (form.id) {
        return prev.map((i) => (i.id === form.id ? base : i))
      }
      return [base, ...prev]
    })

    resetForm()
  }

  const handleDelete = (id: string) => {
    setInternships((prev) => prev.filter((i) => i.id !== id))
    if (form.id === id) resetForm()
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-semibold text-slate-900">
          Recruiter Internship Management
        </h1>
        <p className="mt-2 text-slate-600 text-sm">
          Create and manage internship listings. These records are stored in
          localStorage and used by the recommendation engine on the student
          dashboard.
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 text-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {form.id ? 'Edit Internship' : 'Create Internship'}
            </h2>
            {form.id && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs text-slate-500 underline"
              >
                Clear form
              </button>
            )}
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 mb-1">Company</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => handleChange('company', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-600 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-slate-600 mb-1">
              Skills required (comma-separated)
            </label>
            <input
              type="text"
              value={form.skillsRequired}
              onChange={(e) => handleChange('skillsRequired', e.target.value)}
              placeholder="python, django, rest api"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-600 mb-1">
                Recruiter rating (0–5)
              </label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.recruiterRating}
                onChange={(e) =>
                  handleChange('recruiterRating', e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">
                Verification recency (days)
              </label>
              <input
                type="number"
                min="0"
                value={form.verificationRecencyDays}
                onChange={(e) =>
                  handleChange('verificationRecencyDays', e.target.value)
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow-md"
          >
            {form.id ? 'Update Internship' : 'Add Internship'}
          </button>
        </form>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            Current Internships ({internships.length})
          </h2>
          {internships.length === 0 ? (
            <p className="text-slate-600">
              No internships defined yet. Use the form to create one.
            </p>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {internships.map((i) => (
                <div
                  key={i.id}
                  className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {i.title}
                    </div>
                    <div className="text-xs text-slate-600">
                      {i.company} · {i.location}
                    </div>
                    <div className="mt-1 text-xs text-slate-600 line-clamp-2">
                      {i.description}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Skills: {i.skillsRequired.join(', ')}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Rating:{' '}
                      {i.recruiterRating != null
                        ? `${i.recruiterRating}/5`
                        : 'n/a'}{' '}
                      · Verified{' '}
                      {i.verificationRecencyDays != null
                        ? `${i.verificationRecencyDays} days ago`
                        : 'n/a'}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(i.id)}
                      className="rounded-full border border-rose-300 px-3 py-1 text-xs text-rose-700 hover:bg-rose-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
