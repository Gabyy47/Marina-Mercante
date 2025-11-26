import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdDashboard,
  MdConfirmationNumber,
  MdSettings,
  MdLogout,
  MdNotifications,
  MdHelpOutline,
  MdPerson,
} from "react-icons/md";

import api from "./api";
import PanelLlamado from "./PanelLlamado";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import "./dashboard-tickets.css"; // SOLO estilos de cards/tabla, no layout

/* ---------------------- Subvista: Cola en vivo ---------------------- */
function ColaEnVivo() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const cargar = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/tickets/cola");
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 2500);
    return () => clearInterval(id);
  }, []);

  const fmt = (v) => (v ? new Date(v).toLocaleTimeString("es-HN") : "—");

  return (
    <div className="page-content">
      <h2>Cola en vivo</h2>
      <div className="dt-card">
        <div className="dt-card__title">Tickets en cola</div>
        <div className="dt-tablewrap">
          <table className="dt-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Ticket</th>
                <th>Trámite</th>
                <th>Tipo</th>
                <th>Hora</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="dt-empty">Cargando…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={5} className="dt-empty">Sin tickets en cola</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id_ticket ?? i}>
                    <td>{i + 1}</td>
                    <td className="mono brand">{r.NO_ticket}</td>
                    <td>{r.tramite || "—"}</td>
                    <td className="mono">{r.tipo || r.tipo_ticket || "—"}</td>
                    <td>{fmt(r.creado_en)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------------- Dashboard Tickets ---------------------- */
export default function DashboardTickets() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const [activeView, setActiveView] = useState("panel"); // "panel" | "cola"
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userBtnRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!userMenuOpen) return;
      if (
        userBtnRef.current &&
        !userBtnRef.current.contains(e.target) &&
        userMenuRef.current &&
        !userMenuRef.current.contains(e.target)
      ) {
        setUserMenuOpen(false);
      }
    };
    const onEsc = (e) => e.key === "Escape" && setUserMenuOpen(false);
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [userMenuOpen]);

  const cerrarSesion = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const renderView = () =>
    activeView === "panel"
      ? (
        <div className="page-content">
          <h2>Panel de llamado</h2>
          <PanelLlamado userId={user?.id_usuario || 0} />
        </div>
      )
      : <ColaEnVivo />;

  return (
    <div className="layout">{/* MISMO LAYOUT QUE MAINPAGE */}
      {/* ===== SIDEBAR FIJO (NAVI-MASTER) ===== */}
      <aside className="sb2">
        <div className="sb2__head">
          <div className="sb2__brand">
            <img src={logoDGMM} alt="DGMM" className="sb2__logo" />
          </div>
        </div>

        <nav className="sb2__nav">
          <button
            className={`sb2__item ${activeView === "panel" ? "is-active" : ""}`}
            onClick={() => setActiveView("panel")}
          >
            <span className="sb2__icon"><MdDashboard size={20} /></span>
            <span className="sb2__label">Panel principal</span>
          </button>

          <button
            className={`sb2__item ${activeView === "cola" ? "is-active" : ""}`}
            onClick={() => setActiveView("cola")}
          >
            <span className="sb2__icon"><MdConfirmationNumber size={20} /></span>
            <span className="sb2__label">Cola en vivo</span>
          </button>

          <button
            className={`sb2__item ${activeView === "settings" ? "is-active" : ""}`}
            onClick={() => setActiveView("settings")}
          >
            <span className="sb2__icon"><MdSettings size={20} /></span>
            <span className="sb2__label">Configuración</span>
          </button>

          <div className="sb2__spacer" />

          <button className="sb2__item sb2__item--logout" onClick={cerrarSesion}>
            <span className="sb2__icon"><MdLogout size={20} /></span>
            <span className="sb2__label">Cerrar sesión</span>
          </button>
        </nav>
      </aside>

      {/* ===== CONTENIDO ===== */}
      <main className="main">
        {/* 🔻 Topbar removida */}
        <section className="content">
          <div className="container-xl">{renderView()}</div>
        </section>
      </main>
    </div>
  );
}
