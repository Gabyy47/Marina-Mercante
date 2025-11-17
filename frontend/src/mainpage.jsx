import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

// Componentes de las vistas
const Dashboard = () => <h2>Salpicadero</h2>;
const Settings = () => <h2>Configuración</h2>;
const MantenimientoUsuarios = () => <h2>Mantenimiento de Usuario</h2>;

const MainPage = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const navigate = useNavigate(); // 👈 para redirigir al cerrar sesión

  // Función para cerrar sesión
  const handleLogout = () => {
    localStorage.removeItem("token"); // elimina el token del login
    navigate("/login", { replace: true }); // redirige al login
  };

  // Función para renderizar la vista actual
  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;
      case "settings":
        return <Settings />;
      case "mantenimientousuarios":
        return <MantenimientoUsuarios />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="d-flex">
      {/* Menú lateral */}
      <nav className="bg-dark text-white vh-100 p-3" style={{ width: "250px" }}>
        <h2 className="text-center mb-4">Menú</h2>
        <ul className="nav flex-column">
          <li className="nav-item">
            <button
              className={`nav-link btn text-white ${
                activeView === "dashboard" ? "active" : ""
              }`}
              onClick={() => setActiveView("dashboard")}
            >
              Salpicadero
            </button>
          </li>

          <li className="nav-item">
            <button
              className={`nav-link btn text-white ${
                activeView === "users" ? "active" : ""
              }`}
              onClick={() => setActiveView("users")}
            >
              Usuarios
            </button>
          </li>

          <li className="nav-item">
            <Link
              to="/inventario"
              className="nav-link text-white"
              onClick={() => setActiveView("inventario")}
            >
              Inventario
            </Link>
          </li>

          <li className="nav-item">
            <button
              className={`nav-link btn text-white ${
                activeView === "settings" ? "active" : ""
              }`}
              onClick={() => setActiveView("settings")}
            >
              Configuración
            </button>
          </li>

          <li className="nav-item">
            <Link
              to="/mantenimientousuarios"
              className="nav-link text-white"
              onClick={() => setActiveView("mantenimientousuarios")}
            >
              Mantenimiento de Usuarios
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/productos"
              className="nav-link text-white"
              onClick={() => setActiveView("productos")}
            >
              Productos
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/proveedores"
              className="nav-link text-white"
              onClick={() => setActiveView("proveedores")}
            >
              Proveedores
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/kardex"
              className="nav-link text-white"
              onClick={() => setActiveView("kardex")}
            >
              Kardex
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/historial"
              className="nav-link text-white"
              onClick={() => setActiveView("historial")}
            >
              Historial Kardex
            </Link>
          </li>

          <li className="nav-item">
            <Link
              to="/detalle_compra"
              className="nav-link text-white"
              onClick={() => setActiveView("detalle_compra")}
            >
              Detalle Compra
            </Link>
          </li>

          {/* 👇 Aquí agregamos el botón de cerrar sesión */}
          <li className="nav-item mt-4">
            <button
              className="btn btn-outline-light w-100"
              onClick={handleLogout}
            >
              Cerrar sesión
            </button>
          </li>
        </ul>
      </nav>

      {/* Área de contenido principal */}
      <div className="flex-grow-1 p-4">{renderView()}</div>
    </div>
  );
};

export default MainPage;
