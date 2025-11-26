// src/Kiosko.jsx
import { useState, useEffect } from "react";
import api from "./api";
import "./kiosko.css";
import logoGobierno from "./imagenes/DGMM-Gobierno.png";
import { FaUser, FaWheelchair } from "react-icons/fa";

/** Helpers fecha/hora */
function yyyymmdd(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function hhmmss(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// Opcional: detectar si el registro está ACTIVO (según cómo lo guardes)
function isActivo(row) {
  if (!row) return false;

  if (row.activo === 1 || row.activo === true) return true;

  const est = String(row.estado ?? row.estado_tipo ?? row.activo ?? "")
    .trim()
    .toUpperCase();

  return est === "ACTIVO" || est === "1" || est === "SI";
}

export default function Kiosko() {
  const [tramites, setTramites] = useState([]);
  const [tipos, setTipos] = useState([]);

  const [tipoSel, setTipoSel] = useState(null);
  const [paso, setPaso] = useState(1);
  const [enviando, setEnviando] = useState(false);
  const [ticket, setTicket] = useState(null);

  /** Cargar trámites y tipos de ticket desde la BD */
  useEffect(() => {
    const cargar = async () => {
      try {
        const [rTram, rTipos] = await Promise.all([
          api.get("/tramites"),
          api.get("/tipo_ticket"),
        ]);

        const listaTram = Array.isArray(rTram.data) ? rTram.data : [];
        const listaTipos = Array.isArray(rTipos.data) ? rTipos.data : [];

        // Si quieres solo activos, descomenta el filtro:
        const tramActivos = listaTram.filter(isActivo);
        const tiposActivos = listaTipos.filter(isActivo);

        setTramites(tramActivos);
        setTipos(tiposActivos);

        console.log("TRÁMITES ACTIVOS:", tramActivos);
        console.log("TIPOS TICKET ACTIVOS:", tiposActivos);
      } catch (err) {
        console.error("Error cargando datos en kiosko:", err);
        setTramites([]);
        setTipos([]);
      }
    };

    cargar();
  }, []);

  /** Elegir tipo (paso 1 → paso 2) */
  const elegirTipo = (tipo) => {
    if (!tipo) return;
    setTipoSel(tipo);
    setPaso(2);
  };

  /** Crear ticket */
  const tomarTicket = async (tramiteSel) => {
    if (!tipoSel || !tramiteSel) return;

    try {
      setEnviando(true);

      const { data } = await api.post("/kiosko/tomar", {
        id_tipo_ticket: tipoSel.id_tipo_ticket,
        id_tramite: tramiteSel.id_tramite,
      });

      setTicket({
        no_ticket: data.no_ticket,
        tipo: (tipoSel.tipo_ticket || "").trim(),
        tramite: tramiteSel.nombre_tramite,
        fecha: data.fecha || yyyymmdd(),
        hora: data.hora || hhmmss(),
      });

      setPaso(3);
    } catch (err) {
      alert("Error al generar ticket");
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  /** Reset */
  const reiniciar = () => {
    setPaso(1);
    setTipoSel(null);
    setTicket(null);
  };

  /** Imprimir y volver automáticamente al paso 1 */
  useEffect(() => {
    if (paso === 3 && ticket) {
      const after = () => {
        window.removeEventListener("afterprint", after);
        reiniciar();
      };

      window.addEventListener("afterprint", after);
      window.print();

      const t = setTimeout(after, 2000);
      return () => clearTimeout(t);
    }
  }, [paso, ticket]);

  /** Pasos visuales */
  const Steps = () => (
    <div className="k-steps">
      <div className={`k-step ${paso >= 1 ? "is-done" : ""}`}>1</div>
      <div className={`k-step ${paso >= 2 ? "is-done" : ""}`}>2</div>
      <div className={`k-step ${paso >= 3 ? "is-done" : ""}`}>3</div>
    </div>
  );

  return (
    <div className="kiosk-wrap">
      <header className="k-header">
        <img src={logoGobierno} className="k-logo-header" alt="DGMM" />
      </header>

      <div className="k-topbar">
        <Steps />
      </div>

      {/* ===== PASO 1: Elegir tipo de ticket (DINÁMICO DESDE BD) ===== */}
      {paso === 1 && (
        <main className="k-main">
          <p className="k-instruction"></p>

          <div className="k-grid-2 k-grid-tipos">
            {tipos.map((t) => {
              const nombre = (t.tipo_ticket || "").trim();
              const prefijo = (t.prefijo || "").trim();
              const isPref = nombre.toUpperCase().includes("PREF");

              return (
                <button
                  key={t.id_tipo_ticket}
                  className={`k-card big k-prio ${isPref ? "pref" : "normal"}`}
                  onClick={() => elegirTipo(t)}
                >
                  <div className="k-card-icon">
                    {isPref ? (
                      <FaWheelchair className="k-icon-react" />
                    ) : (
                      <FaUser className="k-icon-react" />
                    )}
                  </div>
                  <div className="k-card-title">
                    {nombre || "SIN NOMBRE"}
                  </div>
                  <div className="k-card-sub">
                    Prefijo: {prefijo || "-"}
                  </div>
                </button>
              );
            })}

            {tipos.length === 0 && (
              <p
                style={{
                  marginTop: 24,
                  textAlign: "center",
                  color: "#b91c1c",
                  width: "100%",
                }}
              >
                No hay tipos de ticket activos configurados en el sistema.
              </p>
            )}
          </div>
        </main>
      )}

      {/* ===== PASO 2: Elegir trámite ===== */}
      {paso === 2 && (
        <>
          <div className="k-section-head">
            <h2>Seleccione su trámite</h2>
            <button className="k-link" onClick={() => setPaso(1)}>
              ← Cambiar tipo
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
                  <span className="k-arrow">→</span>
                </button>
              ))}

              {tramites.length === 0 && (
                <p style={{ gridColumn: "1 / -1", textAlign: "center" }}>
                  No hay trámites activos disponibles.
                </p>
              )}
            </div>
          </main>
        </>
      )}

      {/* ===== PASO 3: Ticket generado (para imprimir) ===== */}
      {paso === 3 && ticket && (
        <main className="k-main">
          <div className="k-ticket">
            <div className="k-ticket-head">
              <img
                src={logoGobierno}
                className="k-ticket-logo"
                alt="DGMM ticket"
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
                <strong>Trámite:</strong> {ticket.tramite}
              </div>

              <div className="k-meta-row">
                <strong>Tipo:</strong> {ticket.tipo}
              </div>

              <div className="k-meta-row">
                <strong>Fecha / Hora:</strong> {ticket.fecha} {ticket.hora}
              </div>
            </div>

            <div className="k-ticket-barcode">
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
