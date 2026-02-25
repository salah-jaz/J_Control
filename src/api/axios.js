import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
});

/** Origin for API (used to resolve relative image URLs in print, e.g. logo/signature/seal). */
export function getApiOrigin() {
    const base = api.defaults.baseURL;
    if (base && typeof base === 'string') return base.replace(/\/api\/?$/, '') || base;
    return typeof window !== 'undefined' ? window.location.origin : '';
}

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default api;
