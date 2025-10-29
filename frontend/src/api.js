// frontend/src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:49146/api", // asegúrate de tener /api aquí
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
