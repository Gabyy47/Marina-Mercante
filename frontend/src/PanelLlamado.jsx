// src/PanelLlamado.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FaWheelchair,
  FaUserClock,
  FaChevronRight,
  FaWindowMaximize,
} from "react-icons/fa";
import api from "./api";
import "./panel-llamado.css";

/* ===== Normalizar ticket ===== */
function normalizeTicket(t) {
  if (!t) return null;
  return {
    id_ticket: t.id_ticket,
    no_ticket: t.no_ticket ?? t.NO_ticket ?? t.noTicket ?? "",
    tramite: t.tramite ?? t.trámite ?? "",
    tipo: t.tipo ?? t.prioridad ?? "",
    creado_en: t.creado_en ?? t.creadoEn ?? t.creado ?? new Date().toISOString(),
    ventanilla: t.ventanilla ?? t.window ?? null,
  };
}

/* ===== Helpers ===== */
const getNo = (r) => r?.no_ticket ?? r?.NO_ticket ?? r?.noTicket ?? "—";
const getCreado = (r) =>
  r?.creado_en ?? r?.creadoEn ?? r?.creado ?? new Date().toISOString();
const getTipo = (r) => r?.tipo ?? r?.prioridad ?? "NORMAL";
const getTramite = (r) => r?.tramite ?? r?.trámite ?? "—";

/* ===== Badge tipo ===== */
function TipoBadge({ tipo, size = "md" }) {
  const isPref = (tipo || "").toUpperCase().includes("PREF");
  return (
    <span className={`pl-badge ${size} ${isPref ? "is-pref" : "is-norm"}`}>
      {isPref ? <FaWheelchair /> : <FaUserClock />}
      <span>{isPref ? "PREFERENCIAL" : "NORMAL"}</span>
    </span>
  );
}

