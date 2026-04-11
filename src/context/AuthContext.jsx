import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import API from '../services/api';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const navigateByRole = useCallback(
        (role) => {
            if (role === 'APPLICANT') navigate('/student/dashboard');
            else if (role === 'RECRUITER') navigate('/recruiter');
            else if (role === 'ADMIN') navigate('/admin');
            else navigate('/');
        },
        [navigate]
    );

    const fetchCurrentUser = useCallback(async () => {
        const response = await API.get('/auth/users/me/');
        setUser(response.data);
        return response.data;
    }, []);

    const finalizeAuthenticatedSession = useCallback(async () => {
        try {
            const profile = await fetchCurrentUser();
            if (profile?.role) {
                navigateByRole(profile.role);
            } else {
                navigate('/');
            }
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Unable to complete login.' };
        }
    }, [fetchCurrentUser, navigate, navigateByRole]);

    const logout = useCallback(
        (shouldRedirect = true) => {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            setUser(null);
            if (shouldRedirect) navigate('/login');
        },
        [navigate]
    );

    const checkUser = useCallback(async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                await fetchCurrentUser();
            } catch (error) {
                logout();
            }
        }
        setLoading(false);
    }, [fetchCurrentUser, logout]);

    useEffect(() => {
        checkUser();
    }, [checkUser]);

    const login = async (email, password, recaptchaToken) => {
        try {
            const response = await API.post('/auth/social/login/', { email, password, recaptchaToken });
            const twoFactorRequired = response.data?.two_factor_required || response.data?.['2fa_required'];
            if (twoFactorRequired) {
                return { success: false, twoFactorRequired: true, userId: response.data.user_id };
            }

            const { access, refresh } = response.data;
            if (access && refresh) {
                localStorage.setItem('access_token', access);
                localStorage.setItem('refresh_token', refresh);
            }

            const sessionResult = await finalizeAuthenticatedSession();
            if (!sessionResult.success) {
                return sessionResult;
            }

            return {
                ...sessionResult,
                twoFactorSetupRequired: Boolean(response.data?.two_factor_setup_required),
                twoFactorSetupDetail: response.data?.detail,
            };
        } catch (error) {
            const detail = error.response?.data?.detail;
            if (error.response?.status === 403 && detail?.toLowerCase().includes('two-factor authentication is required')) {
                return {
                    success: false,
                    error: 'Two-factor authentication must be enabled before you can continue. Visit the Security Center to finish setup.',
                    twoFactorEnforced: true,
                };
            }
            return { success: false, error: detail || 'Login failed' };
        }
    };

    const socialLogin = async (accessToken, refreshToken) => {
        if (!accessToken || !refreshToken) {
            return { success: false, error: 'Missing credentials from provider.' };
        }
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        const result = await finalizeAuthenticatedSession();
        if (!result.success) {
            logout();
        }
        return result;
    };

    const signup = async (userData) => {
        try {
            await API.post('/auth/users/', userData);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data };
        }
    };

    const verifyLoginOtp = async (userId, code) => {
        try {
            const response = await API.post('/api/auth/verify-login-otp/', { user_id: userId, code });
            const { access, refresh } = response.data;
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            return finalizeAuthenticatedSession();
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Verification failed' };
        }
    };

    const startTwoFactorSetup = async () => {
        try {
            const response = await API.post('/api/auth/enable-2fa/');
            await fetchCurrentUser();
            return { success: true, data: response.data };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Unable to start two-factor setup.' };
        }
    };

    const confirmTwoFactorSetup = async (code) => {
        try {
            await API.post('/api/auth/verify-2fa/', { code });
            await fetchCurrentUser();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Invalid verification code.' };
        }
    };

    const disableTwoFactor = async () => {
        try {
            await API.post('/api/auth/disable-2fa/');
            await fetchCurrentUser();
            return { success: true };
        } catch (error) {
            return { success: false, error: error.response?.data?.detail || 'Unable to disable two-factor authentication.' };
        }
    };

    const refreshUser = useCallback(async () => {
        try {
            return await fetchCurrentUser();
        } catch (error) {
            return null;
        }
    }, [fetchCurrentUser]);

    return (
        <AuthContext.Provider
            value={{
                user,
                loading,
                login,
                signup,
                logout,
                socialLogin,
                verifyLoginOtp,
                startTwoFactorSetup,
                confirmTwoFactorSetup,
                disableTwoFactor,
                refreshUser,
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};
