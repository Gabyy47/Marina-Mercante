// src/Kiosko.jsx
import { useState, useEffect } from "react";
import api from "./api";
import "./kiosko.css";
import logoGobierno from "./imagenes/DGMM-Gobierno.png";
import { FaUser, FaWheelchair } from "react-icons/fa";

/** IDs reales en BD (ajústalos si difieren) */
const TIPO_BY_PRIORIDAD = {
  NORMAL: 1,
  PREFERENCIAL: 2,
};

/** Helpers fecha/hora */
function yyyymmdd(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

function hhmmss(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function Kiosko() {
  const [tramites, setTramites] = useState([]);
  const [paso, setPaso] = useState(1); // 1: prioridad, 2: trámite, 3: ticket
  const [prioridad, setPrioridad] = useState(null); // "NORMAL" | "PREFERENCIAL"
  const [enviando, setEnviando] = useState(false);
  const [ticket, setTicket] = useState(null); // { no_ticket, prioridad, tramite, fecha, hora }

  /** Cargar trámites desde la API */
  useEffect(() => {
    api
      .get("/tramites")
      .then((r) => setTramites(r.data || []))
      .catch(() => setTramites([]));
  }, []);

  /** Selección de prioridad (paso 1 -> paso 2) */
  const elegirPrioridad = (p) => {
    setPrioridad(p);
    setPaso(2);
  };

  /** Llamar a API para crear ticket */
  const tomarTicket = async (tramiteSel) => {
    if (!prioridad || !tramiteSel) return;

    const id_tipo_ticket = TIPO_BY_PRIORIDAD[prioridad];
    const id_tramite = tramiteSel.id_tramite;
    const tramiteTexto = tramiteSel.nombre_tramite;

    try {
      setEnviando(true);
      const { data } = await api.post("/kiosko/tomar", {
        id_tipo_ticket,
        id_tramite,
      });

      setTicket({
        no_ticket: data.no_ticket,
        prioridad,
        tramite: tramiteTexto,
        fecha: data.fecha || yyyymmdd(),
        hora: data.hora || hhmmss(),
      });
      setPaso(3);
    } catch (err) {
      alert(
        err.response?.data?.error ||
          err.response?.data?.mensaje ||
          "No se pudo generar el ticket"
      );
    } finally {
      setEnviando(false);
    }
  };

  /** Resetear flujo (volver al inicio) */
  const reiniciar = () => {
    setPaso(1);
    setPrioridad(null);
    setTicket(null);
  };

  /** Al llegar al paso 3: imprimir automáticamente y volver al inicio */
  useEffect(() => {
    if (paso === 3 && ticket) {
      const after = () => {
        window.removeEventListener("afterprint", after);
        reiniciar();
      };

      window.addEventListener("afterprint", after);
      window.print();

      // Fallback por si afterprint no se dispara
      const t = setTimeout(after, 2000);

      return () => {
        window.removeEventListener("afterprint", after);
        clearTimeout(t);
      };
    }
  }, [paso, ticket]);

  /** Componente pasos (1•2•3) */
  const Steps = () => (
    <div className="k-steps" aria-label="progreso">
      <div className={`k-step ${paso >= 1 ? "is-done" : ""}`}>1</div>
      <div className={`k-step ${paso >= 2 ? "is-done" : ""}`}>2</div>
      <div className={`k-step ${paso >= 3 ? "is-done" : ""}`}>3</div>
    </div>
  );

  return (
    <div className="kiosk-wrap">
      {/* Encabezado con logo institucional */}
      <header className="k-header">
        <img
          src={logoGobierno}
          alt="Dirección General de la Marina Mercante - Gobierno de Honduras"
          className="k-logo-header"
        />
      </header>

      {/* Top: Título grande + pasos */}
      <div className="k-topbar">
        <h1 className="k-title"></h1>
        <Steps />
      </div>

      {/* ===== PASO 1: Elegir prioridad ===== */}
      {paso === 1 && (
        <main className="k-main">
          <div className="k-grid-2">
            {/* Normal */}
            <button
              className="k-card big k-prio normal"
              onClick={() => elegirPrioridad("NORMAL")}
            >
              <div className="k-card-icon">
                <FaUser className="k-icon-react" aria-hidden />
              </div>
              <div className="k-card-title">Normal</div>
              <div className="k-card-sub">Atención general</div>
            </button>

            {/* Preferencial */}
            <button
              className="k-card big k-prio pref"
              onClick={() => elegirPrioridad("PREFERENCIAL")}
            >
              <div className="k-card-icon">
                <FaWheelchair className="k-icon-react" aria-hidden />
              </div>
              <div className="k-card-title">Preferencial</div>
              <div className="k-card-sub">
                Adulto mayor, embarazadas y personas con discapacidad
              </div>
            </button>
          </div>
        </main>
      )}

      {/* ===== PASO 2: Seleccionar trámite ===== */}
      {paso === 2 && (
        <>
          <div className="k-section-head">
            <h2>Seleccione su trámite</h2>
            <button className="k-link" onClick={() => setPaso(1)}>
              ← Cambiar prioridad
            </button>
          </div>

          <main className="k-main">
            <div className="k-grid-3">
              {tramites.map((t) => (
                <button
                  key={t.id_tramite}
                  className="k-card k-tramite"
                  onClick={() => tomarTicket(t)}
                  disabled={enviando}
                >
                  <div className="k-card-title">{t.nombre_tramite}</div>
                  <span className="k-arrow" aria-hidden>
                    →
                  </span>
                </button>
              ))}
              {tramites.length === 0 && (
                <p style={{ textAlign: "center", width: "100%" }}>
                  No hay trámites disponibles.
                </p>
              )}
            </div>
          </main>

          <footer className="k-foot">
            <div className="k-foot-inner">
              Gracias por su visita <span className="dot">•</span> DGMM
            </div>
          </footer>
        </>
      )}

      {/* ===== PASO 3: Ticket generado (se imprime solo) ===== */}
      {paso === 3 && ticket && (
        <main className="k-main">
          <div className="k-ticket">
            <div className="k-ticket-head">
              <img
                src={logoGobierno}
                alt="DGMM"
                className="k-ticket-logo"
                loading="lazy"
              />
              <div className="k-ticket-brand">
                Dirección General de la Marina Mercante
              </div>
            </div>

            <div className="k-divider" />

            <div className="k-ticket-num">{ticket.no_ticket}</div>

            <div className="k-divider dotted" />

            <div className="k-ticket-meta">
              <div className="k-meta-row">
                <strong>Trámite</strong>
                <span>{ticket.tramite}</span>
              </div>
              <div className="k-meta-row">
                <strong>Prioridad</strong>
                <span>{ticket.prioridad}</span>
              </div>
              <div className="k-meta-row">
                <strong>Fecha / Hora</strong>
                <span>
                  {ticket.fecha} {ticket.hora}
                </span>
              </div>
            </div>

            {/* Barras decorativas tipo “barcode” */}
            <div className="k-ticket-barcode" aria-hidden>
              <div className="bar a" />
              <div className="bar c" />
              <div className="bar e" />
              <div className="bar b" />
              <div className="bar d" />
              <div className="bar f" />
              <div className="bar a" />
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
