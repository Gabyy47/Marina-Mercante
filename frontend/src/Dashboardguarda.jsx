// src/DashboardGuarda.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdInventory2, MdLogout, MdHome,} from "react-icons/md";
import api from "./api";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,} from "recharts";
import "./mainpage.css"; // el mismo que usa tu dashboard admin
import "./Dashboardguarda.css";
import PerfilModal from "./perfilmodal";
import Proveedores from "./proveedores.jsx";
import Inventario from "./inventario.jsx";
import Inventariostatus from "./inventariostatus.jsx";
import HistorialKardex from "./HistorialKardex.jsx";
import DetalleCompra from "./DetalleCompra.jsx";


export default function DashboardGuarda() {
  const navigate = useNavigate();
  const [usuario, setUsuario] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  // Cargar usuario logueado
  useEffect(() => {
    const raw = localStorage.getItem("mm_user");
    if (raw) setUsuario(JSON.parse(raw));
  }, []);

  // Cargar productos reales de la API
  useEffect(() => {
    const cargar = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/productos"); // ← /api/productos
        setProductos(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar los productos.");
      } finally {
        setLoading(false);
      }
    };
    cargar();
  }, []);

  // ===== Métricas reales =====
  const totalProductos = productos.length;

  const totalMinima = productos.reduce(
    (acc, p) => acc + Number(p.cantidad_minima || 0),
    0
  );
  const totalMaxima = productos.reduce(
    (acc, p) => acc + Number(p.cantidad_maxima || 0),
    0
  );

  // Datos para la gráfica: un registro por producto
  const chartData = productos.map((p) => ({
    nombre: p.nombre_producto,
    minima: Number(p.cantidad_minima || 0),
    maxima: Number(p.cantidad_maxima || 0),
  }));

  // Últimos 5 productos (los más nuevos primero porque el SELECT viene DESC)
  const ultimosProductos = productos.slice(0, 5);

  const handleLogout = () => {
    localStorage.removeItem("mm_user");
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const [showPerfil, setShowPerfil] = useState(false);

  return (
    <div className="mm-layout">
      {/* === SIDEBAR (igual estilo que admin, pero con menos opciones) === */}
      <aside className="mm-sidebar">
        <div className="mm-logo">
          <img src={logoDGMM} alt="DGMM" />
          <span>NAVI-MASTER</span>
        </div>

        <nav className="mm-menu">
          <button
            className="mm-menu-item mm-menu-item--active"
            onClick={() => navigate("/guarda/dashboard")}
          >
            <MdHome />
            <span>Panel principal</span>
          </button>

          <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento de Productos</span>
          </button>
        

        <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento proveedores</span>
          </button>
        <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento inventario</span>
          </button>

          <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento Inventariostatus</span>
          </button>
          <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento HistorialKardex</span>
          </button>
          <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento DetalleCompra</span>
          </button>

          <button
            className="mm-menu-item"
            onClick={() => navigate("/guarda/productos")}
          >
            <MdInventory2 />
            <span>Mantenimiento cliente</span>
          </button>
        </nav>

        <button className="mm-logout" onClick={handleLogout}>
          <MdLogout />
          <span>Cerrar sesión</span>
        </button>
      </aside>

      {/* === CONTENIDO PRINCIPAL === */}
      <main className="mm-main">
        {/* Barra superior similar a la del admin */}
        <header className="mm-main-header">
          <h1>PANEL PRINCIPAL</h1>
          <div className="mm-header-right">
            <button className="mm-pill">Notificaciones</button>
            <button className="mm-pill">
              👤 {usuario?.nombre_usuario || "Guarda Almacén"}
            </button>
            <button onClick={() => setShowPerfil(true)}>Mi Perfil</button>
                     <PerfilModal
                    open={showPerfil}
                    onClose={() => setShowPerfil(false)}
                      onSaved={() => {}}
                       />
          </div>
        </header>

        <section className="mm-main-content">
          {/* Tarjetas de métricas */}
          <div className="grid grid--stats">
            <div className="stat-card">
              <div className="stat-icon">📦</div>
              <div className="stat-texts">
                <div className="stat-label">Total de Productos</div>
                <div className="stat-value">{totalProductos}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⬇️</div>
              <div className="stat-texts">
                <div className="stat-label">Suma Cantidad Mínima</div>
                <div className="stat-value">{totalMinima}</div>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">⬆️</div>
              <div className="stat-texts">
                <div className="stat-label">Suma Cantidad Máxima</div>
                <div className="stat-value">{totalMaxima}</div>
              </div>
            </div>
          </div>

          {/* Gráfica + tabla */}
          <div className="grid grid--charts">
            {/* Gráfica de barras por producto */}
            <div className="chart-card">
              <h2>Cantidades mínima y máxima por producto</h2>
              {loading ? (
                <p>Cargando gráfica…</p>
              ) : chartData.length === 0 ? (
                <p>No hay datos para mostrar.</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <XAxis dataKey="nombre" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="minima" name="Cantidad mínima" />
                    <Bar dataKey="maxima" name="Cantidad máxima" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Tabla de últimos productos */}
            <div className="chart-card">
              <h2>Últimos productos registrados</h2>
              {ultimosProductos.length === 0 ? (
                <p>No hay productos registrados.</p>
              ) : (
                <table className="mm-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Cant. mínima</th>
                      <th>Cant. máxima</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimosProductos.map((p) => (
                      <tr key={p.id_producto}>
                        <td>{p.id_producto}</td>
                        <td>{p.nombre_producto}</td>
                        <td>{p.cantidad_minima}</td>
                        <td>{p.cantidad_maxima}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <button
                className="mm-link-table"
                onClick={() => navigate("/guarda/productos")}
              >
                Ver todos los productos
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
