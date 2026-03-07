const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const getToken = () => localStorage.getItem('token');
export const setToken = (t) => localStorage.setItem('token', t);
export const clearToken = () => localStorage.removeItem('token');

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export const authAPI = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  me: () => request('/auth/me'),
};
export const assetsAPI = {
  getAll: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/assets${q ? '?' + q : ''}`); },
  getOne: (id) => request(`/assets/${id}`),
  create: (data) => request('/assets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/assets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => request(`/assets/${id}`, { method: 'DELETE' }),
};
export const assignmentsAPI = {
  getAll: (params = {}) => { const q = new URLSearchParams(params).toString(); return request(`/assignments${q ? '?' + q : ''}`); },
  create: (data) => request('/assignments', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/assignments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
};
export const maintenanceAPI = {
  getAll: () => request('/maintenance'),
  create: (data) => request('/maintenance', { method: 'POST', body: JSON.stringify(data) }),
};
export const categoriesAPI = {
  getAll: () => request('/categories'),
  create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/categories/${id}`, { method: 'DELETE' }),
};
export const reportsAPI = {
  byCategory: () => request('/reports/assets-by-category'),
  byStatus: () => request('/reports/assets-by-status'),
  monthlyAssignments: () => request('/reports/monthly-assignments'),
  topAssigned: () => request('/reports/top-assigned-assets'),
};