// src/MantenimientoTickets.jsx
import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "react-toastify/dist/ReactToastify.css";
import "./mantenimientoTickets.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaWheelchair, FaUserClock, FaTimesCircle } from "react-icons/fa";

const BASE_URL = "http://localhost:49146/api/";
Modal.setAppElement("#root");

const ESTADOS = ["EN_COLA", "EN_ATENCION", "FINALIZADO", "CANCELADO"];

/* ===== Helpers fuera del componente (para evitar el error de hoisting) ===== */
function normalizeEstado(estado) {
  const e = String(estado ?? "").toUpperCase().trim();
  return e === "ATENDIDO" ? "FINALIZADO" : e;
}

function diffMs(a, b) {
  const A = a ? new Date(a).getTime() : NaN;
  const B = b ? new Date(b).getTime() : NaN;
  if (Number.isNaN(A) || Number.isNaN(B)) return null;
  return Math.max(0, B - A);
}

function msToHHMMSS(ms) {
  if (ms == null) return "—";
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

const MantenimientoTickets = () => {
  // ===== Estado =====
  const [tickets, setTickets] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Formularios
  const [nuevoTicket, setNuevoTicket] = useState({
    id_tipo_ticket: "",
    id_tramite: "",
    nota: "",
  });

  const [editTicket, setEditTicket] = useState({
    id_ticket: null,
    id_tipo_ticket: "",
    id_tramite: "",
    estado: "",
    nota: "",
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  const hoy = new Date().toISOString().slice(0, 10);
  const [filtros, setFiltros] = useState({
    from: hoy,
    to: hoy,
    empleado_id: "",
    estado: "",
    q: "",
  });

  // ===== Memos =====
  const resumen = useMemo(
    () => ({ total: tickets.length, rango: `${filtros.from} a ${filtros.to}` }),
    [tickets.length, filtros.from, filtros.to]
  );

  // Totales por tipo y cancelados
  const { totPreferencial, totNormal, totCancelado } = useMemo(() => {
    let preferencial = 0;
    let normal = 0;
    let cancelado = 0;

    tickets.forEach((t) => {
      if (!t) return;

      const tipo = (t.tipo_ticket || "").toUpperCase();
      const estadoN = normalizeEstado(t.estado);

      if (estadoN === "CANCELADO") {
        cancelado++;
      }

      if (tipo.includes("PREF")) {
        preferencial++;
      } else {
        normal++;
      }
    });

    return { totPreferencial: preferencial, totNormal: normal, totCancelado: cancelado };
  }, [tickets]);

  // Mapa id_usuario -> nombre legible
  const empleadosById = useMemo(() => {
    const map = {};
    for (const e of empleados) {
      const full =
        e.nombre_completo ||
        (e.nombre && e.apellido ? `${e.nombre} ${e.apellido}` : null) ||
        e.nombre_usuario ||
        e.correo ||
        `Usuario ${e.id_usuario}`;
      map[e.id_usuario] = full;
    }
    return map;
  }, [empleados]);

  // ===== Helpers dentro del componente =====
  const FechaHora = ({ value }) => {
    if (!value) return <span>—</span>;
    const d = new Date(value);
    return (
      <div style={{ lineHeight: 1.15 }}>
        <div>{d.toLocaleDateString("es-HN")}</div>
        <div style={{ fontSize: 12, color: "#6b7280" }}>
          {d.toLocaleTimeString("es-HN")}
        </div>
      </div>
    );
  };

  const getInicio = (t) => t?.iniciado_en || t?.llamado_en || null;

  const getDuracionAtencion = (t) => {
    if (!t) return "—";
    const estadoN = normalizeEstado(t.estado);
    const inicio = getInicio(t);
    if (!inicio) return "—";

    if (estadoN === "CANCELADO") {
      if (!t.finalizado_en) return "—";
      return msToHHMMSS(diffMs(inicio, t.finalizado_en));
    }
    if (estadoN === "FINALIZADO") {
      const fin = t.finalizado_en || Date.now();
      return msToHHMMSS(diffMs(inicio, fin));
    }
    return msToHHMMSS(diffMs(inicio, Date.now()));
  };

  const getTiempoEspera = (t) => {
    if (!t || !t.creado_en || !t.llamado_en) return "—";
    return msToHHMMSS(diffMs(t.creado_en, t.llamado_en));
  };

  const getEmpleadoNombre = (t) => {
    if (!t) return "—";
    const fromJoin =
      t.empleado ||
      t.nombre_empleado ||
      t.usuario_empleado ||
      t.nombre_usuario ||
      t.usuario;
    const fromMap = t.id_usuario != null ? empleadosById[t.id_usuario] : undefined;
    return fromJoin || fromMap || (t.id_usuario != null ? `Usuario ${t.id_usuario}` : "—");
  };

  const getEstadoChipClass = (t) =>
    `chip chip--${normalizeEstado(t?.estado).toLowerCase()}`;

  // ===== Data fetching =====
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${BASE_URL}tickets`, {
        params: {
          from: filtros.from,
          to: filtros.to,
          empleado_id: filtros.empleado_id || undefined,
          estado: filtros.estado || undefined,
          q: filtros.q || undefined,
        },
        withCredentials: true,
      });
      const data = res.data;
      const arr =
        (Array.isArray(data) ? data : data?.data || []).filter(Boolean) || [];
      setTickets(arr);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar los tickets");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [filtros.from, filtros.to, filtros.empleado_id, filtros.estado, filtros.q]);

  const fetchEmpleados = useCallback(async () => {
    try {
      const r1 = await axios.get(`${BASE_URL}usuario`, {
        params: { rol: "Atencion Tickets" },
        withCredentials: true,
      });
      let list = (r1.data || []).filter(Boolean);
      if (!list.length) {
        const r2 = await axios.get(`${BASE_URL}usuario`, {
          withCredentials: true,
        });
        list = (r2.data || []).filter(Boolean);
      }
      setEmpleados(list);
    } catch (e) {
      console.warn("No se pudo cargar empleados", e);
      setEmpleados([]);
    }
  }, []);

  const fetchTipos = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}tipo_ticket`, {
        withCredentials: true,
      });
      const lista = (res.data || []).filter(Boolean);
      setTipos(lista);
      setNuevoTicket((prev) => ({
        ...prev,
        id_tipo_ticket:
          prev.id_tipo_ticket || (lista?.[0]?.id_tipo_ticket ?? ""),
      }));
    } catch (e) {
      console.warn("No se pudo cargar tipos de ticket", e);
      setTipos([]);
    }
  }, []);

  const fetchTramites = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}tramites`, {
        withCredentials: true,
      });
      const lista = (res.data || []).filter(Boolean);
      setTramites(lista);
      setNuevoTicket((prev) => ({
        ...prev,
        id_tramite: prev.id_tramite || (lista?.[0]?.id_tramite ?? ""),
      }));
    } catch (e) {
      console.warn("No se pudo cargar trámites", e);
      setTramites([]);
    }
  }, []);

  // ===== Efectos =====
  useEffect(() => {
    fetchEmpleados();
    fetchTipos();
    fetchTramites();
  }, [fetchEmpleados, fetchTipos, fetchTramites]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ===== Crear =====
  const abrirCrear = () => {
    setNuevoTicket({
      id_tipo_ticket: tipos?.[0]?.id_tipo_ticket ?? "",
      id_tramite: tramites?.[0]?.id_tramite ?? "",
      nota: "",
    });
    setIsCreateOpen(true);
  };

  const crearTicket = async () => {
    try {
      await axios.post(
        `${BASE_URL}tickets`,
        {
          id_tipo_ticket: Number(nuevoTicket.id_tipo_ticket),
          id_tramite: nuevoTicket.id_tramite
            ? Number(nuevoTicket.id_tramite)
            : null,
          nota: (nuevoTicket.nota || "").trim(),
        },
        { withCredentials: true }
      );
      toast.success("Ticket creado");
      setIsCreateOpen(false);
      fetchTickets();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo crear el ticket");
    }
  };

  // ===== Editar =====
  const abrirEditar = (t) => {
    setEditTicket({
      id_ticket: t?.id_ticket ?? null,
      id_tipo_ticket: t?.id_tipo_ticket ?? "",
      id_tramite: t?.id_tramite ?? "",
      estado: normalizeEstado(t?.estado),
      nota: t?.nota || "",
    });
    setIsEditOpen(true);
  };

  const guardarEdicion = async () => {
    try {
      await axios.put(
        `${BASE_URL}tickets/${editTicket.id_ticket}`,
        {
          id_tipo_ticket: Number(editTicket.id_tipo_ticket),
          id_tramite: editTicket.id_tramite
            ? Number(editTicket.id_tramite)
            : null,
          estado: editTicket.estado,
          nota: (editTicket.nota || "").trim(),
        },
        { withCredentials: true }
      );
      toast.success("Ticket actualizado");
      setIsEditOpen(false);
      fetchTickets();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el ticket");
    }
  };

  // ===== Eliminar =====
  const abrirEliminar = (t) => {
    setDeleteTarget(t || null);
    setIsDeleteOpen(true);
  };

  const confirmarEliminar = async () => {
    if (!deleteTarget) return;
    try {
      await axios.delete(`${BASE_URL}tickets/${deleteTarget.id_ticket}`, {
        withCredentials: true,
      });
      toast.warn(`Ticket ${deleteTarget.NO_ticket} eliminado`);
      setIsDeleteOpen(false);
      setDeleteTarget(null);
      fetchTickets();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el ticket");
    }
  };

  const cancelarEliminar = () => {
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  // ===== Reporte PDF =====
  const generarReportePDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const marginX = 48;
      let cursorY = 56;

      const logoW = 72;
      const logoH = 72;
      doc.addImage(logoDGMM, "PNG", marginX, cursorY, logoW, logoH);

      const titleX = marginX + logoW + 18;
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Dirección General de la Marina Mercante", titleX, cursorY + 28);

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 53, 65);
      doc.text("Reporte Tickets", titleX, cursorY + 52);

      cursorY += Math.max(logoH, 64) + 18;
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 85, 90);
      const generado = new Date().toLocaleString("es-HN");
      doc.text(`Generado el: ${generado}`, marginX, cursorY);

      cursorY += 18;

      const head = [[
        "Ticket",
        "Tipo",
        "Estado",
        "Fecha",
        "Llamado",
        "Espera",
        "Fin",
        "Duración",
        "Empleado",
      ]];

      const body = (tickets || []).filter(Boolean).map((t) => {
        const fecha = (v) => (v ? new Date(v).toLocaleString("es-HN") : "—");
        const estadoN = normalizeEstado(t.estado);
        return [
          t.NO_ticket ?? "—",
          t.tipo_ticket ?? "—",
          estadoN,
          fecha(t.creado_en),
          fecha(t.llamado_en),
          getTiempoEspera(t),
          fecha(t.finalizado_en),
          getDuracionAtencion(t),
          getEmpleadoNombre(t),
        ];
      });

      autoTable(doc, {
        startY: cursorY + 12,
        margin: { left: marginX, right: marginX },
        head,
        body,
        styles: {
          fontSize: 9,
          cellPadding: 3,
          overflow: "linebreak",
          textColor: [33, 37, 41],
        },
        headStyles: {
          fillColor: [13, 41, 53],
          textColor: 255,
          fontStyle: "bold",
        },
        alternateRowStyles: {
          fillColor: [244, 247, 252],
        },
        tableWidth: "auto",
        didDrawPage: () => {
          const str = `Página ${doc.getNumberOfPages()}`;
          doc.setFontSize(9);
          doc.setTextColor(120);
          doc.text(str, pageW - marginX, pageH - 20, { align: "right" });
        },
      });

      const nombre = `Tickets_DGMM_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(nombre);
      toast.success("Reporte PDF generado");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    }
  };

  // ===== UI =====
  return (
    <div className="tk-root">
      <ToastContainer position="bottom-right" />

      {/* ===== Banner con logo ===== */}
      <div className="tk-brand">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      {/* ===== Encabezado oscuro con acciones ===== */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">TICKETS</div>
        <div className="tk-card-header__actions">
          <a className="tk-btn tk-btn--ghost" href="/">
            Volver al Menú Principal
          </a>
          <button className="tk-btn tk-btn--danger" onClick={generarReportePDF}>
            Generar Reporte
          </button>
          <button className="tk-btn tk-btn--primary" onClick={abrirCrear}>
            Nuevo Ticket
          </button>
        </div>
      </div>

      {/* ===== Tarjeta: resumen + filtros ===== */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Total:</strong> {resumen.total}
          <span className="sep">|</span>
          <strong>Rango:</strong> {resumen.rango}
        </div>

        {/* Filtros */}
        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Desde</label>
              <input
                type="date"
                value={filtros.from}
                onChange={(e) => setFiltros({ ...filtros, from: e.target.value })}
              />
            </div>

            <div className="tk-field">
              <label>Hasta</label>
              <input
                type="date"
                value={filtros.to}
                onChange={(e) => setFiltros({ ...filtros, to: e.target.value })}
              />
            </div>

            <div className="tk-field">
              <label>Empleado</label>
              <select
                value={filtros.empleado_id}
                onChange={(e) =>
                  setFiltros({ ...filtros, empleado_id: e.target.value })
                }
              >
                <option value="">Todos</option>
                {empleados.map((emp) => (
                  <option key={emp.id_usuario} value={emp.id_usuario}>
                    {emp.nombre_completo ||
                      (emp.nombre && emp.apellido
                        ? `${emp.nombre} ${emp.apellido}`
                        : emp.nombre_usuario)}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-field">
              <label>Estado</label>
              <select
                value={filtros.estado}
                onChange={(e) =>
                  setFiltros({ ...filtros, estado: e.target.value })
                }
              >
                <option value="">Todos</option>
                {ESTADOS.map((s) => (
                  <option key={s} value={s}>
                    {s.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-field">
              <label>Buscar</label>
              <input
                placeholder="# Ticket…"
                value={filtros.q}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && fetchTickets()}
              />
            </div>

            <div className="tk-field tk-field--actions">
              <button className="tk-btn" onClick={fetchTickets} disabled={loading}>
                {loading ? "Cargando…" : "Buscar"}
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                title="Restablecer filtros"
                onClick={() => {
                  setFiltros({
                    from: hoy,
                    to: hoy,
                    empleado_id: "",
                    estado: "",
                    q: "",
                  });
                  setTimeout(fetchTickets, 0);
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Resumen por tipo con iconos ===== */}
      <div className="tk-totales-card">
        <div className="tk-totales-title">Resumen por tipo de ticket</div>

        <div className="tk-totales-grid">
          {/* Preferenciales */}
          <div className="tk-totales-item tk-totales-pref">
            <FaWheelchair className="tk-totales-icon" />
            <div className="tk-totales-label">Preferenciales</div>
            <div className="tk-totales-value">{totPreferencial}</div>
          </div>

          {/* Normales */}
          <div className="tk-totales-item tk-totales-norm">
            <FaUserClock className="tk-totales-icon" />
            <div className="tk-totales-label">Normales</div>
            <div className="tk-totales-value">{totNormal}</div>
          </div>

          {/* Cancelados */}
          <div className="tk-totales-item tk-totales-canc">
            <FaTimesCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Cancelados</div>
            <div className="tk-totales-value">{totCancelado}</div>
          </div>
        </div>
      </div>

      {/* ===== Tabla ===== */}
      <div className="tk-tablewrap">
        <table className="tk-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Llamado</th>
              <th>Espera</th>
              <th>Fin</th>
              <th>Duración</th>
              <th>Empleado</th>
              <th className="col--acciones">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={10}>
                  <div className="tk-empty">
                    <div className="tk-empty-title">Sin resultados</div>
                    <div className="tk-empty-desc">
                      Ajusta el rango de fechas o los filtros y vuelve a intentar.
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={10}>
                  <div className="tk-loader">
                    <div className="tk-spinner" />
                    <span>Cargando datos…</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              tickets.filter(Boolean).map((t) => {
                const estadoN = normalizeEstado(t.estado);
                return (
                  <tr key={t.id_ticket}>
                    <td className="tk-mono">{t.NO_ticket}</td>
                    <td className="tk-mono">{t.tipo_ticket}</td>
                    <td>
                      <span className={getEstadoChipClass(t)}>{estadoN}</span>
                    </td>
                    <td>
                      <FechaHora value={t.creado_en} />
                    </td>
                    <td>
                      <FechaHora value={t.llamado_en} />
                    </td>
                    <td className="tk-mono">{getTiempoEspera(t)}</td>
                    <td>
                      <FechaHora value={t.finalizado_en} />
                    </td>
                    <td className="tk-mono">{getDuracionAtencion(t)}</td>
                    <td className="wrap">{getEmpleadoNombre(t)}</td>
                    <td className="acciones">
                      <button
                        className="tk-btn tk-btn--sm"
                        onClick={() => abrirEditar(t)}
                      >
                        Editar
                      </button>
                      <button
                        className="tk-btn tk-btn--sm tk-btn--danger"
                        onClick={() => abrirEliminar(t)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ===== MODAL CREAR ===== */}
      <Modal
        isOpen={isCreateOpen}
        onRequestClose={() => setIsCreateOpen(false)}
        className="tk-modal"
        overlayClassName="tk-overlay"
      >
        <h3>Nuevo Ticket</h3>

        <div className="tk-grid">
          <div className="tk-field">
            <label>Tipo de Ticket</label>
            <select
              value={nuevoTicket.id_tipo_ticket}
              onChange={(e) =>
                setNuevoTicket({ ...nuevoTicket, id_tipo_ticket: e.target.value })
              }
            >
              {tipos.length === 0 && <option value="">Cargando…</option>}
              {tipos.map((tp) => (
                <option key={tp.id_tipo_ticket} value={tp.id_tipo_ticket}>
                  {tp.tipo_ticket} ({tp.prefijo})
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label>Trámite</label>
            <select
              value={nuevoTicket.id_tramite}
              onChange={(e) =>
                setNuevoTicket({ ...nuevoTicket, id_tramite: e.target.value })
              }
            >
              {tramites.length === 0 && <option value="">Cargando…</option>}
              {tramites.map((tr) => (
                <option key={tr.id_tramite} value={tr.id_tramite}>
                  {tr.nombre_tramite}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field tk-field--col">
            <label>Nota</label>
            <textarea
              rows={3}
              placeholder="Observación (opcional)"
              value={nuevoTicket.nota}
              onChange={(e) =>
                setNuevoTicket({ ...nuevoTicket, nota: e.target.value })
              }
            />
          </div>
        </div>

        <div className="tk-modal-actions">
          <button className="tk-btn tk-btn--primary" onClick={crearTicket}>
            Guardar
          </button>
          <button
            className="tk-btn tk-btn--ghost"
            onClick={() => setIsCreateOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* ===== MODAL EDITAR ===== */}
      <Modal
        isOpen={isEditOpen}
        onRequestClose={() => setIsEditOpen(false)}
        className="tk-modal"
        overlayClassName="tk-overlay"
        shouldCloseOnOverlayClick={true}
        closeTimeoutMS={180}
      >
        <h3>Editar Ticket</h3>

        <div className="tk-grid">
          <div className="tk-field">
            <label>Tipo de Ticket</label>
            <select
              value={editTicket.id_tipo_ticket}
              onChange={(e) =>
                setEditTicket((p) => ({ ...p, id_tipo_ticket: e.target.value }))
              }
            >
              {tipos.length === 0 && <option value="">Cargando…</option>}
              {tipos.map((tp) => (
                <option key={tp.id_tipo_ticket} value={tp.id_tipo_ticket}>
                  {tp.tipo_ticket} ({tp.prefijo})
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label>Trámite</label>
            <select
              value={editTicket.id_tramite}
              onChange={(e) =>
                setEditTicket((p) => ({ ...p, id_tramite: e.target.value }))
              }
            >
              {tramites.length === 0 && <option value="">Cargando…</option>}
              {tramites.map((tr) => (
                <option key={tr.id_tramite} value={tr.id_tramite}>
                  {tr.nombre_tramite}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label>Estado</label>
            <select
              value={editTicket.estado}
              onChange={(e) =>
                setEditTicket((p) => ({ ...p, estado: e.target.value }))
              }
            >
              {ESTADOS.map((s) => (
                <option key={s} value={s}>
                  {s.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field tk-field--col">
            <label>Nota</label>
            <textarea
              rows={3}
              value={editTicket.nota}
              onChange={(e) =>
                setEditTicket((p) => ({ ...p, nota: e.target.value }))
              }
            />
          </div>

          <div className="tk-field tk-field--col">
            <label>Empleado que atendió</label>
            <input
              value="Se asigna automáticamente al iniciar atención"
              disabled
            />
          </div>
        </div>

        <div className="tk-modal-actions">
          <button className="tk-btn tk-btn--primary" onClick={guardarEdicion}>
            Guardar cambios
          </button>
          <button
            className="tk-btn tk-btn--ghost"
            onClick={() => setIsEditOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </Modal>

      {/* ===== MODAL ELIMINAR ===== */}      
      <Modal
        isOpen={isDeleteOpen}
        onRequestClose={cancelarEliminar}
        className="tk-modal"
        overlayClassName="tk-overlay"
      >
        <h3 className="tk-danger">Eliminar Ticket</h3>
        <div className="modal__content">
          <p>
            Estás a punto de eliminar el ticket{" "}
            <strong>{deleteTarget?.NO_ticket}</strong>.
          </p>
          <ul>
            <li>
              <strong>Tipo:</strong> {deleteTarget?.tipo_ticket}
            </li>
            <li>
              <strong>Estado:</strong> {normalizeEstado(deleteTarget?.estado)}
            </li>
            <li>
              <strong>Empleado:</strong> {getEmpleadoNombre(deleteTarget)}
            </li>
          </ul>
          <p>Esta acción es permanente.</p>
        </div>

        <div className="tk-modal-actions">
          <button className="tk-btn tk-btn--danger" onClick={confirmarEliminar}>
            Eliminar
          </button>
          <button className="tk-btn tk-btn--ghost" onClick={cancelarEliminar}>
            Cancelar
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default MantenimientoTickets;