export default function PanelLlamado() {
  const [cola, setCola] = useState([]);
  const [actual, setActual] = useState(null);
  const [loading, setLoading] = useState(false);

  const [ventanilla, setVentanilla] = useState(""); // ← vacío hasta cargar BD
  const [ventanillasBD, setVentanillasBD] = useState([]);

  const [showBanner, setShowBanner] = useState(false);

  const midnightTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);

  /* ===== Cargar ventanillas desde la BD ===== */
  const cargarVentanillas = async () => {
    try {
      const { data } = await api.get("/ventanilla");
      const lista = Array.isArray(data)
        ? data.filter((v) => v.estado === "ACTIVA")
        : [];

      setVentanillasBD(lista);

      // Primera ventanilla por defecto
      if (lista.length && !ventanilla) {
        setVentanilla(lista[0].codigo);
      }
    } catch (e) {
      console.error("Error cargando ventanillas", e);
      setVentanillasBD([]);
    }
  };

  /* ===== Cargar cola ===== */
  const cargarCola = async () => {
    try {
      const { data } = await api.get("/tickets/cola");
      setCola(Array.isArray(data) ? data : []);
    } catch {}
  };

  /* ===== Cargar ticket actual ===== */
  const cargarActual = async () => {
    try {
      const { data } = await api.get("/tickets/en-atencion");
      const normal = normalizeTicket(data);
      setActual(normal?.no_ticket ? normal : null);
    } catch {}
  };

  /* ===== Auto-refresh ===== */
  useEffect(() => {
    cargarVentanillas();
    cargarCola();
    cargarActual();

    const id = setInterval(() => {
      cargarCola();
      cargarActual();
    }, 5000);

    return () => clearInterval(id);
  }, []);

  /* ===== Atajos de teclado ===== */
  useEffect(() => {
    const onKey = (e) => {
      if (loading) return;
      const k = e.key.toLowerCase();
      if (k === "n") llamarSiguiente();
      if (k === "r") repetirLlamado();
      if (k === "f") finalizar();
      if (k === "c") cancelar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [loading, actual]);

  /* ===== Acciones ===== */
  const llamarSiguiente = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post("/tickets/siguiente", { ventanilla });
      const normal = normalizeTicket(data?.ticket);
      setActual(normal || null);
      await cargarCola();
    } catch (e) {
      alert(e?.response?.data?.mensaje || "No hay tickets en cola.");
    } finally {
      setLoading(false);
    }
  };

  const repetirLlamado = async () => {
    if (loading || !actual) return;
    try {
      await api.post(`/tickets/${actual.id_ticket}/repetir`, { ventanilla });
      await cargarActual();
    } catch (e) {
      alert("No se pudo repetir el llamado");
    }
  };

  const finalizar = async () => {
    if (loading || !actual) return;
    if (!confirm("¿Finalizar atención de este ticket?")) return;
    setLoading(true);
    try {
      await api.patch(`/tickets/${actual.id_ticket}/finalizar`);
      setActual(null);
      await cargarCola();
    } catch {
      alert("No se pudo finalizar");
    } finally {
      setLoading(false);
    }
  };

  const cancelar = async () => {
    if (loading || !actual) return;
    if (!confirm("¿Cancelar este ticket?")) return;
    setLoading(true);
    try {
      await api.patch(`/tickets/${actual.id_ticket}/cancelar`);
      setActual(null);
      await cargarCola();
    } catch {
      alert("No se pudo cancelar");
    } finally {
      setLoading(false);
    }
  };

  /* ===== Reset a medianoche (hora de Honduras) ===== */
  useEffect(() => {
    const resetDia = async () => {
      setActual(null);
      setCola([]);
      await Promise.all([cargarCola(), cargarActual()]);
      setShowBanner(true);

      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setShowBanner(false), 5000);
    };

    const programarReset = () => {
      const now = new Date();
      const next = new Date(now);

      // Hora local Honduras UTC-6
      next.setHours(24, 0, 0, 0);

      const delay = next.getTime() - now.getTime();
      return setTimeout(async () => {
        await resetDia();
        midnightTimerRef.current = programarReset();
      }, delay);
    };

    midnightTimerRef.current = programarReset();

    return () => {
      clearTimeout(midnightTimerRef.current);
      clearTimeout(bannerTimerRef.current);
    };
  }, []);

  const primeraCola = useMemo(() => cola[0] || null, [cola]);

  /* ===== Render ===== */
  return (
    <div className="pl-wrap" aria-busy={loading ? "true" : "false"}>
      {/* Banner */}
      {showBanner && <div className="pl-banner">Nueva jornada iniciada</div>}

      {/* Header */}
      <header className="pl-header">
        <div className="pl-title">
          <h1>Atención de Tickets</h1>
          <p className="pl-sub">Panel de llamado</p>
        </div>

        <div className="pl-controls">
          <div className="pl-vent-group">
            {ventanillasBD.map((v) => (
              <button
                key={v.id_ventanilla}
                type="button"
                className={`pl-vent-btn ${
                  ventanilla === v.codigo ? "is-active" : ""
                }`}
                onClick={() => setVentanilla(v.codigo)}
              >
                <FaWindowMaximize /> {v.codigo}
              </button>
            ))}

            {!ventanillasBD.length && (
              <span className="pl-empty-small">Sin ventanillas activas</span>
            )}
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="pl-grid">
        {/* En atención */}
        <section className="pl-card">
          <div className="pl-card-head">
            <h2>En atención</h2>
            {actual && <TipoBadge tipo={actual.tipo} />}
          </div>

          {actual ? (
            <div className="pl-actual">
              <div className="pl-ticket">{actual.no_ticket}</div>

              <div className="pl-meta">
                <span>{actual.tramite}</span>
                <FaChevronRight className="dot" />
                <span>{(actual.tipo || "NORMAL").toUpperCase()}</span>
              </div>

              <div className="pl-row">
                <div className="pl-kv">
                  <span className="k">Iniciado</span>
                  <span className="v">
                    {new Date(actual.creado_en).toLocaleTimeString()}
                  </span>
                </div>

                <div className="pl-kv">
                  <span className="k">Ventanilla</span>
                  <span className="v">
                    {(actual?.ventanilla ?? ventanilla) || "—"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="pl-empty">
              <p>No hay ticket en atención</p>
            </div>
          )}

          {/* Acciones */}
          <div className="pl-actions">
            <button className="btn btn-primary" onClick={llamarSiguiente}>
              Siguiente <kbd>N</kbd>
            </button>

            <button
              className="btn"
              onClick={repetirLlamado}
              disabled={!actual}
            >
              Repetir <kbd>R</kbd>
            </button>

            <button className="btn btn-success" onClick={finalizar} disabled={!actual}>
              Finalizar <kbd>F</kbd>
            </button>

            <button className="btn btn-warn" onClick={cancelar} disabled={!actual}>
              Cancelar <kbd>C</kbd>
            </button>
          </div>
        </section>

        {/* Derecha */}
        <div className="pl-right">
          {/* Siguiente */}
          <section className="pl-card">
            <div className="pl-card-head">
              <h2>Siguiente en cola</h2>
            </div>

            {primeraCola ? (
              <div className="pl-preview">
                <div className="pl-ticket-mini">{getNo(primeraCola)}</div>
                <div className="pl-preview-meta">
                  {getTramite(primeraCola)} • {getTipo(primeraCola)}
                </div>
                <div className="pl-preview-time">
                  {new Date(getCreado(primeraCola)).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="pl-empty"><p>Sin tickets</p></div>
            )}
          </section>

          {/* Cola */}
          <section className="pl-card">
            <div className="pl-card-head">
              <h2>Cola</h2>
            </div>

            <div className="pl-table-wrap">
              <table className="pl-table">
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
                  {cola.length === 0 && (
                    <tr>
                      <td colSpan={5} className="pl-empty-row">Vacío</td>
                    </tr>
                  )}

                  {cola.map((r, i) => {
                    const tipo = getTipo(r);
                    const isPref = (tipo || "").toUpperCase().includes("PREF");

                    return (
                      <tr key={r.id_ticket ?? `${getNo(r)}-${i}`}>
                        <td>{i + 1}</td>
                        <td className="pl-strong">{getNo(r)}</td>
                        <td>{getTramite(r)}</td>

                        <td>
                          <span className={`pl-badge sm ${isPref ? "is-pref" : "is-norm"}`}>
                            {isPref ? <FaWheelchair /> : <FaUserClock />}
                            <span>{isPref ? "PREFERENCIAL" : "NORMAL"}</span>
                          </span>
                        </td>

                        <td>{new Date(getCreado(r)).toLocaleTimeString()}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {loading && (
        <div className="pl-overlay">
          <div className="pl-spinner" />
        </div>
      )}
    </div>
  );
} 