import axios from "axios";

function getToken() {
  return localStorage.getItem('token');
}

const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER
    ? import.meta.env.VITE_SERVER + "/api"
    : "/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.method && ['post', 'put', 'patch', 'delete'].includes(config.method)) {
    config.headers['X-Requested-With'] = 'XMLHttpRequest';
  }
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

export const getProcesses = () => api.get("/processes").then((r) => r.data);
export const getProcessById = (id) =>
  api.get(`/processes/${id}`).then((r) => r.data);
export const createProcess = (body) =>
  api.post("/processes", body).then((r) => r.data);
export const updateProcess = (id, body) =>
  api.put(`/processes/${id}`, body).then((r) => r.data);
export const deleteProcess = (id) =>
  api.delete(`/processes/${id}`).then((r) => r.data);
export const startProcess = (id, body) =>
  api.post(`/instances/${id}/start`, body).then((r) => r.data);
export const getInstances = () => api.get("/instances").then((r) => r.data);
export const finishProcess = (instanceId) =>
  api
    .post("/instances/finish", { instance_id: instanceId })
    .then((r) => r.data);
export const getTasks = (userId) =>
  api.get(`/tasks/${userId}`).then((r) => r.data);
export const claimTask = (userId, id) =>
  api.get(`/claim/${userId}/${id}`).then((r) => r.data);
export const completeTask = (stepInstanceId, output) =>
  api
    .post(`/tasks/${stepInstanceId}/complete`, {
      step_instance_id: stepInstanceId,
      output,
    })
    .then((r) => r.data);
