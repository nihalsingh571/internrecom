import { useEffect, useState } from 'react';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
    const { user, logout } = useAuth();
    const [recruiters, setRecruiters] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchData = async () => {
        try {
            // Fetch all recruiters (Need an endpoint for this, assuming generic list for now)
            // I need to ensure Admin can list all recruiters. 
            // RecruiterProfileViewSet returns all if not recruiter role?
            // Check RecruiterProfileViewSet:
            /*
              def get_queryset(self):
                   if self.request.user.role == User.Role.RECRUITER:
                      return RecruiterProfile.objects.filter(user=self.request.user)
                   return RecruiterProfile.objects.all()
            */
            // Yes, Admin (not RECRUITER) will see all.
            const res = await API.get('/api/recruiters/');
            setRecruiters(res.data);
        } catch (error) {
            console.error("Failed to fetch admin data", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleVerification = async (id, currentStatus) => {
        try {
            await API.patch(`/api/recruiters/${id}/`, { is_verified: !currentStatus });
            setRecruiters(recruiters.map(r => r.id === id ? { ...r, is_verified: !currentStatus } : r));
        } catch (error) {
            alert("Failed to update verification status");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading...</div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Dashboard</h1>
                    <button onClick={logout} className="text-sm font-semibold text-indigo-600 hover:text-indigo-500">Sign out</button>
                </div>
            </header>
            <main>
                <div className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
                    <h2 className="text-xl font-semibold mb-4 text-slate-900">Recruiter Verification</h2>
                    <div className="bg-white shadow overflow-hidden sm:rounded-md">
                        <ul className="divide-y divide-slate-200">
                            {recruiters.map((recruiter) => (
                                <li key={recruiter.id}>
                                    <div className="px-4 py-4 sm:px-6 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-indigo-600">{recruiter.company_name}</p>
                                            <p className="text-sm text-slate-500">{recruiter.email}</p>
                                            <a href={recruiter.company_website} target="_blank" rel="noreferrer" className="text-xs text-slate-400 hover:text-indigo-500">{recruiter.company_website}</a>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${recruiter.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {recruiter.is_verified ? 'Verified' : 'Pending'}
                                            </span>
                                            <button
                                                onClick={() => toggleVerification(recruiter.id, recruiter.is_verified)}
                                                className="text-sm text-indigo-600 hover:text-indigo-900"
                                            >
                                                {recruiter.is_verified ? 'Revoke' : 'Verify'}
                                            </button>
                                        </div>
                                    </div>
                                </li>
                            ))}
                            {recruiters.length === 0 && <li className="p-4 text-slate-500 text-center">No recruiters found.</li>}
                        </ul>
                    </div>
                </div>
            </main>
        </div>
    );
}
