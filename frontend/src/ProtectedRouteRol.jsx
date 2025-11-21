// src/ProtectedRouteRol.jsx
import { Navigate } from "react-router-dom";

function normalizarRol(str = "") {
  return str
    .toLowerCase()
    .replace(/á/g, "a")
    .replace(/é/g, "e")
    .replace(/í/g, "i")
    .replace(/ó/g, "o")
    .replace(/ú/g, "u");
}

export default function ProtectedRouteRol({ roles = [], allowedRoles = [], children }) {
  // Soportar ambas props: roles y allowedRoles
  const listaOriginal = roles.length ? roles : allowedRoles;

  // Normalizamos la lista de roles permitidos
  const rolesPermitidos = listaOriginal.map(normalizarRol);

  const rawUser = localStorage.getItem("mm_user");
  const user = rawUser ? JSON.parse(rawUser) : null;

  const rolUsuario = user?.rol_nombre || "";
  const rolNorm = normalizarRol(rolUsuario);

  // Nuestros 3 roles oficiales:
  // "Guarda Almacén", "Administrador", "Auxiliar de Almacén"
  const ROL_GUARDA   = normalizarRol("Guarda Almacén");       // "guarda almacen"
  const ROL_ADMIN    = normalizarRol("Administrador");        // "administrador"
  const ROL_AUX      = normalizarRol("Auxiliar de almacén");  // "auxiliar de almacen"

  const estaPermitido = rolesPermitidos.includes(rolNorm);

  if (!estaPermitido) {
    // Si es guarda o auxiliar → mándalo a dashboard de guarda
    if (rolNorm === ROL_GUARDA || rolNorm === ROL_AUX) {
      return <Navigate to="/guarda/dashboard" replace />;
    }

    // Si es admin → mándalo al dashboard administrador
    if (rolNorm === ROL_ADMIN) {
      return <Navigate to="/dashboard" replace />;
    }

    // Si no tiene rol o no coincide → fuera
    return <Navigate to="/login" replace />;
  }

  return children;
}
