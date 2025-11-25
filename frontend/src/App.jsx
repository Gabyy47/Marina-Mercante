<<<<<<< HEAD
// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
=======
//src/app,jsx
import { Routes, Route, Navigate } from "react-router-dom";

>>>>>>> inventario
import MainPage from "./mainpage.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import MantUsuarios from "./mantenimientousuarios.jsx";
<<<<<<< HEAD
import Inventario from "./inventario.jsx";   
import Proveedores from "./Proveedores.jsx";
import Productos from "./Productos.jsx";
import Kardex from "./Kardex.jsx";
import HistorialKardex from "./HistorialKardex.jsx";
import DetalleCompra from "./DetalleCompra.jsx";
=======
import MantenimientoProductos from "./mantenimientoproductos.jsx";
import RequireAuth from "./RequireAuth.jsx";
import DashboardGuarda from "./Dashboardguarda.jsx";
import ProtectedRouteRol from "./ProtectedRouteRol.jsx";
import Proveedores from "./proveedores.jsx";
import Bitacora from "./bitacora.jsx";
import DashboardTickets from "./DashboardTickets.jsx"; 
import MonitorTv from "./MonitorTv.jsx";
import Kiosko from "./kiosko.jsx";

import DetalleCompra from "./DetalleCompra.jsx";
import Compra from "./Compra.jsx";
import Salidas from "./Salidas.jsx";
import DetalleSalidas from "./DetalleSalidas.jsx";
import Inventario from "./inventario.jsx";


>>>>>>> inventario


export default function App() {
  return (
    <Routes>
<<<<<<< HEAD
      {/* Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rutas públicas: acceso sin iniciar sesión */}
      <Route path="/" element={<MainPage />} />
      <Route path="/dashboard" element={<MainPage />} />
      <Route path="/mantenimientousuarios" element={<MantUsuarios />} />
  <Route path="/proveedores" element={<Proveedores />} />
  <Route path="/productos" element={<Productos />} />
  <Route path="/kardex" element={<Kardex />} />
  <Route path="/historial" element={<HistorialKardex />} />
  <Route path="/detalle_compra" element={<DetalleCompra />} />
      <Route path="/inventario" element={<Inventario />} />
=======
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
    <ProtectedRouteRol allowedRoles={["Guarda almacen", "Administrador", "Auxiliar de almacen"]}>
      <Inventario />
    </ProtectedRouteRol>
  }
/>


<Route
  path="/guarda/Compra"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <Compra/>
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
<Route
  path="/guarda/Salidas"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <Salidas/>
    </ProtectedRouteRol>
  }
/>

<Route
  path="/guarda/DetalleSalidas"
  element={
    <ProtectedRouteRol allowedRoles={["Guarda Almacén", "Administrador", "Auxiliar de Almacén"]}>
      <DetalleSalidas />
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
>>>>>>> inventario

      {/* ===== Ruta por defecto ===== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}