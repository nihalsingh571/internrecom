import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import { motion } from 'framer-motion';

export default function StudentInternships() {
    const navigate = useNavigate();
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Check verification status first
            const profileRes = await API.get('/api/applicants/me/');
            const verified = profileRes.data.vsps_score > 0.0;
            setIsVerified(verified);

            if (verified) {
                // Fetch recommendations (which are internally scored now)
                const internRes = await API.get('/api/internships/recommendations/');
                // OR /api/internships/ if recommendations endpoint not separate? 
                // Current backend impl: InternshipViewSet has `recommendations` action.
                // So URL is /api/internships/recommendations/
                setInternships(internRes.data);
            }
        } catch (error) {
            console.error("Failed to fetch internships", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (internshipId) => {
        try {
            await API.post(`/api/internships/${internshipId}/apply/`);
            alert("Application submitted successfully!");
        } catch (error) {
            if (error.response && error.response.data && error.response.data.error) {
                alert(error.response.data.error);
            } else {
                alert("Failed to apply. Please try again.");
            }
        }
    };

    if (loading) return <div>Loading...</div>;

    if (!isVerified) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl shadow-sm border border-slate-200">
                <div className="text-4xl mb-4">🔒</div>
                <h2 className="text-xl font-bold text-slate-800">Internships Locked</h2>
                <p className="text-slate-500 mt-2 max-w-md">
                    You must complete the skill assessment to unlock personalized internship recommendations.
                </p>
                <button
                    onClick={() => navigate('/student/assessment')}
                    className="mt-6 bg-indigo-600 text-white px-6 py-2 rounded-md font-bold hover:bg-indigo-700"
                >
                    Go to Assessment
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-800">Recommended for You</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {internships.map((item) => {
                    // The backend might return standard object OR object with `recommendation` field
                    // My ViewSet impl puts recommendation scores IN `recommendation` field inside serializer data?
                    // Wait, my ViewSet logic:
                    // i_data['recommendation'] = { ... }
                    // So we access item.recommendation.final_score
                    const i = item;
                    return (
                        <motion.div
                            key={i.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                        >
                            <div className="p-5 flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-slate-900 line-clamp-1">{i.title}</h3>
                                    {i.recommendation && (
                                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                                            {(i.recommendation.final_score * 100).toFixed(0)}% Match
                                        </span>
                                    )}
                                </div>
                                <p className="text-slate-500 text-sm mt-1">{i.recruiter?.company_name || 'Top Company'}</p>
                                <p className="text-slate-600 mt-3 text-sm line-clamp-3">{i.description}</p>
                            </div>
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100 flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-500 flex items-center">
                                    📍 {i.location || 'Remote'}
                                </span>
                                <button
                                    onClick={() => handleApply(i.id)}
                                    className="text-indigo-600 text-sm font-semibold hover:text-indigo-800"
                                >
                                    Apply Now &rarr;
                                </button>
                            </div>
                        </motion.div>
                    );
                })}
                {internships.length === 0 && (
                    <p className="col-span-full text-center text-slate-500 py-10">No recommendations found matching your skills.</p>
                )}
            </div>
        </div>
    );
}
