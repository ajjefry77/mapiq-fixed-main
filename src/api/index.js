import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_SERVER
    ? import.meta.env.VITE_SERVER + "/api"
    : "/api",
  headers: { "Content-Type": "application/json" },
});

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
