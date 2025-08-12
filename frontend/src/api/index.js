import axios from 'axios';

// VITE_API_BASE_URL=http://localhost:8080
const API_BASE_URL = import.meta.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

const api=axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('jwtToken');
    const tokenType = localStorage.getItem('tokenType')||'Bearer';
    // console.log('Sending request to:', config.url);
    // console.log('Token:', token);
    if (token && !config.url.includes('/api/auth/login') && !config.url.includes('/api/auth/register')) {
      config.headers.Authorization = `${tokenType} ${token}`;
      // console.log('Authorization header set:', config.headers.Authorization);
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  response => response,
  error => {

    if (error.response && error.response.status === 401) {
      if(error.config && error.config.url.includes('/api/auth/login')){
        return Promise.reject(error);
      }
      console.log("401 Unauthorized received. Token might be expired or invalid.");
      // 自動にログアウト
      localStorage.removeItem('jwtToken');
      localStorage.removeItem('tokenType');
      localStorage.removeItem('userEmail');



      window.dispatchEvent(new Event('storage'));
      // ログインページへ
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;