import { createContext, useState, useEffect, useContext } from 'react';
import { jwtDecode } from 'jwt-decode';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                // Fetch full user profile? Or just use decoded data if sufficient.
                // For now, let's fetch 'me' endpoint or just rely on decoded logic if custom claims exist.
                // Djoser /users/me/ gives user info.
                const response = await API.get('/auth/users/me/');
                setUser(response.data);
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    };

    const login = async (email, password) => {
        try {
            const response = await API.post('/auth/jwt/create/', { email, password });
            const { access, refresh } = response.data;
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            await checkUser();

            // Redirect based on role
            const userRes = await API.get('/auth/users/me/');
            const role = userRes.data.role;
            if (role === 'APPLICANT') navigate('/student/dashboard');
            else if (role === 'RECRUITER') navigate('/recruiter');
            else if (role === 'ADMIN') navigate('/admin');
            else navigate('/');

            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Login failed' };
        }
    };

    const signup = async (userData) => {
        try {
            // Djoser /users/ endpoint
            await API.post('/auth/users/', userData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data };
        }
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
        navigate('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
