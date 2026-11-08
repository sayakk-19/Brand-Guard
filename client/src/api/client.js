import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message
      || (status === 401 ? 'Your session has expired. Please sign in again.'
        : status === 403 ? 'You do not have permission to perform that action.'
          : status >= 500 ? 'BrandGuard could not complete that request. Please try again.'
            : error.code === 'ECONNABORTED' ? 'The request took too long. Please retry.'
              : 'Could not reach the BrandGuard server. Check that the API is running.');
    error.userMessage = message;
    return Promise.reject(error);
  }
);

export default api;
