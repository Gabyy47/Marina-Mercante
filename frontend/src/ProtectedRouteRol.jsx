// src/ProtectedRouteRol.jsx
import { Navigate } from "react-router-dom";

export default function ProtectedRouteRol({ roles, children }) {
  const raw = localStorage.getItem("mm_user");
  const usuario = raw ? JSON.parse(raw) : null;

  if (!usuario) return <Navigate to="/login" replace />;

  const rolUsuario = (usuario.rol_nombre || "").toLowerCase();
  const rolesNormalizados = roles.map((r) => (r || "").toLowerCase());

  if (!rolesNormalizados.includes(rolUsuario)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

