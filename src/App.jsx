import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Signup from './pages/Signup';
import StudentLayout from './layouts/StudentLayout';
import StudentHome from './pages/StudentHome';
import StudentProfile from './pages/StudentProfile';
import StudentSkills from './pages/StudentSkills';
import StudentInternships from './pages/StudentInternships';
import RecruiterDashboard from './pages/RecruiterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Assessment from './pages/Assessment'; // New Import
import { useAuth } from './context/AuthContext';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/" replace />; // Or forbidden page
    }

    return children;
};

function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Student Routes */}
            <Route
                path="/student"
                element={
                    <ProtectedRoute allowedRoles={['APPLICANT']}>
                        <StudentLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<StudentHome />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="skills" element={<StudentSkills />} />
                <Route path="internships" element={<StudentInternships />} />
            </Route>

            {/* Assessment - Separate Layout for Proctoring */}
            <Route
                path="/student/assessment"
                element={
                    <ProtectedRoute allowedRoles={['APPLICANT']}>
                        <Assessment />
                    </ProtectedRoute>
                }
            />

            {/* Recruiter Routes */}
            <Route
                path="/recruiter"
                element={
                    <ProtectedRoute allowedRoles={['RECRUITER']}>
                        <RecruiterDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            {/* Default Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
        </Routes>
    );
}

export default App;
