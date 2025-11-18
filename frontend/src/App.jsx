// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import MainPage from "./mainpage.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import MantUsuarios from "./mantenimientousuarios.jsx";
import MantenimientoProductos from "./mantenimientoproductos.jsx";
import RequireAuth from "./RequireAuth.jsx";
import PublicOnly from "./PublicOnly.jsx";
import DashboardGuarda from "./Dashboardguarda.jsx";
import ProtectedRouteRol from "./ProtectedRouteRol.jsx";

export default function App() {
  return (
    <Routes>
      {/* ===== Rutas públicas ===== */}
      <Route
        path="/login"
        element={
          <PublicOnly>
            <Login />
          </PublicOnly>
        }
      />
      <Route path="/register" element={<Register />} />

      {/* ===== Rutas protegidas (requiere estar logueado) ===== */}
      <Route element={<RequireAuth />}>
        {/* Dashboard ADMIN */}
        <Route path="/" element={<MainPage />} />
        <Route path="/dashboard" element={<MainPage />} />

        {/* Mantenimiento de usuarios – solo Admin */}
        <Route
          path="/mantenimientousuarios"
          element={
            <ProtectedRouteRol roles={["Administrador"]}>
              <MantUsuarios />
            </ProtectedRouteRol>
          }
        />

        {/* Dashboard Guarda Almacén */}
        <Route
          path="/guarda/dashboard"
          element={
            <ProtectedRouteRol roles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}>
              <DashboardGuarda />
            </ProtectedRouteRol>
          }
        />

        {/* Mantenimiento de productos – Guarda Almacén y Admin */}
        <Route
          path="/guarda/productos"
          element={
            <ProtectedRouteRol roles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}>
              <MantenimientoProductos />
            </ProtectedRouteRol>
          }
        />
      </Route>

      {/* ===== Cualquier otra ruta ===== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
