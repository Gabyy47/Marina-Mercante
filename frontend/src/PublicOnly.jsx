// src/PublicOnly.jsx
import { Navigate, useLocation } from "react-router-dom";

/**
 * Evitarque usuarios autenticados entren a rutas públicas (login/registro).
 * - Si hay sesión: redirige a `redirectTo` (por defecto "/").
 * - Si NO hay sesión: renderiza `children`.*/
 
export default function PublicOnly({ children, redirectTo = "/" }) {
  const location = useLocation();

  // ---- Ajusta esta lógica a tu app ----
  // Consideramos autenticado si existe un token o un usuario en localStorage.
  const token = localStorage.getItem("token");
  const usuario = localStorage.getItem("usuario"); // {id_usuario, rol_nombre, ...}

  const isLogged = Boolean(token || usuario);

  if (isLogged) {
    // Si ya está logueado, lo mandamos a la home (o a lo que prefieras)
    return <Navigate to={redirectTo} replace state={{ from: location }} />;
  }

  // Si no está logueado, dejamos pasar a la ruta pública
  return children;
}
