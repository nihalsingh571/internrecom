import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import GlowingIndiaMap from '../components/ui/GlowingIndiaMap';
import NotificationTrigger from '../components/notifications/NotificationTrigger';
import CategoryCard from '../components/ui/CategoryCard';

export default function StudentHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('Developer');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const profileRes = await API.get('/api/applicants/me/');
                setProfile(profileRes.data);

                // Preview a few recommended internships (same endpoint used on internships page)
                const internRes = await API.get('/api/internships/recommendations/');
                setInternships(internRes.data || []);
            } catch (err) {
                console.error('Failed to fetch student dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) return <div>Loading...</div>;

    const isVerified = profile?.vsps_score > 0.0;
    const score = profile?.vsps_score?.toFixed(2) || '0.00';
    const featured = internships.slice(0, 3);

    const categoryDataset = {
        Developer: {
            title: 'Software Development Internship',
            company: 'Devdoq',
            location: 'Remote / Bangalore',
            description:
                'Work with a modern stack to build scalable backend services, write clean APIs, and collaborate with senior engineers on real product features.',
            match: 89,
        },
        Product: {
            title: 'Associate Product Intern',
            company: 'ProductNest Labs',
            location: 'Remote / Mumbai',
            description:
                'Assist the product team with user research, requirement gathering, and feature prioritisation for a SaaS analytics dashboard.',
            match: 84,
        },
        Analytics: {
            title: 'Data Analytics Internship',
            company: 'InsightSphere',
            location: 'Remote / Gurgaon',
            description:
                'Analyse product usage data, build dashboards in Python and SQL, and summarise insights for weekly business reviews.',
            match: 91,
        },
        Marketing: {
            title: 'Growth Marketing Intern',
            company: 'LaunchPad Digital',
            location: 'Hybrid / Delhi',
            description:
                'Support growth campaigns, run A/B tests on landing pages, and track performance metrics across paid and organic channels.',
            match: 77,
        },
        Sales: {
            title: 'Business Development Intern',
            company: 'PipelineX',
            location: 'Remote / Pune',
            description:
                'Work with the sales team to qualify leads, prepare demos, and track opportunity status in a modern CRM workflow.',
            match: 82,
        },
        Ops: {
            title: 'Operations Intern',
            company: 'FlowOps Systems',
            location: 'On-site / Chennai',
            description:
                'Help streamline internal processes, coordinate between cross‑functional teams, and monitor SLAs for service delivery.',
            match: 80,
        },
        Design: {
            title: 'Product Design Intern',
            company: 'PixelCraft Studio',
            location: 'Remote',
            description:
                'Collaborate with product and engineering to design flows, wireframes, and high‑fidelity UI screens for a web dashboard.',
            match: 88,
        },
    };

    const selectedCategoryData = categoryDataset[selectedCategory];

    return (
        <div className="space-y-6">
            {/* Hero-style summary card */}
            <section className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                    <div>
                        <p className="text-xs uppercase tracking-wide text-indigo-600 font-semibold">
                            Welcome back
                        </p>
                        <h2 className="text-2xl font-bold text-slate-900 mt-1">
                            {user?.first_name || 'Student'}
                        </h2>
                        <p className="text-sm text-slate-600 mt-2 max-w-xl">
                            Your verification score and recent assessments help us prioritise internships
                            that best match your skills and goals.
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-100">
                                <p className="text-[11px] font-semibold uppercase text-indigo-500 tracking-wide">
                                    VSPS Score
                                </p>
                                <p className="text-3xl font-bold text-indigo-700 mt-1">{score}</p>
                            </div>
                            <div
                                className={`rounded-xl p-4 border ${
                                    isVerified
                                        ? 'bg-green-50 border-green-100'
                                        : 'bg-amber-50 border-amber-100'
                                }`}
                            >
                                <p
                                    className={`text-[11px] font-semibold uppercase tracking-wide ${
                                        isVerified ? 'text-green-600' : 'text-amber-600'
                                    }`}
                                >
                                    Status
                                </p>
                                <p
                                    className={`text-2xl font-bold mt-1 ${
                                        isVerified ? 'text-green-700' : 'text-amber-700'
                                    }`}
                                >
                                    {isVerified ? 'Verified' : 'Unverified'}
                                </p>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col justify-between">
                                <p className="text-[11px] font-semibold uppercase text-slate-500 tracking-wide">
                                    Next step
                                </p>
                                {!isVerified ? (
                                    <button
                                        onClick={() => navigate('/student/assessment')}
                                        className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-full text-xs shadow-sm"
                                    >
                                        Take assessment
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => navigate('/student/internships')}
                                        className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-full text-xs shadow-sm"
                                    >
                                        View internships
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Category pills with 3D hover & glow */}
            <section className="flex flex-wrap gap-3">
                {['Developer', 'Product', 'Analytics', 'Marketing', 'Sales', 'Ops', 'Design'].map(
                    (label) => (
                        <CategoryCard
                            key={label}
                            label={label}
                            active={selectedCategory === label}
                            onClick={() => setSelectedCategory(label)}
                        />
                    ),
                )}
            </section>

            {/* Selected category featured company */}
            <section className="mt-2">
                {selectedCategoryData && (
                    <motion.div
                        key={selectedCategory}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                        <div>
                            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                                Featured in {selectedCategory}
                            </p>
                            <h3 className="mt-1 text-sm sm:text-base font-semibold text-slate-900">
                                {selectedCategoryData.title}
                            </h3>
                            <p className="text-xs text-slate-500">
                                {selectedCategoryData.company} • {selectedCategoryData.location}
                            </p>
                            <p className="mt-2 text-xs sm:text-sm text-slate-600 max-w-2xl">
                                {selectedCategoryData.description}
                            </p>
                        </div>
                        <div className="flex flex-col items-end gap-2 text-xs">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                {selectedCategoryData.match}% match
                            </span>
                            <button
                                type="button"
                                onClick={() => navigate('/student/internships')}
                                className="inline-flex items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-600 hover:text-white"
                            >
                                View similar roles
                            </button>
                        </div>
                    </motion.div>
                )}
            </section>

            {/* Filters row */}
            <section className="flex flex-wrap items-center gap-3 text-xs">
                <span className="font-semibold text-slate-500 uppercase">Filters</span>
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

            {/* Main grid: internship preview + sidebar */}
            <section className="grid gap-6 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-slate-900">
                        Recommended internships preview
                    </h3>

                    {!isVerified ? (
                        <div className="bg-slate-100 rounded-2xl p-10 text-center border-2 border-dashed border-slate-300">
                            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow">
                                🔒
                            </div>
                            <h4 className="text-lg font-semibold text-slate-900">
                                Recommendations locked
                            </h4>
                            <p className="mt-2 text-sm text-slate-500">
                                Complete the skill assessment to see personalised internship matches.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate('/student/assessment')}
                                className="mt-6 inline-flex items-center justify-center rounded-full bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                            >
                                Start assessment
                            </button>
                        </div>
                    ) : featured.length === 0 ? (
                        <p className="text-sm text-slate-600">
                            No recommendations found yet. Visit the Internships tab to see more.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {featured.map((item) => {
                                const i = item;
                                const skillsRow = i.required_skills || i.skillsRequired || [];
                                const matchScore = i.recommendation
                                    ? (i.recommendation.final_score * 100).toFixed(0)
                                    : '—';

                                return (
                                    <motion.div
                                        key={i.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="p-5 space-y-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="text-sm sm:text-base font-semibold text-slate-900">
                                                        {i.title}
                                                    </h4>
                                                    <p className="text-xs text-slate-500">
                                                        {i.recruiter?.company_name || 'Top Company'}
                                                    </p>
                                                </div>
                                                {matchScore !== '—' && (
                                                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                                        {matchScore}% match
                                                    </span>
                                                )}
                                            </div>

                                            <p className="text-xs sm:text-sm text-slate-600 line-clamp-3">
                                                {i.description}
                                            </p>

                                            <div className="flex flex-wrap gap-2 mt-2">
                                                {skillsRow.slice(0, 5).map((skill) => (
                                                    <span
                                                        key={String(skill)}
                                                        className="inline-flex items-center rounded-full bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200"
                                                    >
                                                        {String(skill)}
                                                    </span>
                                                ))}
                                            </div>

                                            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                                                <span>📍 {i.location || 'Remote'}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigate('/student/internships')}
                                                    className="text-indigo-600 font-semibold hover:text-indigo-800"
                                                >
                                                    View details →
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Sidebar: map + explanation / next actions */}
                <aside className="space-y-4">
                    <GlowingIndiaMap />
                    <NotificationTrigger />
                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-xs text-slate-700">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                            How this dashboard works
                        </h4>
                        <p>
                            Your skills and assessment results are converted into numeric vectors
                            using TF-IDF. We compare them against internship descriptions, adjust
                            using VSPS and recruiter trust scores, and then rank roles from best
                            to worst fit.
                        </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-indigo-50 p-4 text-xs text-slate-800 shadow-sm">
                        <h4 className="text-sm font-semibold text-slate-900 mb-1">
                            Next actions
                        </h4>
                        <ul className="list-disc list-inside space-y-1">
                            <li>Review your skills on the Skills tab.</li>
                            <li>Retake the assessment if your VSPS is low.</li>
                            <li>Open the Internships tab to see the full ranked list.</li>
                        </ul>
                    </div>
                </aside>
            </section>
        </div>
    );
}
