import axios from 'axios';

// In development, Vite proxies /api to the backend.
// In production, set VITE_API_URL to your backend URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ======== Auth API ========
export const authAPI = {
  login: (credentials) => apiClient.post('/api/v1/auth/login', credentials),
  register: (userData) => apiClient.post('/api/v1/auth/register', userData),
  getMe: () => apiClient.get('/api/v1/auth/me'),
  googleLogin: (data) => apiClient.post('/api/v1/auth/google-login', data),
  forgotPassword: (email) => apiClient.post('/api/v1/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => apiClient.post('/api/v1/auth/reset-password', { token, new_password: newPassword }),
};

// ======== Dashboard API ========
export const dashboardAPI = {
  getDashboard: () => apiClient.get('/api/v1/dashboard/'),
};

// ======== Products API ========
export const productsAPI = {
  list: (params) => apiClient.get('/api/v1/products/', { params }),
  getById: (id) => apiClient.get(`/api/v1/products/${id}`),
  create: (data) => apiClient.post('/api/v1/products/', data),
  update: (id, data) => apiClient.put(`/api/v1/products/${id}`, data),
  delete: (id) => apiClient.delete(`/api/v1/products/${id}`),
  getCategories: () => apiClient.get('/api/v1/products/categories/all'),
};

// ======== Pricing API ========
export const pricingAPI = {
  updatePrice: (productId, data) => apiClient.put(`/api/v1/pricing/products/${productId}/price`, data),
  getHistory: (productId, params) => apiClient.get(`/api/v1/pricing/products/${productId}/history`, { params }),
};

// ======== Datasets API ========
export const datasetsAPI = {
  list: () => apiClient.get('/api/v1/datasets/'),
  getStats: () => apiClient.get('/api/v1/datasets/stats'),
};

// ======== Users API ========
export const usersAPI = {
  list: () => apiClient.get('/api/v1/users/'),
  create: (data) => apiClient.post('/api/v1/users/', data),
  toggleStatus: (userId) => apiClient.put(`/api/v1/users/${userId}/status`),
  delete: (userId) => apiClient.delete(`/api/v1/users/${userId}`),
};

// ======== Activity API ========
export const activityAPI = {
  getLogs: (params) => apiClient.get('/api/v1/activity/logs', { params }),
};

// ======== Loaders API ========
export const loadersAPI = {
  loadRetailPricing: () => apiClient.post('/loaders/retail-pricing'),
  uploadRetailPricing: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/loaders/retail-pricing/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  loadEcommerceSales: () => apiClient.post('/loaders/ecommerce-sales'),
  uploadEcommerceSales: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/loaders/ecommerce-sales/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
