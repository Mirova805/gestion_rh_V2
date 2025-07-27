import axios from 'axios';
import { toast } from 'react-toastify'; 

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401 && !error.config.url.includes('/users/login')) {
      localStorage.removeItem('token');
      toast.warn('Votre session a expiré. Veuillez vous reconnecter.');
      window.location.href = '/login';
    } else if (error.response && error.response.status === 403) {
      toast.error(error.response.data.message || 'Accès refusé. Vous n\'avez pas les permissions nécessaires.');
    } else if (error.response && error.response.status === 429) {
      toast.error(error.response.data.message || 'Trop de requêtes. Veuillez réessayer plus tard.');
    }
    return Promise.reject(error);
  }
);

export default api;