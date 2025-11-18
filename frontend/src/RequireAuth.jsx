// src/RequireAuth.jsx
import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function RequireAuth() {
  const token = localStorage.getItem("token");
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc }} />;
  return <Outlet />;
}


