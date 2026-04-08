import { api } from './client';
import type { AuthUser } from '../store/auth.store';

interface LoginResponse {
  data: {
    accessToken: string;
    user: AuthUser;
  };
}

interface RefreshResponse {
  data: { accessToken: string };
}

export const authApi = {
  login: (email: string, password: string, rememberMe?: boolean) =>
    api.post<LoginResponse>('/auth/login', { email, password, rememberMe }),

  logout: () => api.post('/auth/logout'),

  refresh: () => api.post<RefreshResponse>('/auth/refresh'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

export const attendanceApi = {
  checkIn: (payload: { location?: { lat: number; lng: number }; method?: string }) =>
    api.post('/attendance/check-in', payload),

  checkOut: (payload: { location?: { lat: number; lng: number }; method?: string }) =>
    api.post('/attendance/check-out', payload),

  getToday: () => api.get('/attendance/today'),

  getHistory: (params: Record<string, string | number | undefined>) =>
    api.get('/attendance/history', { params }),

  getAll: (params: Record<string, string | number | undefined>) =>
    api.get('/attendance', { params }),

  getById: (id: string) => api.get(`/attendance/${id}`),

  correct: (id: string, payload: { checkIn?: string; checkOut?: string; reason: string }) =>
    api.patch(`/attendance/${id}`, payload),

  getSummary: (employeeId: string, month: string) =>
    api.get(`/attendance/summary/${employeeId}`, { params: { month } }),
};

export const employeesApi = {
  list: (params: Record<string, string | number | undefined>) =>
    api.get('/employees', { params }),

  getMe: () => api.get('/employees/me'),

  updateMe: (data: Record<string, string>) =>
    api.patch('/employees/me', data),

  uploadPhoto: (profilePhoto: string) =>
    api.patch('/employees/me', { profilePhoto }),

  getById: (id: string) => api.get(`/employees/${id}`),

  create: (data: Record<string, unknown>) =>
    api.post('/employees', data),

  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/employees/${id}`, data),

  deactivate: (id: string) => api.delete(`/employees/${id}`),

  unlock: (id: string) => api.post(`/employees/${id}/unlock`),
};

export const reportsApi = {
  monthly: (params: Record<string, string | undefined>) =>
    api.get('/reports/monthly', { params }),

  department: (params: Record<string, string | undefined>) =>
    api.get('/reports/department', { params }),

  exportCsv: (params: Record<string, string | undefined>) =>
    api.get('/reports/export', { params, responseType: 'blob' }),
};

export const shiftsApi = {
  list: () => api.get('/shifts'),
};
