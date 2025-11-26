import { useState, useEffect } from "react";
import { FiUser } from "react-icons/fi";
import PerfilModal from "./perfilmodal.jsx";
import PanelLlamado from "./PanelLlamado.jsx";
import "./dashboard-tickets.css";

// Logo MM
import logoMM from "./imagenes/DGMM-Gobierno.png";

export default function DashboardTickets() {
  const [user, setUser] = useState(null);
  const [showPerfil, setShowPerfil] = useState(false);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("mm_user") || "null");
    setUser(u);
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("mm_user");
    window.location.href = "/login";
  };

  return (
    <div className="ticket-dashboard">
      {/* ======================== */}
      {/*           HEADER         */}
      {/* ======================== */}
      <header className="mm-header">
        {/* LOGO SOLO A LA IZQUIERDA */}
        <div className="mm-header-left">
          <img src={logoMM} alt="Logo MM" className="mm-logo" />
        </div>

        {/* NOMBRE + ROL + BOTONES A LA DERECHA */}
        <div className="mm-header-right">
          <div className="mm-user-box">
            <span className="mm-user-name">
              {user?.nombre_usuario || "USUARIO"}
            </span>
            <span className="mm-user-role">
              ({user?.rol_nombre || "Rol"})
            </span>
          </div>

          <button
            className="mm-header-btn"
            onClick={() => setShowPerfil(true)}
          >
            <FiUser size={18} />
            Mi perfil
          </button>

          <button
            className="mm-header-btn"
            onClick={logout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* MODAL PERFIL */}
      <PerfilModal open={showPerfil} onClose={() => setShowPerfil(false)} />

      {/* ======================== */}
      {/*   PANEL DE LLAMADO      */}
      {/* ======================== */}
      <main className="mm-main-container">
        <PanelLlamado />
      </main>
    </div>
  );
}

