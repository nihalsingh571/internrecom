import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:8000', // Ensure this matches your Django port
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
        if (error.response.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const response = await axios.post('http://localhost:8000/auth/jwt/refresh/', {
                        refresh: refreshToken
                    });
                    localStorage.setItem('access_token', response.data.access);
                    API.defaults.headers.common['Authorization'] = `JWT ${response.data.access}`;
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
