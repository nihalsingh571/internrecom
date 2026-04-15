import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const API = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the token
API.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `JWT ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Add a response interceptor to handle token refresh (optional specifically for djoser, simpler to just logout on 401 for now)
API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Prevent infinite loop if refresh fails
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    // Use the same baseURL logic for refresh
                    const response = await axios.post(`${baseURL}/auth/jwt/refresh/`, {
                        refresh: refreshToken
                    });
                    const newAccessToken = response.data.access;
                    localStorage.setItem('access_token', newAccessToken);
                    API.defaults.headers.common['Authorization'] = `JWT ${newAccessToken}`;
                    if (originalRequest.headers) {
                        originalRequest.headers.Authorization = `JWT ${newAccessToken}`;
                    }
                    return API(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, logout
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('refresh_token');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }
        }
        return Promise.reject(error);
    }
);

export default API;
