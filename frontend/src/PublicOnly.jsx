import { Navigate } from "react-router-dom";

export default function PublicOnly({ children }) {
  const token = localStorage.getItem("token");
  return token ? <Navigate to="/" replace /> : children;
}
