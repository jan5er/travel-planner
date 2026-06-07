import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:6767/api',
});

// Dodamo interceptor, ki bo samodejno dodajal JWT token v Authorization header, če je token prisoten v localStorage
api.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
});

export default api;