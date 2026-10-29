import axios from 'axios';
import { setupApiLogging } from '../logger';

function getToken() {
  return localStorage.getItem('token');
}

function buildAuthHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER ? `${import.meta.env.VITE_SERVER}/api` : '/api',
  headers: { 'Content-Type': 'application/json' },
});

setupApiLogging(api);

api.interceptors.request.use((config) => {
  const authHeaders = buildAuthHeaders();

  Object.assign(config.headers, authHeaders, {
    'X-Requested-With': ['post', 'put', 'patch', 'delete'].includes(String(config.method || '').toLowerCase())
      ? 'XMLHttpRequest'
      : config.headers?.['X-Requested-With'] || undefined,
  });

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('fb_token');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const getProcesses = () => api.get('/processes').then((response) => response.data);
export const getProcessById = (id) => api.get(`/processes/${id}`).then((response) => response.data);
export const createProcess = (body) => api.post('/processes', body).then((response) => response.data);
export const updateProcess = (id, body) => api.put(`/processes/${id}`, body).then((response) => response.data);
export const deleteProcess = (id) => api.delete(`/processes/${id}`).then((response) => response.data);
export const startProcess = (id, body) => api.post(`/instances/${id}/start`, body).then((response) => response.data);
export const getInstances = () => api.get('/instances').then((response) => response.data);
export const finishProcess = (instanceId) => api.post('/instances/finish', { instance_id: instanceId }).then((response) => response.data);
export const getTasks = (userId) => api.get(`/tasks/${userId}`).then((response) => response.data);
export const claimTask = (userId, id) => api.get(`/claim/${userId}/${id}`).then((response) => response.data);
export const completeTask = (stepInstanceId, output) =>
  api.post(`/tasks/${stepInstanceId}/complete`, { step_instance_id: stepInstanceId, output }).then((response) => response.data);
