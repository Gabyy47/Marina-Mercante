// src/api.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:49146/api",
  withCredentials: true,
});

// Adjunta el token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Manejo centralizado de respuestas/errores
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    // ruta relativa solicitada (sin el baseURL)
    const reqUrl = (err.config?.url || "").replace(api.defaults.baseURL || "", "");
    const isLoginCall = reqUrl.startsWith("/login"); // <- clave

    // ⚠️ No redirigir si el error viene del login
    if ((status === 401 || status === 403) && !isLoginCall) {
      // Sesión caducada o sin permiso en otras rutas:
      // Opcional: sólo si hay token, lo limpiamos
      if (localStorage.getItem("token")) {
        localStorage.removeItem("token");
      }
      // 🔸 Si quieres redirigir aquí, lo puedes dejar,
      // pero ya no interfiere con el formulario de login.
      // window.location.assign("/login");
    }

    return Promise.reject(err);
  }
);

export default api;
