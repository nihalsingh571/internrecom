import { useEffect, useMemo, useState } from 'react'
import {
  computeRecommendations,
  type RecommendationResult,
  type StudentProfile,
} from '../ml/recommender'
import {
  defaultStudent,
  loadInternships,
  loadStudentProfile,
  saveStudentProfile,
} from '../data/internships'

export default function StudentDashboard() {
  const [student, setStudent] = useState<StudentProfile>(defaultStudent)
  const [internships, setInternships] = useState(() => loadInternships())
  const [results, setResults] = useState<RecommendationResult[]>([])
  const [skillsInput, setSkillsInput] = useState(
    defaultStudent.verifiedSkills.join(', '),
  )
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    // Load from localStorage on mount (browser only)
    const storedStudent = loadStudentProfile()
    const storedInternships = loadInternships()
    setStudent(storedStudent)
    setInternships(storedInternships)
    setSkillsInput(storedStudent.verifiedSkills.join(', '))
    setLoaded(true)
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveStudentProfile(student)
  }, [student, loaded])

  const handleSkillsChange = (value: string) => {
    setSkillsInput(value)
    const tokens = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    setStudent((prev) => ({
      ...prev,
      verifiedSkills: tokens,
    }))
  }

  const handleNumberChange = (field: keyof StudentProfile, value: string) => {
    const num = Number(value)
    setStudent((prev) => ({
      ...prev,
      [field]: field === 'assessmentRecencyDays'
        ? Number.isFinite(num) && num >= 0
          ? num
          : 0
        : Math.min(1, Math.max(0, Number.isFinite(num) ? num : 0)),
    }))
  }

  const handleGenerate = () => {
    const recs = computeRecommendations(student, internships)
    setResults(recs)
  }

  const topThreeIds = useMemo(
    () => new Set(results.slice(0, 3).map((r) => r.internship.id)),
    [results],
  )

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-semibold text-slate-900">
          Student Recommendation Dashboard
        </h1>
        <p className="mt-2 text-slate-600 text-sm">
          Adjust your verified skills and assessment scores, then generate AI-style
          recommendations — all running locally in your browser.
        </p>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Student Profile
          </h2>
          <div className="mt-4 space-y-4 text-sm">
            <div>
              <label className="block text-slate-600 mb-1">Name</label>
              <input
                type="text"
                value={student.name}
                onChange={(e) =>
                  setStudent((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-slate-600 mb-1">
                Verified skills (comma-separated)
              </label>
              <input
                type="text"
                value={skillsInput}
                onChange={(e) => handleSkillsChange(e.target.value)}
                placeholder="Python, Django, REST API"
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-slate-500">
                These are used to build the TF-IDF vector for the candidate.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 mb-1">
                  Accuracy (0–1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={student.accuracy}
                  onChange={(e) => handleNumberChange('accuracy', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Speed (0–1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={student.speed}
                  onChange={(e) => handleNumberChange('speed', e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Skip penalty (0–1)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  value={student.skipPenalty}
                  onChange={(e) =>
                    handleNumberChange('skipPenalty', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-1">
                  Assessment recency (days)
                </label>
                <input
                  type="number"
                  min="0"
                  value={student.assessmentRecencyDays}
                  onChange={(e) =>
                    handleNumberChange('assessmentRecencyDays', e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-6 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:shadow-md"
          >
            Generate Recommendations
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Model Summary
          </h2>
          <p className="mt-2 text-slate-600">
            FinalScore = CosineSimilarity × VSPS × TrustScore
          </p>
          <ul className="mt-4 space-y-2 text-slate-600 list-disc list-inside">
            <li>
              <span className="font-medium">CosineSimilarity</span> measures skill
              overlap between your profile and internship descriptions using
              TF-IDF.
            </li>
            <li>
              <span className="font-medium">VSPS</span> combines accuracy, speed,
              and skip-penalty from micro-assessments.
            </li>
            <li>
              <span className="font-medium">TrustScore</span> blends assessment
              accuracy, recruiter ratings, and recency of verification.
            </li>
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Ranked Internship Recommendations
        </h2>
        {results.length === 0 ? (
          <p className="text-sm text-slate-600">
            No recommendations yet. Click{' '}
            <span className="font-medium">Generate Recommendations</span> to see
            ranked results.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="py-2 pr-4">Rank</th>
                  <th className="py-2 pr-4">Internship</th>
                  <th className="py-2 pr-4">Location</th>
                  <th className="py-2 pr-4 text-right">Cosine</th>
                  <th className="py-2 pr-4 text-right">VSPS</th>
                  <th className="py-2 pr-4 text-right">Trust</th>
                  <th className="py-2 text-right">Final</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, index) => (
                  <tr
                    key={r.internship.id}
                    className={`border-b border-slate-100 ${
                      index % 2 === 1 ? 'bg-slate-50/40' : ''
                    }`}
                  >
                    <td className="py-2 pr-4 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{index + 1}</span>
                        {topThreeIds.has(r.internship.id) && (
                          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-medium">
                            Top Match
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top">
                      <div className="font-medium text-slate-900">
                        {r.internship.title}
                      </div>
                      <div className="text-slate-600 text-xs">
                        {r.internship.company}
                      </div>
                    </td>
                    <td className="py-2 pr-4 align-top text-slate-600 text-xs">
                      {r.internship.location}
                    </td>
                    <td className="py-2 pr-4 text-right align-top">
                      {r.cosineSimilarity.toFixed(3)}
                    </td>
                    <td className="py-2 pr-4 text-right align-top">
                      {r.vsps.toFixed(3)}
                    </td>
                    <td className="py-2 pr-4 text-right align-top">
                      {r.trustScore.toFixed(3)}
                    </td>
                    <td className="py-2 text-right align-top font-semibold">
                      {r.finalScore.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  )
}

