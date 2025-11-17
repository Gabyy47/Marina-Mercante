// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import MainPage from "./mainpage.jsx";
import Login from "./Login.jsx";
import Register from "./Register.jsx";
import MantUsuarios from "./mantenimientousuarios.jsx";
import Inventario from "./inventario.jsx";   
import Proveedores from "./Proveedores.jsx";
import Productos from "./Productos.jsx";
import Kardex from "./Kardex.jsx";
import HistorialKardex from "./HistorialKardex.jsx";
import DetalleCompra from "./DetalleCompra.jsx";


export default function App() {
  return (
    <Routes>
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

      {/* Desconocidas -> home (protegido) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}