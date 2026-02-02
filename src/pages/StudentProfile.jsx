import { useEffect, useState } from 'react';
import API from '../services/api';

export default function StudentProfile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        mobile_number: '',
        github_link: '',
        linkedin_link: '',
        college: '',
        degree: ''
    });

    useEffect(() => {
        API.get('/api/applicants/me/').then(res => {
            const data = res.data;
            setProfile(data);
            setFormData({
                email: data.email || '',
                mobile_number: data.mobile_number || '',
                github_link: data.github_link || '',
                linkedin_link: data.linkedin_link || '',
                college: data.college || '',
                degree: data.degree || ''
            });
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await API.patch('/api/applicants/me/', formData);
            setProfile(res.data);
            setIsEditing(false);
            alert("Profile updated successfully!");
        } catch (error) {
            console.error(error);
            alert("Failed to update profile.");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md border border-slate-100 overflow-hidden">
            <div className="bg-indigo-600 px-8 py-6 flex justify-between items-center text-white">
                <div>
                    <h2 className="text-2xl font-bold">{profile?.first_name} {profile?.last_name}</h2>
                    <p className="opacity-90">{profile?.email}</p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="bg-white text-indigo-600 px-4 py-2 rounded-md font-bold text-sm hover:bg-indigo-50 transition-colors"
                    >
                        Edit Profile
                    </button>
                )}
            </div>

            <div className="p-8">
                {isEditing ? (
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Mobile Number</label>
                                <input
                                    type="text"
                                    name="mobile_number"
                                    value={formData.mobile_number}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">College / University</label>
                                <input
                                    type="text"
                                    name="college"
                                    value={formData.college}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Degree / Major</label>
                                <input
                                    type="text"
                                    name="degree"
                                    value={formData.degree}
                                    onChange={handleChange}
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">GitHub Profile</label>
                                <input
                                    type="url"
                                    name="github_link"
                                    value={formData.github_link}
                                    onChange={handleChange}
                                    placeholder="https://github.com/username"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-700">LinkedIn Profile</label>
                                <input
                                    type="url"
                                    name="linkedin_link"
                                    value={formData.linkedin_link}
                                    onChange={handleChange}
                                    placeholder="https://linkedin.com/in/username"
                                    className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 border p-2"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                type="button"
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-bold shadow-sm"
                            >
                                Save Changes
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Contact Info</p>
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center">
                                    <span className="w-6 text-slate-400">📧</span>
                                    <span className="text-slate-900">{profile?.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-6 text-slate-400">📱</span>
                                    <span className="text-slate-900">{profile?.mobile_number || 'Not provided'}</span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide">Education</p>
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center">
                                    <span className="w-6 text-slate-400">🏛️</span>
                                    <span className="text-slate-900">{profile?.college || 'Not set'}</span>
                                </div>
                                <div className="flex items-center">
                                    <span className="w-6 text-slate-400">🎓</span>
                                    <span className="text-slate-900">{profile?.degree || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-1 md:col-span-2">
                            <p className="text-sm font-medium text-slate-500 uppercase tracking-wide mb-3">Social Profiles</p>
                            <div className="flex gap-4">
                                {profile?.github_link ? (
                                    <a href={profile.github_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-md hover:bg-slate-900">
                                        GitHub
                                    </a>
                                ) : <span className="text-slate-400 italic">No GitHub Linked</span>}

                                {profile?.linkedin_link ? (
                                    <a href={profile.linkedin_link} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-md hover:bg-blue-800">
                                        LinkedIn
                                    </a>
                                ) : <span className="text-slate-400 italic">No LinkedIn Linked</span>}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
