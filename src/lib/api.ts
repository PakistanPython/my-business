import axios from 'axios';

// Create axios instance with base configuration
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
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

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data: any) => api.put('/auth/profile', data),
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary'),
  getAnalytics: (params?: any) => api.get('/dashboard/analytics', { params }),
  getMetrics: () => api.get('/dashboard/metrics'),
};

export const incomeApi = {
  getAll: (params?: any) => api.get('/income', { params }),
  getById: (id: number) => api.get(`/income/${id}`),
  create: (data: any) => api.post('/income', data),
  update: (id: number, data: any) => api.put(`/income/${id}`, data),
  delete: (id: number) => api.delete(`/income/${id}`),
  getStats: () => api.get('/income/stats/summary'),
};

export const expenseApi = {
  getAll: (params?: any) => api.get('/expenses', { params }),
  getById: (id: number) => api.get(`/expenses/${id}`),
  create: (data: any) => api.post('/expenses', data),
  update: (id: number, data: any) => api.put(`/expenses/${id}`, data),
  delete: (id: number) => api.delete(`/expenses/${id}`),
  getStats: () => api.get('/expenses/stats/summary'),
};

export const purchaseApi = {
  getAll: (params?: any) => api.get('/purchases', { params }),
  getById: (id: number) => api.get(`/purchases/${id}`),
  create: (data: any) => api.post('/purchases', data),
  update: (id: number, data: any) => api.put(`/purchases/${id}`, data),
  delete: (id: number) => api.delete(`/purchases/${id}`),
  getStats: () => api.get('/purchases/stats/summary'),
};

export const charityApi = {
  getAll: (params?: any) => api.get('/charity', { params }),
  getById: (id: number) => api.get(`/charity/${id}`),
  create: (data: any) => api.post('/charity', data),
  update: (id: number, data: any) => api.put(`/charity/${id}`, data),
  delete: (id: number) => api.delete(`/charity/${id}`),
  recordPayment: (data: any) => api.post('/charity/payment', data),
  getStats: () => api.get('/charity/stats/summary'),
};

export const accountApi = {
  getAll: () => api.get('/accounts'),
  getById: (id: number) => api.get(`/accounts/${id}`),
  create: (data: any) => api.post('/accounts', data),
  update: (id: number, data: any) => api.put(`/accounts/${id}`, data),
  delete: (id: number) => api.delete(`/accounts/${id}`),
  transfer: (data: any) => api.post('/accounts/transfer', data),
};

export const loanApi = {
  getAll: (params?: any) => api.get('/loans', { params }),
  getById: (id: number) => api.get(`/loans/${id}`),
  create: (data: any) => api.post('/loans', data),
  update: (id: number, data: any) => api.put(`/loans/${id}`, data),
  delete: (id: number) => api.delete(`/loans/${id}`),
  recordPayment: (id: number, data: any) => api.post(`/loans/${id}/payment`, data),
  getStats: () => api.get('/loans/stats/summary'),
};

export const categoryApi = {
  getAll: (params?: any) => api.get('/categories', { params }),
  getById: (id: number) => api.get(`/categories/${id}`),
  create: (data: any) => api.post('/categories', data),
  update: (id: number, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
  getStats: (id: number) => api.get(`/categories/${id}/stats`),
  getUsageSummary: () => api.get('/categories/usage/summary'),
};
