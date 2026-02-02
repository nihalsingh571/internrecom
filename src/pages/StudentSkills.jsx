import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';

export default function StudentSkills() {
    const navigate = useNavigate();
    const [skills, setSkills] = useState([]);
    const [newSkill, setNewSkill] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSkills();
    }, []);

    const fetchSkills = async () => {
        try {
            const res = await API.get('/api/applicants/me/');
            // Normalize skills
            const rawSkills = res.data.skills || [];
            const normalized = rawSkills.map(s => typeof s === 'string' ? { name: s, status: 'pending' } : s);
            setSkills(normalized);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSkill = async (e) => {
        e.preventDefault();
        if (!newSkill.trim()) return;

        const skillName = newSkill.trim();
        // Check duplicate
        if (skills.some(s => s.name.toLowerCase() === skillName.toLowerCase())) {
            alert("Skill already added");
            return;
        }

        const newSkillsList = [...skills, { name: skillName, status: 'pending' }];

        try {
            await API.patch('/api/applicants/me/', { skills: newSkillsList });
            setSkills(newSkillsList);
            setNewSkill('');

            // User Requirement: Immediately open assessment for this skill
            navigate('/student/assessment', { state: { skills: [skillName] } });
        } catch (err) {
            alert("Failed to save skill");
        }
    };

    const hasPendingSkills = skills.some(s => s.status === 'pending');

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-4">Manage Skills</h2>

                <form onSubmit={handleAddSkill} className="flex gap-4 mb-8">
                    <input
                        type="text"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="Add a new skill (e.g. Python, React)"
                        className="flex-1 rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    />
                    <button
                        type="submit"
                        className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium hover:bg-indigo-700"
                    >
                        Add Skill
                    </button>
                </form>

                <div className="flex flex-wrap gap-3">
                    {skills.map((skill, idx) => (
                        <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${skill.status === 'verified'
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                        >
                            {skill.name}
                            {skill.status === 'pending' && <span className="ml-1 text-xs text-amber-600 italic">(Pending)</span>}
                        </span>
                    ))}
                    {skills.length === 0 && <p className="text-slate-500 italic">No skills added yet.</p>}
                </div>
            </div>

            {hasPendingSkills && (
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-indigo-900">Pending Skills Detected</h3>
                        <p className="text-sm text-indigo-700">You have unverified skills. Take the assessment to verify them.</p>
                    </div>
                    <button
                        onClick={() => navigate('/student/assessment', { state: { skills: skills.filter(s => s.status === 'pending').map(s => s.name) } })}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-md font-bold hover:bg-indigo-700 shadow-sm"
                    >
                        Verify Now
                    </button>
                </div>
            )}
        </div>
    );
}
