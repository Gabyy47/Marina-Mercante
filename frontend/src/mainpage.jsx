// src/mainpage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

import logo from "./imagenes/DGMM-Gobierno.png";
import "./mainpage.css";

import MantenimientoUsuarios from "./mantenimientousuarios.jsx";
import MantenimientoProductos from "./mantenimientoproductos.jsx";
import MantenimientoRol from "./mantenimientorol.jsx";
import MantenimientoTickets from "./mantenimientotickets.jsx";
import Bitacora from "./bitacora.jsx";
import PerfilModal from "./perfilmodal.jsx";
import Tramites from "./MantTramites.jsx";
import Proveedores from "./proveedores.jsx";
import Inventariostatus from "./inventariostatus.jsx";
import DetalleCompra from "./DetalleCompra.jsx";
import Mantenimientocliente from "./mantenimientocliente.jsx";
import Kardex from "./Kardex.jsx"; // 
import Tipo from "./MantenimientoTipoTicket.jsx";
import MantenimientoPermisos from "./MantenimientoPermisos.jsx";
import BackupRestore from "./BackupRestore.jsx";
import MantenimientoSeguridad from "./MantenimientoSeguridad.jsx";
import Compra from "./Compra.jsx";
import Salidas from "./Salidas.jsx";
import DetalleSalidas from "./DetalleSalidas.jsx";





import api from "./api";

import {
  FiHome,
  FiUsers,
  FiSettings,
  FiLogOut,
  FiUser,
  FiChevronDown,
  FiClipboard,
  FiBox,
  FiDatabase,
  FiList,
  FiFileText,
} from "react-icons/fi";

/* ======================================================
   TOPBAR
====================================================== */
function Topbar() {
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
      <div className="tb__user">
        👤 {nombre}
        {rol}
      </div>
      <button className="profile-btn" onClick={() => setShowPerfil(true)}>
        <FiUser /> Mi perfil
      </button>

      <PerfilModal
        open={showPerfil}
        onClose={() => setShowPerfil(false)}
        onSaved={() => {}}
      />
    </header>
  );
}

