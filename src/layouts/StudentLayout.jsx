import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

export default function StudentLayout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const navigation = [
        { name: 'Dashboard', href: '/student/dashboard' },
        { name: 'Profile', href: '/student/profile' },
        { name: 'Skills', href: '/student/skills' },
        { name: 'Internships', href: '/student/internships' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-64 bg-white shadow-md z-10 flex flex-col">
                <div className="p-6 border-b border-slate-100">
                    <h1 className="text-2xl font-bold text-indigo-600">InternRecom</h1>
                    <p className="text-xs text-slate-500 mt-1">Student Portal</p>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive(item.href)
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                        >
                            {item.name}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-100">
                    <div className="mb-4 px-2">
                        <p className="text-sm font-medium text-slate-800">{user?.first_name || 'Student'}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="w-full flex items-center justify-center bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 overflow-auto p-4 md:p-8">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <Outlet />
                </motion.div>
            </main>
        </div>
    );
}
