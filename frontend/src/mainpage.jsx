import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mainpage.css";

import MantenimientoUsuarios from "./mantenimientousuarios";
import MantenimientoProductos from "./mantenimientoproductos";
import MantenimientoRol from "./mantenimientorol";
import MantenimientoTickets from"./mantenimientotickets";
import Bitacora from "./bitacora";
import PerfilModal from "./perfilmodal";
import Tramites from "./MantTramites.jsx";
import Proveedores from "./proveedores.jsx";
import Inventario from "./inventario.jsx";
import Inventariostatus from "./inventariostatus.jsx";
import HistorialKardex from "./HistorialKardex.jsx";
import DetalleCompra from "./DetalleCompra.jsx";






import { FiHome, FiUsers, FiSettings, FiLogOut } from "react-icons/fi";

/* ======================= SIDEBAR ======================= */
const Sidebar = ({ activeView, onSelect, onLogout }) => (
  <aside className="sb">
    <div className="sb__brand">
      <img src={logo} alt="DGMM" />
      <span>NAVI-MASTER</span>
    </div>

    <nav className="sb__nav">

      <button
        className={`sb__link ${activeView === "dashboard" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("dashboard")}
      >
        <FiHome /> <span>Panel principal</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientousuarios" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientousuarios")}
      >
        <FiUsers /> <span>Usuarios</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientoproductos" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientoproductos")}
      >
        <FiUsers /> <span>Productos</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientorol" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientorol")}
      >
        <FiUsers /> <span>Roles</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientotickets" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientotickets")}
      >
        <FiUsers /> <span>Tickets</span>
      </button>

      <button
        className={`sb__link ${activeView === "MantTramites" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("MantTramites")}
      >
        <FiUsers /> <span>Tramites</span>
      </button>

      <button
        className={`sb__link ${activeView === "bitacora" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("bitacora")}
      >
        <FiUsers /> <span>Bitácora</span>
      </button>

      <button
        className={`sb__link ${activeView === "proveedores" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("proveedores")}
      >
        <FiUsers /> <span>Proveedores</span>
      </button>

      <button
        className={`sb__link ${activeView === "inventario" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("inventario")}
      >
        <FiUsers /> <span>Inventario</span>
      </button>

      <button
        className={`sb__link ${activeView === "inventariostatus" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("inventariostatus")}
      >
        <FiUsers /> <span>InventarioStatus</span>
      </button>

      <button
        className={`sb__link ${activeView === "HistorialKardex" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("HistorialKardex")}
      >
        <FiUsers /> <span>HistorialKardex</span>
      </button>

      <button
        className={`sb__link ${activeView === "DetalleCompra" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("DetalleCompra")}
      >
        <FiUsers /> <span>DetalleCompra</span>
      </button>
      
      <button
        className={`sb__link ${activeView === "settings" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("settings")}
      >
        <FiSettings /> <span>Configuración</span>
      </button>

      <button className="sb__link" onClick={onLogout}>
        <FiLogOut /> <span>Cerrar sesión</span>
      </button>
    </nav>
  </aside>
);

/* ======================= TOPBAR ======================= */
const Topbar = () => {
  const [user, setUser] = useState(null);
  const [showPerfil, setShowPerfil] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("mm_user") || "null");
    setUser(u);

    const listener = (e) => {
      if (e.key === "mm_user") {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", listener);
    return () => window.removeEventListener("storage", listener);
  }, []);

  const nombre = user?.nombre ?? user?.nombre_usuario ?? "USUARIO";
  const rol = user?.rol_nombre ? ` (${user.rol_nombre})` : "";

  return (
    <header className="tb">
      <div className="tb__title">PANEL PRINCIPAL</div>
      <div className="tb__right">
        <button className="tb__btn">Notificaciones</button>
        <div className="tb__user">👤 {nombre}{rol}</div>
        <button className="tb__btn">🌐 ES</button>
        <button onClick={() => setShowPerfil(true)}>Mi Perfil</button>

        <PerfilModal
          open={showPerfil}
          onClose={() => setShowPerfil(false)}
          onSaved={() => {}}
        />
      </div>
    </header>
  );
};

/* ======================= COMPONENTES DE DASHBOARD ======================= */
const StatCard = ({ icon, label, value }) => (
  <div className="card stat">
    <div className="stat__icon">{icon}</div>
    <div className="stat__body">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  </div>
);

const BarChart = ({ seriesA = [2, 3, 6, 2, 4, 7], seriesB = [1, 2, 3, 1.8, 2.5, 5] }) => (
  <div className="card chart">
    <div className="card__head">Actividad Semanal</div>
    <div className="bars">
      {seriesA.map((a, i) => {
        const b = seriesB[i] ?? 0;
        return (
          <div className="bars__group" key={i}>
            <div className="bar bar--a" style={{ "--h": `${a * 6}%` }} />
            <div className="bar bar--b" style={{ "--h": `${b * 6}%` }} />
            <div className="bars__label">{i + 1}</div>
          </div>
        );
      })}
    </div>
  </div>
);

const PieChart = ({ slices = [60, 25, 15] }) => {
  const total = slices.reduce((s, v) => s + v, 0);
  const [a, b] = slices.map((v) => (v / total) * 360);

  const bg = `conic-gradient(
    var(--cyan) 0 ${a}deg,
    var(--navy-30) ${a}deg ${a + b}deg,
    var(--navy-60) ${a + b}deg 360deg
  )`;

  return (
    <div className="card chart">
      <div className="card__head">Módulos más usados</div>
      <div className="pie" style={{ background: bg }} />
    </div>
  );
};

const RecentTable = () => (
  <div className="card table">
    <div className="card__head">Actividad Reciente</div>
    <div className="table__wrap">
      <table>
        <thead>
          <tr>
            <th>Acción</th>
            <th>Módulo</th>
            <th>Usuario</th>
            <th>Fecha</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>Cambio de rol</td><td>Usuarios</td><td>ADMIN</td><td>10/10</td></tr>
        </tbody>
      </table>
    </div>
  </div>
);

/* ======================= MAIN PAGE ======================= */
const MainPage = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <>
            <div className="grid grid--stats">
              <StatCard icon="👥" label="Usuarios" value="1250" />
              <StatCard icon="📝" label="Tareas" value="15" />
              <StatCard icon="🕒" label="Último acceso" value="30/10/2025" />
            </div>

            <div className="grid grid--charts">
              <BarChart />
              <PieChart />
            </div>

            <RecentTable />
          </>
        );

      case "mantenimientousuarios":
        return <MantenimientoUsuarios />;

      case "mantenimientoproductos":
        return <MantenimientoProductos />;

      case "mantenimientorol":
        return <MantenimientoRol />;

      case "mantenimientotickets":
        return <MantenimientoTickets />;

      case "MantTramites":
        return <Tramites />;

      case "bitacora":
        return <Bitacora />;

      case "proveedores":
        return <Proveedores />;

      case "inventario":
        return <Inventario />;
      
      case "inventariostatus":
        return <Inventariostatus />;
      
      case "HistorialKardex":
        return <HistorialKardex />;

      case "DetalleCompra":
        return <DetalleCompra />;

      case "settings":
        return <div className="card p-4">Configuración del sistema</div>;

      default:
        return <h2>Error: Vista no encontrada</h2>;
    }

  };

  return (
    <div className="layout">
      <Sidebar activeView={activeView} onSelect={setActiveView} onLogout={logout} />
      <div className="main">
        <Topbar />
        <div className="content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MainPage;