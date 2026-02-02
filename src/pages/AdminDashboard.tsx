import { useMemo } from 'react'
import {
  computeRecommendations,
  type RecommendationResult,
} from '../ml/recommender'
import {
  defaultInternships,
  defaultStudent,
} from '../data/internships'

export default function AdminDashboard() {
  const example: RecommendationResult | undefined = useMemo(() => {
    const recs = computeRecommendations(defaultStudent, defaultInternships)
    return recs[0]
  }, [])

  return (
    <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
      <section>
        <h1 className="text-3xl font-semibold text-slate-900">
          Admin: Recommendation Pipeline Overview
        </h1>
        <p className="mt-2 text-slate-600 text-sm">
          This page explains, step by step, how the InternConnect recommendation
          engine transforms student skills and internship descriptions into a
          final ranking score – all computed in the browser using TF-IDF and
          simple mathematical formulas.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Example Input
          </h2>
          <p className="text-slate-700">
            <span className="font-medium">Student skills:</span>{' '}
            {defaultStudent.verifiedSkills.join(', ')}
          </p>
          {example && (
            <p className="mt-2 text-slate-700">
              <span className="font-medium">Example internship:</span>{' '}
              {example.internship.title} at {example.internship.company}
            </p>
          )}
          <p className="mt-3 text-slate-600">
            The engine builds TF-IDF vectors from these texts and then applies
            cosine similarity, VSPS, and Trust Score to get the final score.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Final Score (for presentation)
          </h2>
          {example ? (
            <ul className="space-y-1 text-slate-700">
              <li>
                Cosine similarity:{' '}
                <span className="font-mono">
                  {example.cosineSimilarity.toFixed(3)}
                </span>
              </li>
              <li>
                VSPS:{' '}
                <span className="font-mono">{example.vsps.toFixed(3)}</span>
              </li>
              <li>
                Trust score:{' '}
                <span className="font-mono">
                  {example.trustScore.toFixed(3)}
                </span>
              </li>
              <li>
                Final score:{' '}
                <span className="font-mono">
                  {example.finalScore.toFixed(3)}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-slate-600">
              No example available. Add internships and student data first.
            </p>
          )}
          <p className="mt-3 text-slate-600 text-xs">
            FinalScore = CosineSimilarity × VSPS × TrustScore (all values are
            normalized between 0 and 1).
          </p>
        </div>
      </section>

      <section className="space-y-4">
        <PipelineStep
          step="1"
          title="Input: Structured Skills & Descriptions"
          description="We start from two text sources – verified student skills and internship descriptions (plus required skills). These are concatenated into candidate and internship documents."
          details={[
            'Candidate text = verifiedSkills.join(" ")',
            'Internship text = description + " " + skillsRequired.join(" ")',
          ]}
        />
        <PipelineStep
          step="2"
          title="TF-IDF Vectorization"
          description="Each document is tokenized and converted into a numeric TF-IDF vector, giving higher weight to rare but informative terms."
          details={[
            'tf(term, doc) = count(term) / totalTermsInDoc',
            'idf(term) = ln(N / (1 + df(term)))',
            'vector[i] = tf(term_i, doc) * idf(term_i)',
          ]}
        />
        <PipelineStep
          step="3"
          title="Cosine Similarity"
          description="Cosine similarity measures how aligned the student and internship vectors are, independent of absolute length."
          details={[
            'similarity = (A · B) / (||A|| × ||B||)',
            'Returns 0 when either vector is all zeros.',
          ]}
        />
        <PipelineStep
          step="4"
          title="VSPS – Verified Skill Performance Score"
          description="VSPS combines assessment accuracy, speed, and skip-penalty into a single performance score between 0 and 1."
          details={[
            'VSPS = 0.6 × Accuracy + 0.3 × Speed − 0.1 × SkipPenalty',
          ]}
        />
        <PipelineStep
          step="5"
          title="Trust Score"
          description="Trust adjusts for recruiter quality and recency of verification."
          details={[
            'With rating: Trust = 0.4 × Accuracy + 0.4 × AdjustedRating + 0.2 × VerificationRecency',
            'Without rating: Trust = 0.7 × Accuracy + 0.3 × AssessmentRecency',
          ]}
        />
        <PipelineStep
          step="6"
          title="Final Ranking"
          description="Finally, all three components are combined into a single ranking score for each internship."
          details={[
            'FinalScore = CosineSimilarity × VSPS × TrustScore',
            'Internships are sorted in descending order of FinalScore.',
          ]}
        />
      </section>
    </main>
  )
}

type PipelineStepProps = {
  step: string
  title: string
  description: string
  details?: string[]
}

function PipelineStep({
  step,
  title,
  description,
  details,
}: PipelineStepProps) {
  return (
    <div className="relative rounded-2xl border border-slate-200 bg-white p-5 shadow-sm text-sm">
      <div className="absolute -left-3 top-4 h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-semibold">
        {step}
      </div>
      <h3 className="pl-4 text-base font-semibold text-slate-900">
        {title}
      </h3>
      <p className="pl-4 mt-1 text-slate-600">{description}</p>
      {details && (
        <ul className="pl-8 mt-2 space-y-1 list-disc text-slate-600">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

