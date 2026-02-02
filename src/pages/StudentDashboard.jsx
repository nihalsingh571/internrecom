import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);

    // Skills State
    const [newSkill, setNewSkill] = useState('');
    const [isAddingSkill, setIsAddingSkill] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const profileRes = await API.get('/api/applicants/me/');
            setProfile(profileRes.data);

            const internRes = await API.get('/api/internships/');
            setInternships(internRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data", error);
        } finally {
            setLoading(false);
        }
    };

    const addSkill = async () => {
        if (!newSkill) return;
        try {
            // Simply append to existing skills and PATCH.
            // Ideally backend handles "add skill" action but patching list works for MVP.
            const skillObj = { name: newSkill, status: 'pending' };
            const updatedSkills = [...(profile.skills || []), skillObj];
            await API.patch('/api/applicants/me/', { skills: updatedSkills });
            setProfile({ ...profile, skills: updatedSkills });
            setNewSkill('');
            setIsAddingSkill(false);

            navigate('/assessment', { state: { skills: [newSkill] } });
        } catch (error) {
            alert("Failed to update skills");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    const isVerified = profile?.vsps_score > 0.0; // Basic check

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Student Dashboard</h1>
                    <button onClick={logout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Sign out</button>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    {/* Profile Section */}
                    <div className="mb-8 p-6 bg-white rounded-lg shadow border-l-4 border-indigo-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-semibold mb-2">Welcome, {user?.first_name || 'Student'}!</h2>
                                <div className="mt-2 text-slate-600">
                                    <p><strong>VSPS Score:</strong> <span className={isVerified ? 'text-green-600 font-bold' : 'text-slate-500'}>{profile?.vsps_score.toFixed(2) || '0.00'}</span></p>
                                    <p><strong>Status:</strong> {isVerified ? 'Verified' : 'Unverified'}</p>
                                </div>
                            </div>
                            {!isVerified && (
                                <button
                                    onClick={() => navigate('/assessment')}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold shadow-md animate-pulse"
                                >
                                    Take Skill Assessment
                                </button>
                            )}
                            {isVerified && (
                                <button
                                    onClick={() => navigate('/assessment')}
                                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-md font-medium text-sm"
                                >
                                    Retake Assessment
                                </button>
                            )}
                        </div>

                        {/* Skills Section */}
                        <div className="mt-6">
                            <h3 className="text-md font-medium text-slate-700 mb-2">Your Skills</h3>
                            <div className="flex flex-wrap gap-2 items-center">
                                {profile?.skills.map((skill, idx) => {
                                    const skillName = typeof skill === 'string' ? skill : skill.name;
                                    const isPending = typeof skill === 'object' && skill.status === 'pending';
                                    return (
                                        <span key={idx} className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium border ${isPending
                                                ? 'bg-red-50 text-red-700 border-red-200'
                                                : 'bg-slate-100 text-slate-800 border-slate-200'
                                            }`}>
                                            {skillName} {isPending && <span className="ml-1 text-xs italic">(Pending)</span>}
                                        </span>
                                    );
                                })}
                                {isAddingSkill ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            autoFocus
                                            className="rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-1"
                                            placeholder="Java, SQL..."
                                            value={newSkill}
                                            onChange={(e) => setNewSkill(e.target.value)}
                                        />
                                        <button onClick={addSkill} className="text-green-600 font-bold text-sm">Save</button>
                                        <button onClick={() => setIsAddingSkill(false)} className="text-slate-400 text-sm">Cancel</button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setIsAddingSkill(true)}
                                        className="inline-flex items-center rounded-full border border-dashed border-slate-300 px-3 py-1 text-sm font-medium text-slate-500 hover:border-indigo-500 hover:text-indigo-600"
                                    >
                                        + Add Skill
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
                        Recommended Internships
                        {!isVerified && <span className="text-xs text-red-500 font-normal bg-red-50 px-2 py-1 rounded">(Locked - Take Assessment to Unlock)</span>}
                    </h3>

                    {!isVerified ? (
                        <div className="bg-slate-100 rounded-xl p-12 text-center border-2 border-dashed border-slate-300">
                            <div className="mx-auto h-12 w-12 text-slate-400 mb-4">🔒</div>
                            <h3 className="text-lg font-medium text-slate-900">Recommendations Locked</h3>
                            <p className="mt-2 text-slate-500">Complete the skill assessment to see personalized internship matches.</p>
                            <button
                                onClick={() => navigate('/assessment')}
                                className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-bold"
                            >
                                Start Assessment
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {internships.map((internship) => (
                                <motion.div
                                    key={internship.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="overflow-hidden rounded-lg bg-white shadow hover:shadow-md transition-shadow"
                                >
                                    <div className="px-4 py-5 sm:p-6">
                                        <h4 className="text-base font-semibold text-slate-900">{internship.title}</h4>
                                        <p className="text-sm text-slate-500">{internship.company_name}</p>
                                        <p className="mt-2 text-sm text-slate-600 line-clamp-2">{internship.description}</p>
                                        <div className="mt-4 flex justify-between items-center">
                                            <span className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10">
                                                {internship.location}
                                            </span>
                                            <span className="text-xs text-green-600 font-bold">
                                                {(internship.recruiter_rating * 100).toFixed(0)}% Match
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                            {internships.length === 0 && <p className="text-slate-500">No internships found.</p>}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
