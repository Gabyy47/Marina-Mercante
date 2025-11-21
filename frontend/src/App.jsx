//src/app,jsx
import { Routes, Route, Navigate } from "react-router-dom";

import MainPage from "./mainpage.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import MantUsuarios from "./mantenimientousuarios.jsx";
import MantenimientoProductos from "./mantenimientoproductos.jsx";
import RequireAuth from "./RequireAuth.jsx";
import DashboardGuarda from "./Dashboardguarda.jsx";
import ProtectedRouteRol from "./ProtectedRouteRol.jsx";
import Proveedores from "./proveedores.jsx";
import Bitacora from "./bitacora.jsx";
import DashboardTickets from "./DashboardTickets.jsx"; 
import MonitorTv from "./MonitorTv.jsx";
import Kiosko from "./kiosko.jsx";
import Inventario from "./inventario.jsx";
import Inventariostatus from "./inventariostatus.jsx";
import HistorialKardex from "./HistorialKardex.jsx";
import DetalleCompra from "./DetalleCompra.jsx";



export default function App() {
  return (
    <Routes>
      {/* ===== Rutas públicas ===== */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Estas dos NO deben requerir login */}
      <Route path="/monitor" element={<MonitorTv />} />
      <Route path="/kiosko" element={<Kiosko />} />

      {/* ===== Rutas protegidas ===== */}
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


        {/* Dashboard Guarda */}
        <Route
          path="/guarda/dashboard"
          element={
            <ProtectedRouteRol
              roles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}
            >
              <DashboardGuarda />
            </ProtectedRouteRol>
          }
        />

        {/* Productos */}
        <Route
          path="/guarda/productos"
          element={
            <ProtectedRouteRol
              roles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}
            >
              <MantenimientoProductos />
            </ProtectedRouteRol>
          }
        />

        <Route
  path="/guarda/proveedores"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}>
      <Proveedores />
    </ProtectedRouteRol>
  }
/>
<Route
  path="/guarda/inventario"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <Inventario />
    </ProtectedRouteRol>
  }
/>
<Route
  path="/guarda/inventariostatus"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}>
      <Inventariostatus />
    </ProtectedRouteRol>
  }
/>
<Route
  path="/guarda/HistorialKardex"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <HistorialKardex />
    </ProtectedRouteRol>
  }
/>
<Route
  path="/guarda/DetalleCompra"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <DetalleCompra />
    </ProtectedRouteRol>
  }
/>

        {/* Proveedores */}
        <Route path="/proveedores" element={<Proveedores />} />

        {/* Bitácora (sin tilde en la ruta) */}
        <Route path="/bitacora" element={<Bitacora />} />

        {/* 🎫 Dashboard de Tickets */}
        <Route
          path="/tickets/dashboard"
          element={
            <ProtectedRouteRol
              roles={["Atención Tickets"]}
            >
              <DashboardTickets />
            </ProtectedRouteRol>
          }
        />
      </Route>

      {/* ===== Ruta por defecto ===== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}