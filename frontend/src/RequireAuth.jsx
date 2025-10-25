import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const token = localStorage.getItem("token");
  const location = useLocation();

  if (!token) {
    // manda al login y recuerda a dónde quería ir
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />; // deja pasar a las rutas protegidas
}

