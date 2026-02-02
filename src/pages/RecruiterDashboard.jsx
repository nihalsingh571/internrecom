import { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function RecruiterDashboard() {
    const { user, logout } = useAuth();
    const [profile, setProfile] = useState(null);
    const [internships, setInternships] = useState([]);
    const [loading, setLoading] = useState(true);

    const [selectedInternship, setSelectedInternship] = useState(null);
    const [applicants, setApplicants] = useState([]);

    // Form state
    const [showForm, setShowForm] = useState(false);
    const [newInternship, setNewInternship] = useState({
        title: '',
        description: '',
        location: 'Remote',
        required_skills: '' // Comma separated
    });

    const handleViewApplicants = async (internship) => {
        setSelectedInternship(internship);
        setApplicants([]); // Clear previous
        try {
            const res = await API.get(`/api/internships/${internship.id}/applicants/`);
            setApplicants(res.data);
        } catch (error) {
            console.error("Failed to fetch applicants", error);
            alert("Failed to fetch applicants");
        }
    };

    useEffect(() => {
        if (user?.role === 'RECRUITER') {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
            const profileRes = await API.get('/api/recruiters/me/');
            setProfile(profileRes.data);

            const internRes = await API.get('/api/internships/');
            // Filter for this recruiter is handled by backend queryset? 
            // Wait, InternshipViewSet returns all? 
            // Yes, currently InternshipViewSet returns all. I should filter in frontend for now or update backend.
            // But Recruiter should only see their own on dashboard usually? 
            // Let's assume the backend filters or we filter here.
            // Actually, standard practice: Recruiter sees their own postings.
            // My backend implementation of InternshipViewSet returns all.
            // I'll filter by user id check if possible, but internship has recruiter_id.
            // Let's just list them all for now and mark which are mine, or ideally fix backend later.
            // For now, I will display all but usually we want to see "My Internships".
            // Let's just display all for simplicity of MVP.
            setInternships(internRes.data.filter(i => i.recruiter === profileRes.data.id));
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...newInternship,
                required_skills: newInternship.required_skills.split(',').map(s => s.trim())
            };
            await API.post('/api/internships/', payload);
            setShowForm(false);
            setNewInternship({ title: '', description: '', location: 'Remote', required_skills: '' });
            fetchData(); // Refresh list
        } catch (error) {
            alert('Failed to create internship');
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recruiter Dashboard</h1>
                    <button onClick={logout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Sign out</button>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <div className="mb-8 flex justify-between items-start p-4 bg-white rounded-lg shadow">
                        <div>
                            <h2 className="text-xl font-semibold mb-2">{profile?.company_name || 'Company'}</h2>
                            <p className="text-slate-500">{user?.email}</p>
                        </div>
                        <button
                            onClick={() => setShowForm(!showForm)}
                            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                        >
                            {showForm ? 'Cancel' : 'Post Internship'}
                        </button>
                    </div>

                    {showForm && (
                        <div className="mb-8 p-6 bg-white rounded-lg shadow border border-indigo-100">
                            <h3 className="text-lg font-medium mb-4">New Internship</h3>
                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Job Title</label>
                                    <input
                                        type="text"
                                        required
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                        value={newInternship.title}
                                        onChange={e => setNewInternship({ ...newInternship, title: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Description</label>
                                    <textarea
                                        required
                                        rows={3}
                                        className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                        value={newInternship.description}
                                        onChange={e => setNewInternship({ ...newInternship, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Location</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            value={newInternship.location}
                                            onChange={e => setNewInternship({ ...newInternship, location: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700">Required Skills (comma separated)</label>
                                        <input
                                            type="text"
                                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                                            placeholder="Python, React, Django"
                                            value={newInternship.required_skills}
                                            onChange={e => setNewInternship({ ...newInternship, required_skills: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500">Create</button>
                            </form>
                        </div>
                    )}

                    <h3 className="text-lg font-medium text-slate-900 mb-4">Your Listings</h3>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-slate-200">
                            {internships.map((internship) => (
                                <li key={internship.id} className="transition hover:bg-slate-50">
                                    <div className="px-4 py-4 sm:px-6">
                                        <div className="flex items-center justify-between">
                                            <p className="truncate text-sm font-medium text-indigo-600">{internship.title}</p>
                                            <div className="ml-2 flex flex-shrink-0">
                                                <p className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">Active</p>
                                            </div>
                                        </div>
                                        <div className="mt-2 sm:flex sm:justify-between">
                                            <div className="sm:flex">
                                                <p className="flex items-center text-sm text-slate-500">
                                                    {internship.location}
                                                </p>
                                            </div>
                                            <div className="mt-2 flex items-center text-sm text-slate-500 sm:mt-0">
                                                <button
                                                    onClick={() => handleViewApplicants(internship)}
                                                    className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                                                >
                                                    View Applicants
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {internships.length === 0 && <li className="p-4 text-slate-500 text-center">No internships posted yet.</li>}
                        </ul>
                    </div>

                    {selectedInternship && (
                        <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg border-t-4 border-indigo-500">
                            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-medium leading-6 text-slate-900">Applicants for {selectedInternship.title}</h3>
                                    <p className="mt-1 max-w-2xl text-sm text-slate-500">Ranked by VSPS Score</p>
                                </div>
                                <button onClick={() => setSelectedInternship(null)} className="text-slate-400 hover:text-slate-500">
                                    <span className="sr-only">Close</span>
                                    ✖
                                </button>
                            </div>
                            <div className="border-t border-slate-200">
                                <ul className="divide-y divide-slate-200">
                                    {applicants.map((app) => (
                                        <li key={app.id} className="px-4 py-4 sm:px-6 hover:bg-indigo-50 transition">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-medium text-indigo-600 truncate">{app.applicant_name}</p>
                                                    <p className="text-sm text-slate-500">{app.applicant_email}</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center justify-end space-x-2">
                                                        <span className="text-xs text-slate-500">VSPS Score:</span>
                                                        <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                                                            {app.applicant_vsps?.toFixed(2) || 'N/A'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-400 mt-1">Applied: {new Date(app.applied_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </li>
                                    ))}
                                    {applicants.length === 0 && <li className="p-4 text-slate-500 text-center">No applicants yet.</li>}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
