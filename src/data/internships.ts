import type {
  Internship,
  StudentProfile,
} from '../ml/recommender'

const INTERNSHIP_KEY = 'internconnect_internships'
const STUDENT_KEY = 'internconnect_student'

const isBrowser =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'

export const defaultInternships: Internship[] = [
  {
    id: 'int-1',
    title: 'Backend Developer Intern',
    company: 'NovaTech',
    location: 'Remote',
    description:
      'Work on RESTful APIs using Python and Django, integrate with databases, and collaborate with senior engineers.',
    skillsRequired: ['python', 'django', 'rest', 'sql'],
    recruiterRating: 4.5,
    verificationRecencyDays: 15,
  },
  {
    id: 'int-2',
    title: 'Full-Stack Intern (React + Node)',
    company: 'Skyline Labs',
    location: 'Bengaluru, India',
    description:
      'Build full-stack features using React on the frontend and Node.js or Django on the backend.',
    skillsRequired: ['react', 'javascript', 'node', 'django'],
    recruiterRating: 4.2,
    verificationRecencyDays: 30,
  },
  {
    id: 'int-3',
    title: 'API Developer Intern',
    company: 'CloudBridge',
    location: 'Remote',
    description:
      'Design and implement REST APIs, work with authentication, and write clean documentation.',
    skillsRequired: ['rest', 'api', 'python', 'postman'],
    recruiterRating: 4.8,
    verificationRecencyDays: 5,
  },
  {
    id: 'int-4',
    title: 'Data Engineering Intern',
    company: 'DataSphere',
    location: 'Hyderabad, India',
    description:
      'Build data pipelines using Python and SQL, optimize queries, and collaborate on dashboards.',
    skillsRequired: ['python', 'sql', 'etl'],
    recruiterRating: 4.0,
    verificationRecencyDays: 60,
  },
]

export const defaultStudent: StudentProfile = {
  id: 'student-1',
  name: 'Demo Student',
  verifiedSkills: ['python', 'django', 'rest api'],
  accuracy: 0.85,
  speed: 0.8,
  skipPenalty: 0.1,
  assessmentRecencyDays: 20,
}

export function loadInternships(): Internship[] {
  if (!isBrowser) return defaultInternships
  const raw = window.localStorage.getItem(INTERNSHIP_KEY)
  if (!raw) return defaultInternships
  try {
    const parsed = JSON.parse(raw) as Internship[]
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch {
    // ignore and fall back
  }
  return defaultInternships
}

export function saveInternships(internships: Internship[]): void {
  if (!isBrowser) return
  window.localStorage.setItem(INTERNSHIP_KEY, JSON.stringify(internships))
}

export function loadStudentProfile(): StudentProfile {
  if (!isBrowser) return defaultStudent
  const raw = window.localStorage.getItem(STUDENT_KEY)
  if (!raw) return defaultStudent
  try {
    const parsed = JSON.parse(raw) as StudentProfile
    if (parsed && typeof parsed === 'object') {
      return {
        ...defaultStudent,
        ...parsed,
      }
    }
  } catch {
    // ignore
  }
  return defaultStudent
}

export function saveStudentProfile(student: StudentProfile): void {
  if (!isBrowser) return
  window.localStorage.setItem(STUDENT_KEY, JSON.stringify(student))
}

