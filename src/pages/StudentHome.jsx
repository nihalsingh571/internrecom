import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function StudentHome() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await API.get('/api/applicants/me/');
                setProfile(res.data);
            } catch (err) {
                console.error("Failed to fetch profile", err);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (loading) return <div>Loading...</div>;

    const isVerified = profile?.vsps_score > 0.0;
    const score = profile?.vsps_score?.toFixed(2) || '0.00';

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                <h2 className="text-2xl font-bold text-slate-800">Welcome back, {user?.first_name}!</h2>
                <p className="text-slate-500 mt-1">Here is your verification status.</p>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                        <p className="text-xs font-semibold uppercase text-indigo-500 tracking-wider">VSPS Score</p>
                        <p className="text-3xl font-bold text-indigo-700 mt-1">{score}</p>
                    </div>
                    <div className={`p-4 rounded-lg border ${isVerified ? 'bg-green-50 border-green-100' : 'bg-amber-50 border-amber-100'}`}>
                        <p className={`text-xs font-semibold uppercase tracking-wider ${isVerified ? 'text-green-600' : 'text-amber-600'}`}>Status</p>
                        <p className={`text-3xl font-bold mt-1 ${isVerified ? 'text-green-700' : 'text-amber-700'}`}>
                            {isVerified ? 'Verified' : 'Unverified'}
                        </p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 flex flex-col justify-center items-start">
                        {!isVerified ? (
                            <button
                                onClick={() => navigate('/student/assessment')}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md transition-colors shadow-sm"
                            >
                                Take Assessment
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/student/internships')}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition-colors shadow-sm"
                            >
                                View Internships
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {!isVerified && (
                <div className="bg-white rounded-xl shadow-sm p-6 border-l-4 border-amber-400">
                    <h3 className="text-lg font-semibold text-slate-800">Action Required</h3>
                    <p className="text-slate-600 mt-2">
                        You need to verify your skills to unlock internship recommendations.
                        Go to the <strong>Skills</strong> page to add your skills, then take the <strong>Assessment</strong>.
                    </p>
                </div>
            )}
        </div>
    );
}
