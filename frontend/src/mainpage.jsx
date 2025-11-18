import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mainpage.css";
import { NavLink } from "react-router-dom";
import MantenimientoUsuarios from "./mantenimientousuarios";
import { FiHome, FiUsers, FiSettings, FiLogOut } from "react-icons/fi";
import MantenimientoProductos from "./mantenimientoproductos";
import MantenimientoRol from "./mantenimientorol";
import PerfilModal from "./perfilmodal";


const rol = localStorage.getItem("rol_nombre");


/* ========== UI Pequeños ========== */
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
        type="button"
      >
        <FiHome /> <span>Panel principal</span>
      </button>
      <button
        className={`sb__link ${activeView === "mantenimientousuarios" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientousuarios")}
        type="button"
      >
        <FiUsers /> <span>Mantenimiento de Usuarios</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientoproductos" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientoproductos")}
        type="button"
      >
        <FiUsers /> <span>Mantenimiento de Productos</span>
      </button>

      <button
        className={`sb__link ${activeView === "mantenimientorol" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("mantenimientorol")}
        type="button"
      >
        <FiUsers /> <span>Mantenimiento de Rol</span>
      </button>

      <button
        className={`sb__link ${activeView === "settings" ? "sb__link--active" : ""}`}
        onClick={() => onSelect("settings")}
        type="button"
      >
        <FiSettings /> <span>Configuración</span>
      </button>

      {rol === "Administrador" && (
  <button
    className={`sb__link ${activeView === "mantenimientousuarios" ? "sb__link--active" : ""}`}
    onClick={() => onSelect("mantenimientousuarios")}
    type="button"
  >
    <i className="i i-users" /> Mantenimiento de Usuarios
  </button>
  
  
)}

      <button className="sb__link" onClick={onLogout} type="button">
        <FiLogOut /> <span>Cerrar sesión</span>
      </button>
    </nav>
  </aside>
);

// ---------------- Topbar ----------------
const Topbar = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // leer usuario guardado por el login
    const u = JSON.parse(localStorage.getItem("mm_user") || "null");
    setUser(u);

    // actualizarse si otro tab cambia el usuario
    const onStorage = (e) => {
      if (e.key === "mm_user") {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const nombre = user?.nombre ?? user?.nombre_usuario ?? "USUARIO";
  const rol = user?.rol_nombre ? ` (${user.rol_nombre})` : "";
  const [showPerfil, setShowPerfil] = useState(false);


  return (
    <header className="tb">
      <div className="tb__title">PANEL PRINCIPAL</div>
      <div className="tb__right">
        <button className="tb__btn">Notificaciones</button>
        <div className="tb__user">👤 {nombre}{rol}</div>
        <button className="tb__btn">🌐 Idioma (ES)</button>
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
// -------------- fin Topbar --------------

const StatCard = ({ icon, label, value }) => (
  <div className="card stat">
    <div className="stat__icon">{icon}</div>
    <div className="stat__body">
      <div className="stat__label">{label}</div>
      <div className="stat__value">{value}</div>
    </div>
  </div>
);

/* Barras con CSS variables */
const BarChart = ({ seriesA = [2, 3, 6, 2, 4, 7], seriesB = [1, 2, 3, 1.8, 2.5, 5] }) => (
  <div className="card chart">
    <div className="card__head">Actividad Semanal</div>
    <div className="bars">
      {seriesA.map((a, idx) => {
        const b = seriesB[idx] ?? 0;
        return (
          <div className="bars__group" key={idx}>
            <div className="bar bar--a" style={{ "--h": `${a * 6}%` }} />
            <div className="bar bar--b" style={{ "--h": `${b * 6}%` }} />
            <div className="bars__label">{idx + 1}</div>
          </div>
        );
      })}
    </div>
    <div className="chart__legend">
      <span className="dot dot--a" /> Usuarios
      <span className="dot dot--b" /> Permisos
    </div>
  </div>
);

/* Pie con conic-gradient */
const PieChart = ({ slices = [60, 25, 15] }) => {
  const total = slices.reduce((s, v) => s + v, 0);
  const [a, b] = slices.map((v) => (v / total) * 360);
  const bg = `conic-gradient(var(--cyan) 0 ${a}deg, var(--navy-30) ${a}deg ${a + b}deg, var(--navy-60) ${
    a + b
  }deg 360deg)`;
  return (
    <div className="card chart">
      <div className="card__head">Módulos más Usados</div>
      <div className="pie" style={{ background: bg }} />
      <div className="chart__legend">
        <span className="dot" style={{ background: "var(--cyan)" }} /> Configuración
        <span className="dot" style={{ background: "var(--navy-30)" }} /> Reportes
        <span className="dot" style={{ background: "var(--navy-60)" }} /> Usuarios
      </div>
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
          <tr>
            <td>Pedro S. Modificó permisos</td>
            <td>Usuarios</td>
            <td>MSOSA</td>
            <td>10/10</td>
          </tr>
          <tr>
            <td>María C. Añadió usuario</td>
            <td>Usuarios</td>
            <td>MARTICA</td>
            <td>10/09</td>
          </tr>
          <tr>
            <td>Juan P. Eliminó rol</td>
            <td>Reportes</td>
            <td>JP01</td>
            <td>10/08</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);


/* ========== Página ========== */
const MainPage = () => {
  const [activeView, setActiveView] = useState("dashboard");
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const renderContent = () => {
    if (activeView === "dashboard") {
      return (
        <>
        
          {/* Key Metrics */}
          <div className="grid grid--stats">
            <StatCard icon="👥" label="Total de Usuarios" value="1,250" />
            <StatCard icon="📝" label="Tareas Pendientes" value="15" />
            <StatCard icon="🕒" label="Último Acceso" value="30/10/2025" />
          </div>

          {/* Charts */}
          <div className="grid grid--charts">
            <BarChart />
            <PieChart />
          </div>

          {/* Tabla */}
          <RecentTable />
        </>
      );
    }

   if (activeView === "mantenimientousuarios") {
  return <MantenimientoUsuarios />;   // 👈 aquí va tu módulo real
}
 if (activeView === "mantenimientoproductos") {
  return <MantenimientoProductos />;   // 👈 aquí va tu módulo real
}
if (activeView === "mantenimientorol") {
  return <Mantenimientorol />;   // 👈 aquí va tu módulo real
}


    if (activeView === "settings") {
      return <div className="card"><div className="card__head">Configuración</div><div className="p-3">Opciones del sistema…</div></div>;
    }

    return null;
  };

  return (
    <div className="layout">
     <Sidebar
  activeView={activeView}
  onSelect={setActiveView}
  onLogout={handleLogout}
/>
      <div className="main">
        <Topbar />
        <div className="content">{renderContent()}</div>
      </div>
    </div>
  );
};

export default MainPage;
