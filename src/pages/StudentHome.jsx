import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Sparkles, ShieldCheck, Zap, TrendingUp, Clock8, ArrowUpRight, LineChart, Activity } from 'lucide-react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StudentHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecommendedInternships = async () => {
            try {
                const recRes = await API.get('/api/internships/recommendations/');
                return recRes.data || [];
            } catch (error) {
                if (error?.response?.status === 403 || error?.response?.status === 401 || error?.response?.status === 404) {
                    const allRes = await API.get('/api/internships/');
                    return allRes.data || [];
                }
                throw error;
            }
        };

        const fetchData = async () => {
            try {
                const [profileRes, internshipsData] = await Promise.all([
                    API.get('/api/applicants/me/').catch(() => null),
                    fetchRecommendedInternships(),
                ]);
                if (profileRes?.data) {
                    setProfile(profileRes.data);
                }
                setInternships(internshipsData);
            } catch (err) {
                console.error('Failed to fetch student dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const vspsScore = Number(profile?.vsps_score || 0);
    const formattedScore = vspsScore ? Math.round(vspsScore * 1000) / 10 : 0;
    const featured = internships.slice(0, 3);
    const verificationLevel = useMemo(() => {
        if (vspsScore >= 0.9) return 'Level 5';
        if (vspsScore >= 0.7) return 'Level 4';
        if (vspsScore >= 0.5) return 'Level 3';
        if (vspsScore >= 0.3) return 'Level 2';
        return 'Level 1';
    }, [vspsScore]);
    const matchesCount = internships.length;
    const verificationProgress = Math.min(100, Math.round(vspsScore * 100));
    const accuracyPct = Math.round((profile?.assessment_accuracy || 0) * 100);
    const speedPct = Math.round((profile?.assessment_speed_score || 0) * 100);
    const skipPct = Math.max(0, 100 - Math.round((profile?.assessment_skip_penalty || 0) * 100));
    const hintText =
        profile?.headline ||
        `Your skill verification is ${verificationProgress}% complete. Keep pushing for premium matches.`;

    const growthSeries = useMemo(
        () => [
            { label: 'Feb', student: 58, market: 52 },
            { label: 'Mar', student: 62, market: 55 },
            { label: 'Apr', student: 67, market: 59 },
            { label: 'May', student: 73, market: 61 },
            { label: 'Jun', student: 78, market: 64 },
        ],
        [],
    );

    const buildPath = (values) => {
        if (values.length === 0) return '';
        const max = Math.max(...values);
        const min = Math.min(...values);
        return values
            .map((value, index) => {
                const x = (index / (values.length - 1)) * 100;
                const relative = max === min ? 0.5 : (value - min) / (max - min);
                const y = 100 - relative * 80 - 10;
                return `${index === 0 ? 'M' : 'L'}${x},${y}`;
            })
            .join(' ');
    };

    const studentPath = buildPath(growthSeries.map((point) => point.student));
    const marketPath = buildPath(growthSeries.map((point) => point.market));

    const recentActivity = [
        featured[0]
            ? {
                  title: `New AI matching: ${featured[0].title}`,
                  time: '2 hours ago',
                  badge: `${Math.round(featured[0].match_score || 84)}% match`,
              }
            : {
                  title: 'Machine Learning assessment completed',
                  time: 'Yesterday',
                  badge: 'Verified',
              },
        {
            title: 'Applied to Product Design Internship',
            time: '2 days ago',
            badge: 'Under review',
        },
        {
            title: 'Skill sync: Python + React updated',
            time: '4 days ago',
            badge: '+2 skills',
        },
    ];

    if (loading) return <div>Loading...</div>;

    const quickActions = [
        {
            title: 'Upcoming Deadlines',
            description: `${Math.min(3, matchesCount)} applications ending soon`,
            action: 'View timeline',
            onClick: () => navigate('/student/applications'),
            color: 'from-indigo-600/80 to-indigo-500/40',
            icon: Clock8,
        },
        {
            title: 'Skill Blitz',
            description: 'Quick 5-min AI challenge',
            action: 'Start challenge',
            onClick: () => navigate('/student/assessment'),
            color: 'from-purple-600/80 to-fuchsia-500/40',
            icon: Zap,
        },
        {
            title: 'Referral Program',
            description: 'Invite friends and unlock premium',
            action: 'Invite now',
            onClick: () => navigate('/student/profile'),
            color: 'from-blue-600/80 to-cyan-500/40',
            icon: Sparkles,
        },
    ];

    return (
        <div className="min-h-[calc(100vh-120px)] bg-transparent text-white">
            <div className="space-y-8">
                <motion.section
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-[28px] bg-gradient-to-r from-[#3d2bff] via-[#7b2bff] to-[#c629ff] p-8 shadow-[0_35px_90px_rgba(64,33,155,0.5)]"
                >
                    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1 text-xs uppercase tracking-[0.35em] text-white/70">
                                <span className="h-2 w-2 rounded-full bg-white" />
                                AI Engine Updated v2.4
                            </div>
                            <h1 className="mt-4 text-4xl font-semibold">Welcome back, {user?.first_name || 'Explorer'}</h1>
                            <p className="mt-4 max-w-3xl text-base text-white/90">{hintText}</p>
                            <div className="mt-4 grid gap-4 text-xs uppercase tracking-[0.3em] text-white/70 sm:grid-cols-2">
                                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                                    <p className="text-[10px] text-white/60">Skill verification</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{verificationProgress}%</p>
                                    <div className="mt-2 h-1.5 rounded-full bg-white/20">
                                        <div
                                            className="h-full rounded-full bg-white"
                                            style={{ width: `${verificationProgress}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="rounded-2xl border border-white/20 bg-white/5 p-3">
                                    <p className="text-[10px] text-white/60">AI Matches</p>
                                    <p className="mt-2 text-2xl font-semibold text-white">{matchesCount}</p>
                                    <p className="text-[11px] text-white/60">new curated internships</p>
                                </div>
                            </div>
                            <div className="mt-6 flex flex-wrap gap-3">
                                <button
                                    type="button"
                                    onClick={() => navigate('/student/internships')}
                                    className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#2d1f9b] transition hover:opacity-90"
                                >
                                    Browse recommendations
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/student/skills')}
                                    className="rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                                >
                                    Update skills
                                </button>
                            </div>
                        </div>
                        <div className="rounded-[26px] border border-white/25 bg-white/10 p-8 text-center shadow-[0_20px_80px_rgba(12,11,43,0.35)]">
                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
                                <LineChart className="h-8 w-8 text-white" />
                            </div>
                            <p className="mt-4 text-xs uppercase tracking-[0.35em] text-white/70">AI Engine</p>
                            <p className="mt-2 text-xl font-semibold text-white">Skill sync active</p>
                            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-1 text-xs text-white/80">
                                <Activity size={14} />
                                Monitoring violations
                            </div>
                        </div>
                    </div>
                </motion.section>

                <section className="grid gap-4 md:grid-cols-3">
                    {[
                        {
                            label: 'VSPS Score',
                            value: formattedScore || 0,
                            helper: 'Top 5% in React Development',
                            icon: TrendingUp,
                            footer: '+12 pts this week',
                        },
                        {
                            label: 'Verification',
                            value: verificationLevel,
                            helper: `${Math.max(1, Math.round((profile?.skills?.length || 3) * 1.2))} skills certified`,
                            icon: ShieldCheck,
                            footer: 'Security layer synced',
                        },
                        {
                            label: 'AI Matches',
                            value: matchesCount,
                            helper: 'New curated internships',
                            icon: Zap,
                            footer: '3 priority leads',
                        },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-3xl border border-white/10 bg-[#0c1024] p-6 shadow-[0_25px_80px_rgba(3,7,18,0.6)]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs uppercase tracking-[0.35em] text-white/50">{stat.label}</p>
                                    <p className="mt-3 text-3xl font-semibold">{stat.value}</p>
                                </div>
                                <span className="rounded-2xl bg-white/10 p-3">
                                    <stat.icon className="h-5 w-5 text-indigo-200" />
                                </span>
                            </div>
                            <p className="mt-3 text-sm text-white/70">{stat.helper}</p>
                            <p className="mt-4 text-xs font-semibold text-emerald-300">{stat.footer}</p>
                        </div>
                    ))}
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-3xl border border-white/10 bg-[#070c1f] p-6 shadow-[0_20px_70px_rgba(5,7,19,0.65)]">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Assessment accuracy</p>
                        <p className="mt-3 text-4xl font-semibold text-white">{accuracyPct}%</p>
                        <p className="mt-1 text-sm text-white/60">Correct answers across the latest attempt</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-[#070c1f] p-6 shadow-[0_20px_70px_rgba(5,7,19,0.65)]">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Speed score</p>
                        <p className="mt-3 text-4xl font-semibold text-white">{speedPct}%</p>
                        <p className="mt-1 text-sm text-white/60">Average response time advantage</p>
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-[#070c1f] p-6 shadow-[0_20px_70px_rgba(5,7,19,0.65)]">
                        <p className="text-xs uppercase tracking-[0.35em] text-white/50">Focused session</p>
                        <p className="mt-3 text-4xl font-semibold text-white">{skipPct}%</p>
                        <p className="mt-1 text-sm text-white/60">Questions answered without violations</p>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-3">
                    <div className="rounded-3xl border border-white/5 bg-[#090d1d] p-6 shadow-inner lg:col-span-2">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.4em] text-white/40">Growth analytics</p>
                                <h3 className="mt-2 text-xl font-semibold">Proficiency vs Market demand</h3>
                            </div>
                            <div className="flex gap-3 text-sm text-white/70">
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-indigo-400" /> Your skills
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="h-2 w-2 rounded-full bg-white/40" /> Market demand
                                </span>
                            </div>
                        </div>
                        <div className="mt-6 h-64 rounded-2xl bg-gradient-to-b from-[#111836] to-[#070b18] p-6">
                            <svg viewBox="0 0 100 100" className="h-full w-full">
                                <path d={marketPath} fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" strokeLinecap="round" />
                                <path d={studentPath} fill="none" stroke="url(#studentLine)" strokeWidth="2.4" strokeLinecap="round" />
                                <defs>
                                    <linearGradient id="studentLine" x1="0%" x2="100%">
                                        <stop offset="0%" stopColor="#7c5bff" />
                                        <stop offset="100%" stopColor="#33d4ff" />
                                    </linearGradient>
                                </defs>
                            </svg>
                            <div className="mt-4 flex justify-between text-xs text-white/50">
                                {growthSeries.map((point) => (
                                    <span key={point.label}>{point.label}</span>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/5 bg-[#090d1d] p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs uppercase tracking-[0.35em] text-white/40">Recent activity</p>
                                <h3 className="mt-2 text-xl font-semibold">Realtime updates</h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => navigate('/student/applications')}
                                className="text-sm text-indigo-300 hover:text-indigo-100"
                            >
                                View history
                            </button>
                        </div>
                        <div className="mt-6 space-y-5">
                            {recentActivity.map((activity, idx) => (
                                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                                    <div className="mt-1 h-2 w-2 rounded-full bg-indigo-300" />
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold">{activity.title}</p>
                                        <p className="mt-1 text-xs text-white/60">{activity.time}</p>
                                    </div>
                                    <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
                                        {activity.badge}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="grid gap-4 md:grid-cols-3">
                    {quickActions.map((card) => (
                        <div
                            key={card.title}
                            className={`rounded-3xl border border-white/5 bg-gradient-to-br ${card.color} p-5 text-white shadow-[0_15px_50px_rgba(5,7,19,0.7)]`}
                        >
                            <div className={`rounded-2xl bg-white/10 p-3`}>
                                <card.icon className="h-5 w-5 text-white" />
                            </div>
                            <h4 className="mt-4 text-lg font-semibold">{card.title}</h4>
                            <p className="mt-2 text-sm text-white/80">{card.description}</p>
                            <button
                                type="button"
                                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-white transition hover:opacity-80"
                                onClick={card.onClick}
                            >
                                {card.action}
                                <ArrowUpRight className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
}
