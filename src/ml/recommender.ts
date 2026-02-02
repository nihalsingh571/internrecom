// Core in-browser recommendation engine for InternConnect.
// Implements TF-IDF, cosine similarity, VSPS, Trust Score and final ranking.

export type Role = 'student' | 'recruiter' | 'admin'

export interface Internship {
  id: string
  title: string
  company: string
  location: string
  description: string
  skillsRequired: string[]
  recruiterRating?: number // 0–5
  verificationRecencyDays?: number // days since last verification
}

export interface StudentProfile {
  id: string
  name: string
  verifiedSkills: string[]
  accuracy: number // 0–1
  speed: number // 0–1
  skipPenalty: number // 0–1 (higher = worse)
  assessmentRecencyDays: number // days since last test
}

export interface RecommendationResult {
  internship: Internship
  cosineSimilarity: number
  vsps: number
  trustScore: number
  finalScore: number
}

export interface TfIdfSpace {
  vocab: string[]
  docFreq: Record<string, number>
  totalDocs: number
  candidateVector: number[]
  internshipVectors: number[][]
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1)
}

function buildDocFreq(docs: string[][]): Record<string, number> {
  const df: Record<string, number> = {}
  for (const tokens of docs) {
    const seen = new Set<string>()
    for (const t of tokens) {
      if (!seen.has(t)) {
        seen.add(t)
        df[t] = (df[t] ?? 0) + 1
      }
    }
  }
  return df
}

export function buildTfIdfVector(
  text: string,
  vocab: string[],
  docFreq: Record<string, number>,
  totalDocs: number,
): number[] {
  const tokens = tokenize(text)
  const totalTerms = tokens.length
  if (totalTerms === 0) {
    return new Array(vocab.length).fill(0)
  }

  const counts: Record<string, number> = {}
  for (const token of tokens) {
    counts[token] = (counts[token] ?? 0) + 1
  }

  return vocab.map((term) => {
    const tf = (counts[term] ?? 0) / totalTerms
    const df = docFreq[term] ?? 0
    const idf = Math.log(totalDocs / (1 + df))
    return tf * idf
  })
}

export function buildTfIdfSpace(
  candidateText: string,
  internshipTexts: string[],
): TfIdfSpace {
  const allTexts = [candidateText, ...internshipTexts]
  const tokenizedDocs = allTexts.map((t) => tokenize(t))

  const vocabSet = new Set<string>()
  for (const tokens of tokenizedDocs) {
    for (const token of tokens) {
      vocabSet.add(token)
    }
  }
  const vocab = Array.from(vocabSet)
  const docFreq = buildDocFreq(tokenizedDocs)
  const totalDocs = allTexts.length

  const candidateVector = buildTfIdfVector(candidateText, vocab, docFreq, totalDocs)
  const internshipVectors = internshipTexts.map((t) =>
    buildTfIdfVector(t, vocab, docFreq, totalDocs),
  )

  return {
    vocab,
    docFreq,
    totalDocs,
    candidateVector,
    internshipVectors,
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    const va = a[i]
    const vb = b[i]
    dot += va * vb
    normA += va * va
    normB += vb * vb
  }

  if (normA === 0 || normB === 0) return 0

  const sim = dot / (Math.sqrt(normA) * Math.sqrt(normB))
  if (sim < 0) return 0
  if (sim > 1) return 1
  return sim
}

export function computeVSPS(
  accuracy: number,
  speed: number,
  skipPenalty: number,
): number {
  const vsps = 0.6 * accuracy + 0.3 * speed - 0.1 * skipPenalty
  return Math.max(0, Math.min(1, vsps))
}

export function normalizeRecency(days: number | undefined): number {
  if (days == null) return 0
  const capped = Math.min(days, 365)
  return Math.max(0, 1 - capped / 365)
}

export function computeTrustScore(
  student: StudentProfile,
  internship: Internship,
): number {
  const accuracy = student.accuracy
  const recencyAssessment = normalizeRecency(student.assessmentRecencyDays)

  if (internship.recruiterRating != null) {
    const ratingNorm = internship.recruiterRating / 5
    const recencyVerification = normalizeRecency(
      internship.verificationRecencyDays,
    )
    const trust =
      0.4 * accuracy + 0.4 * ratingNorm + 0.2 * recencyVerification
    return Math.max(0, Math.min(1, trust))
  }

  const trust = 0.7 * accuracy + 0.3 * recencyAssessment
  return Math.max(0, Math.min(1, trust))
}

export function computeRecommendations(
  student: StudentProfile,
  internships: Internship[],
): RecommendationResult[] {
  if (!internships.length) return []

  const candidateText = student.verifiedSkills.join(' ')
  const internshipTexts = internships.map(
    (i) => `${i.description} ${i.skillsRequired.join(' ')}`,
  )

  const space = buildTfIdfSpace(candidateText, internshipTexts)

  return internships
    .map((internship, index) => {
      const cos = cosineSimilarity(
        space.candidateVector,
        space.internshipVectors[index],
      )
      const vsps = computeVSPS(
        student.accuracy,
        student.speed,
        student.skipPenalty,
      )
      const trust = computeTrustScore(student, internship)
      const finalScore = cos * vsps * trust

      return {
        internship,
        cosineSimilarity: Number(cos.toFixed(3)),
        vsps: Number(vsps.toFixed(3)),
        trustScore: Number(trust.toFixed(3)),
        finalScore: Number(finalScore.toFixed(3)),
      }
    })
    .sort((a, b) => b.finalScore - a.finalScore)
}