/* ======================================================
   SIDEBAR
====================================================== */
function Sidebar({ activeView, onSelect, onLogout }) {
  const [openUsuarios, setOpenUsuarios] = useState(false);
  const [openTickets, setOpenTickets] = useState(false);
  const [openInventario, setOpenInventario] = useState(false);
  const [openBitacora, setOpenBitacora] = useState(false);

  return (
    <aside className="sb">
      <div className="sb__brand">
        <img src={logo} alt="DGMM" />
      </div>

      <nav className="sb__nav">

        {/* Panel principal */}
        <button
          className={`sb__link ${
            activeView === "dashboard" ? "sb__link--active" : ""
          }`}
          onClick={() => onSelect("dashboard")}
        >
          <span>
            <FiHome />
            <span>Panel principal</span>
          </span>
        </button>

        {/* ================== USUARIOS ================== */}
        <div className="sb__section">
          <button
            className={`sb__sectionBtn ${openUsuarios ? "open" : ""}`}
            onClick={() => setOpenUsuarios((v) => !v)}
          >
            <span>
              <FiUsers />
              <span>Usuarios</span>
            </span>
            <FiChevronDown className="sb__caret" />
          </button>

          {openUsuarios && (
            <div className="sb__submenu">
              <button
                className={`sb__link sb__link--child ${
                  activeView === "mantenimientousuarios"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("mantenimientousuarios")}
              >
                <span>
                  <FiUser />
                  <span>Mantenimiento</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "mantenimientorol" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("mantenimientorol")}
              >
                <span>
                  <FiClipboard />
                  <span>Roles</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "mantenimientocliente"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("mantenimientocliente")}
              >
                <span>
                  <FiUsers />
                  <span>Clientes</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ================== TICKETS ================== */}
        <div className="sb__section">
          <button
            className={`sb__sectionBtn ${openTickets ? "open" : ""}`}
            onClick={() => setOpenTickets((v) => !v)}
          >
            <span>
              <FiClipboard />
              <span>Tickets</span>
            </span>
            <FiChevronDown className="sb__caret" />
          </button>

          {openTickets && (
            <div className="sb__submenu">
              <button
                className={`sb__link sb__link--child ${
                  activeView === "mantenimientotickets"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("mantenimientotickets")}
              >
                <span>
                  <FiClipboard />
                  <span>Mantenimiento</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "MantTramites" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("MantTramites")}
              >
                <span>
                  <FiFileText />
                  <span>Trámites</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "MantenimientoTipoTicket"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("MantenimientoTipoTicket")}
              >
                <span>
                  <FiFileText />
                  <span>Tipo Ticket</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* ================== INVENTARIO ================== */}
        <div className="sb__section">
          <button
            className={`sb__sectionBtn ${openInventario ? "open" : ""}`}
            onClick={() => setOpenInventario((v) => !v)}
          >
            <span>
              <FiBox />
              <span>Inventario</span>
            </span>
            <FiChevronDown className="sb__caret" />
          </button>

          {openInventario && (
            <div className="sb__submenu">
              



              <button
                className={`sb__link sb__link--child ${
                  activeView === "mantenimientoproductos"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("mantenimientoproductos")}
              >
                <span>
                  <FiBox />
                  <span>Productos</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "inventariostatus" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("inventariostatus")}
              >
                <span>
                  <FiList />
                  <span>Status</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "kardex" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("kardex")}
              >
                <span>
                  <FiClipboard />
                  <span>Kardex</span>
                </span>
              </button>


                            {/* Compra */}
              <button
                className={`sb__link sb__link--child ${
                  activeView === "Compra" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("Compra")}
              >
                <span>
                  <FiFileText />
                  <span>Compra</span>
                </span>
              </button>


              {/* Detalle compra */}
              <button
                className={`sb__link sb__link--child ${
                  activeView === "DetalleCompra"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("DetalleCompra")}
              >
                <span>
                  <FiFileText />
                  <span>Detalle compra</span>
                </span>
              </button>

              <button
                className={`sb__link sb__link--child ${
                  activeView === "proveedores"
                    ? "sb__link--active"
                    : ""
                }`}
                onClick={() => onSelect("proveedores")}
              >
                <span>
                  <FiClipboard />
                  <span>Proveedores</span>
                </span>
              </button>

                
              {/* Salidas */}
              <button
                className={`sb__link sb__link--child ${
                  activeView === "Salidas" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("Salidas")}
              >
                <span>
                  <FiFileText />
                  <span>Salidas</span>
                </span>
              </button>

              {/* Detalle Salidas */}
              <button
                className={`sb__link sb__link--child ${
                  activeView === "DetalleSalidas" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("DetalleSalidas")}
              >
                <span>
                  <FiFileText />
                  <span>Detalle Salidas</span>
                </span>
              </button>

              
            </div>
          )}
        </div>

        {/* ================== BITÁCORA ================== */}
        <div className="sb__section">
          <button
            className={`sb__sectionBtn ${openBitacora ? "open" : ""}`}
            onClick={() => setOpenBitacora((v) => !v)}
          >
            <span>
              <FiFileText />
              <span>Bitácora</span>
            </span>
            <FiChevronDown className="sb__caret" />
          </button>

          {openBitacora && (
            <div className="sb__submenu">
              <button
                className={`sb__link sb__link--child ${
                  activeView === "bitacora" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("bitacora")}
              >
                <span>
                  <FiFileText />
                  <span>Registros</span>
                </span>
              </button>

              {/* NUEVA OPCIÓN: BACKUP & RESTORE */}
              <button
                className={`sb__link sb__link--child ${
                  activeView === "backupRestore" ? "sb__link--active" : ""
                }`}
                onClick={() => onSelect("backupRestore")}
              >
                <span>
                  <FiFileText />
                  <span>Backup & Restore</span>
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Configuración */}
        <button
          className={`sb__link ${
            activeView === "settings" ? "sb__link--active" : ""
          }`}
          onClick={() => onSelect("settings")}
        >
          <span>
            <FiSettings />
            <span>Configuración</span>
          </span>
        </button>

        <button
          className={`sb__link ${
            activeView === "permisos" ? "sb__link--active" : ""
          }`}
          onClick={() => onSelect("permisos")}
        >
          <span>Configuración de permisos</span>
        </button>

        <button
          className={`sb__link ${
            activeView === "param_seguridad" ? "sb__link--active" : ""
          }`}
          onClick={() => onSelect("param_seguridad")}
        >
          <span>Parámetros de seguridad</span>
        </button>


        {/* Cerrar sesión */}
        <button className="sb__link sb__link--logout" onClick={onLogout}>
          <span>
            <FiLogOut />
            <span>Cerrar sesión</span>
          </span>
        </button>

      </nav>
    </aside>
  );
}

/* ======================================================
   MAIN PAGE
====================================================== */
const MainPage = () => {
  const [activeView, setActiveView] = useState("dashboard");

  const [stats, setStats] = useState({
    usuarios: 0,
    ticketsHoy: 0,
    movimientosHoy: 0,
  });

  const [ticketsHoy, setTicketsHoy] = useState([]);
  const [bitacoraReciente, setBitacoraReciente] = useState([]);

  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("mm_user");
    navigate("/login", { replace: true });
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString("es-HN");
  };

  const cargarDashboard = async () => {
    try {
      const hoy = new Date().toISOString().slice(0, 10);

      const [uRes, tRes, bRes] = await Promise.all([
        api.get("/usuario"), // ajusta si tu endpoint es /usuario
        api.get("/tickets", {
          params: { from: hoy, to: hoy, pageSize: 200 },
        }),
        api.get("/bitacora", { params: { limit: 10 } }),
      ]);

      const usuariosTotal = Array.isArray(uRes.data)
        ? uRes.data.length
        : uRes.data.total || 0;

      let listaTickets =
        (tRes.data && tRes.data.data) ||
        (Array.isArray(tRes.data) ? tRes.data : []);
      let listaBitacora = Array.isArray(bRes.data) ? bRes.data : [];

      setStats({
        usuarios: usuariosTotal,
        ticketsHoy: listaTickets.length,
        movimientosHoy: listaBitacora.length,
      });

      setTicketsHoy(listaTickets);
      setBitacoraReciente(listaBitacora);
    } catch (err) {
      console.error("Error cargando datos del dashboard:", err);
    }
  };

  useEffect(() => {
    if (activeView === "dashboard") {
      cargarDashboard();
    }
  }, [activeView]);

  /* -------------------- DASHBOARD -------------------- */
  const Dashboard = () => (
    <>
      <div className="dashboard-header">
        <h2>Resumen de hoy</h2>
        <p>Vista rápida de usuarios, tickets y actividad reciente.</p>
      </div>

      {/* KPIs */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-label">Usuarios</div>
          <div className="stat-value">{stats.usuarios}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎟️</div>
          <div className="stat-label">Tickets de hoy</div>
          <div className="stat-value">{stats.ticketsHoy}</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📌</div>
          <div className="stat-label">Movimientos de hoy</div>
          <div className="stat-value">{stats.movimientosHoy}</div>
        </div>
      </div>

      {/* TICKETS DE HOY */}
      <div className="dashboard-box">
        <div className="box-title-row">
          <div className="box-title">Tickets de hoy</div>
          <div className="box-pill">
            {stats.ticketsHoy}{" "}
            {stats.ticketsHoy === 1 ? "ticket" : "tickets"}
          </div>
        </div>

        {ticketsHoy.length === 0 ? (
          <div className="table-empty">Sin tickets hoy</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ticket</th>
                  <th>Estado</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ticketsHoy.map((tk) => (
                  <tr key={tk.id_ticket || tk.NO_ticket || tk.no_ticket}>
                    <td>
                      {tk.NO_ticket ||
                        tk.no_ticket ||
                        tk.ticket ||
                        tk.codigo ||
                        "-"}
                    </td>
                    <td>{tk.estado || tk.estado_ticket || "-"}</td>
                    <td>{tk.empleado || tk.usuario || "-"}</td>
                    <td>
                      {formatDateTime(
                        tk.creado_en || tk.fecha || tk.fecha_creacion
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ACTIVIDAD BITÁCORA */}
      <div className="dashboard-box">
        <div className="box-title-row">
          <div className="box-title">Actividad reciente (Bitácora)</div>
          <div className="box-pill">
            {stats.movimientosHoy}{" "}
            {stats.movimientosHoy === 1 ? "movimiento" : "movimientos"}
          </div>
        </div>

        {bitacoraReciente.length === 0 ? (
          <div className="table-empty">Sin movimientos recientes</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Acción</th>
                  <th>Usuario</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {bitacoraReciente.map((b) => (
                  <tr key={b.id_bitacora || `${b.usuario}-${b.fecha}`}>
                    <td>{b.accion || b.accion_realizada || "-"}</td>
                    <td>{b.usuario || b.nombre_usuario || "-"}</td>
                    <td>{formatDateTime(b.fecha || b.fecha_hora)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );

  /* -------------------- RENDER SEGÚN VISTA -------------------- */
  const renderContent = () => {
    switch (activeView) {
      case "dashboard":
        return <Dashboard />;

      case "mantenimientousuarios":
        return <MantenimientoUsuarios />;

      case "mantenimientorol":
        return <MantenimientoRol />;

      case "mantenimientocliente":
        return <Mantenimientocliente />;

      case "mantenimientotickets":
        return <MantenimientoTickets />;

      case "MantTramites":
        return <Tramites />;

      case "MantenimientoTipoTicket":
        return <Tipo />;


      case "mantenimientoproductos":
        return <MantenimientoProductos />;

      case "inventariostatus":
        return <Inventariostatus />;

      case "kardex":
        return <Kardex />;

      case "Compra":
      return <Compra/>;  
      
      case "DetalleCompra":
        return <DetalleCompra />;

      case "Salidas":
        return <Salidas/>;

      case "DetalleSalidas":
        return <DetalleSalidas />;

      case "proveedores":
        return <Proveedores />;

      case "bitacora":
        return <Bitacora />;

      case "backupRestore":         
        return <BackupRestore />;  

      case "permisos":                 
        return <MantenimientoPermisos />;

      case "param_seguridad":
        return <MantenimientoSeguridad />;

      case "settings":
        return <div className="dashboard-box">Configuración del sistema</div>;

      default:
        return <div className="dashboard-box">Vista no encontrada.</div>;
    }
  };

  return (
    <div className="layout">
      <Sidebar
        activeView={activeView}
        onSelect={setActiveView}
        onLogout={logout}
      />
      <div className="main">
        <Topbar />
        <main className="content">{renderContent()}</main>
      </div>
    </div>
  );
};

export default MainPage;
