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
import {
  FaWheelchair,
  FaUserClock,
  FaTimesCircle,
  FaCheckCircle,
  FaChartBar,
} from "react-icons/fa";

const BASE_URL = "http://localhost:49146/api/";
Modal.setAppElement("#root");

/* ===== Helpers ===== */
function normalizeEstado(estado) {
  const e = String(estado ?? "").toUpperCase().trim();
  return e || "";
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

// Fecha local YYYY-MM-DD
function hoyLocalYYYYMMDD() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const MantenimientoTickets = () => {
  // ===== Estado principal =====
  const [tickets, setTickets] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [tramites, setTramites] = useState([]);
  const [estadosCatalogo, setEstadosCatalogo] = useState([]); // estados de tbl_estado_ticket
  const [loading, setLoading] = useState(false);

  // Paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  // Totales globales
  const [totPreferencial, setTotPreferencial] = useState(0);
  const [totNormal, setTotNormal] = useState(0);
  const [totCancelado, setTotCancelado] = useState(0);
  const [totFinalizado, setTotFinalizado] = useState(0);
  const [avgEsperaSegundos, setAvgEsperaSegundos] = useState(0); // ⏱ promedio

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

  const hoy = hoyLocalYYYYMMDD();

  const [filtros, setFiltros] = useState({
    from: hoy,
    to: hoy,
    empleado_id: "",
    estado: "",
    q: "",
  });

  // ===== Memos =====
  const resumen = useMemo(
    () => ({ total, rango: `${filtros.from} a ${filtros.to}` }),
    [total, filtros.from, filtros.to]
  );

  const totalPages = useMemo(
    () => (pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1),
    [total, pageSize]
  );

  const esperaPromedio = useMemo(
    () => msToHHMMSS((avgEsperaSegundos || 0) * 1000),
    [avgEsperaSegundos]
  );

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
      return "00:00:00";
    }

    if (t.finalizado_en) {
      return msToHHMMSS(diffMs(inicio, t.finalizado_en));
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
    const fromMap =
      t.id_usuario != null ? empleadosById[t.id_usuario] : undefined;
    return (
      fromJoin ||
      fromMap ||
      (t.id_usuario != null ? `Usuario ${t.id_usuario}` : "—")
    );
  };

  const getEstadoChipClass = (t) =>
    `chip chip--${normalizeEstado(t?.estado).toLowerCase()}`;

  // ===== Data fetching (con cálculo de tarjetas en el front) =====
  const fetchTickets = useCallback(
    async (opts) => {
      const showLoading = opts?.showLoading ?? true;
      const targetPage = opts?.page ?? page;
      const size = opts?.pageSizeOverride ?? pageSize;

      if (showLoading) setLoading(true);

      try {
        const res = await axios.get(`${BASE_URL}tickets`, {
          params: {
            from: filtros.from,
            to: filtros.to,
            empleado_id: filtros.empleado_id || undefined,
            estado: filtros.estado || undefined,
            q: filtros.q || undefined,
            page: targetPage,
            pageSize: size,
          },
          withCredentials: true,
        });

        const payload = res.data;

        const rows =
          (Array.isArray(payload) ? payload : payload.data || []).filter(
            Boolean
          ) || [];

        setTickets(rows);

        // ====== Cálculos en el front por si el backend no manda totales ======
        let calcTotPref = 0;
        let calcTotNorm = 0;
        let calcTotCanc = 0;
        let calcTotFin = 0;

        let sumEsperaMs = 0;
        let countEspera = 0;

        rows.forEach((t) => {
          const tipo = String(t.tipo_ticket ?? "").toUpperCase();
          const est = normalizeEstado(t.estado);

          // Heurística preferencial/normal
          if (tipo.includes("PREF")) {
            calcTotPref++;
          } else {
            calcTotNorm++;
          }

          if (est === "CANCELADO") calcTotCanc++;
          if (est === "FINALIZADO") calcTotFin++;

          if (t.creado_en && t.llamado_en) {
            const ms = diffMs(t.creado_en, t.llamado_en);
            if (ms != null) {
              sumEsperaMs += ms;
              countEspera++;
            }
          }
        });

        const avgEsperaSegCalc =
          countEspera > 0 ? sumEsperaMs / 1000 / countEspera : 0;

        if (!Array.isArray(payload)) {
          const totalBackend = payload.total ?? rows.length;
          setTotal(totalBackend);

          setTotPreferencial(
            payload.totPreferencial ??
              payload.tot_preferencial ??
              calcTotPref
          );
          setTotNormal(
            payload.totNormal ??
              payload.tot_normal ??
              calcTotNorm
          );
          setTotCancelado(
            payload.totCancelado ??
              payload.tot_cancelado ??
              calcTotCanc
          );
          setTotFinalizado(
            payload.totFinalizado ??
              payload.tot_finalizado ??
              calcTotFin
          );

          const avgFromBackend =
            payload.avgEsperaSegundos ??
            payload.avg_espera_segundos ??
            null;

          setAvgEsperaSegundos(
            avgFromBackend != null ? avgFromBackend : avgEsperaSegCalc
          );

          if (typeof payload.page === "number") setPage(payload.page);
          if (typeof payload.pageSize === "number")
            setPageSize(payload.pageSize);
        } else {
          setTotal(rows.length);
          setTotPreferencial(calcTotPref);
          setTotNormal(calcTotNorm);
          setTotCancelado(calcTotCanc);
          setTotFinalizado(calcTotFin);
          setAvgEsperaSegundos(avgEsperaSegCalc);
        }
      } catch (e) {
        console.error(e);
        toast.error("Error al cargar los tickets");
        setTickets([]);
        setTotal(0);
        setTotPreferencial(0);
        setTotNormal(0);
        setTotCancelado(0);
        setTotFinalizado(0);
        setAvgEsperaSegundos(0);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [
      filtros.from,
      filtros.to,
      filtros.empleado_id,
      filtros.estado,
      filtros.q,
      page,
      pageSize,
    ]
  );

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

  const fetchEstados = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}estado_ticket`, {
        withCredentials: true,
      });
      const lista = (res.data || [])
        .filter(Boolean)
        .map((row) => ({
          ...row,
          estado: normalizeEstado(row.estado),
        }));
      setEstadosCatalogo(lista);
    } catch (e) {
      console.warn("No se pudo cargar estados de ticket", e);
      setEstadosCatalogo([]);
    }
  }, []);

  // ===== Efectos =====
  useEffect(() => {
    fetchEmpleados();
    fetchTipos();
    fetchTramites();
    fetchEstados();
  }, [fetchEmpleados, fetchTipos, fetchTramites, fetchEstados]);

  useEffect(() => {
    fetchTickets({ showLoading: true });
    const id = setInterval(() => {
      fetchTickets({ showLoading: false });
    }, 5000);
    return () => clearInterval(id);
  }, [fetchTickets]);

  // ===== Abrir ventanas externas =====
  const abrirCrear = () => {
    window.open(
      "http://localhost:5173/kiosko",
      "_blank",
      "noopener,noreferrer"
    );
  };

  const abrirMonitor = () => {
    window.open(
      "http://localhost:5173/monitor",
      "_blank",
      "noopener,noreferrer"
    );
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
      fetchTickets({ showLoading: false });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo crear el ticket");
    }
  };

  // ===== Paginación =====
  const totalPagesCalc = totalPages;
  const firstItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastItem = total === 0 ? 0 : Math.min(page * pageSize, total);

  const irPagina = (nuevoPage) => {
    if (nuevoPage < 1 || nuevoPage > totalPagesCalc) return;
    fetchTickets({ showLoading: true, page: nuevoPage });
  };

  const paginaAnterior = () => irPagina(page - 1);
  const paginaSiguiente = () => irPagina(page + 1);

  const handlePageSizeChange = (e) => {
    const newSize = Number(e.target.value) || 10;
    setPageSize(newSize);
    setPage(1);
    fetchTickets({ showLoading: true, page: 1, pageSizeOverride: newSize });
  };

  // ===== Editar / Eliminar =====
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
      fetchTickets({ showLoading: false });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo actualizar el ticket");
    }
  };

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
      fetchTickets({ showLoading: false });
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el ticket");
    }
  };

  const cancelarEliminar = () => {
    setIsDeleteOpen(false);
    setDeleteTarget(null);
  };

  // ===== PDF =====
  const generarReportePDF = async () => {
    try {
      const res = await axios.get(`${BASE_URL}tickets`, {
        params: {
          from: filtros.from,
          to: filtros.to,
          empleado_id: filtros.empleado_id || undefined,
          estado: filtros.estado || undefined,
          q: filtros.q || undefined,
          page: 1,
          pageSize: 100000,
        },
        withCredentials: true,
      });

      const payload = res.data;
      const rows =
        (Array.isArray(payload) ? payload : payload.data || []).filter(
          Boolean
        ) || [];

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      const marginX = 40;

      doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(14, 42, 59);
      doc.text("Dirección General de la Marina Mercante", 170, 50);

      doc.setFontSize(14);
      doc.text("Reporte de Tickets", 170, 72);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(
        `Generado el: ${new Date().toLocaleString("es-HN")}`,
        40,
        105
      );

      // Resumen tipo tarjetas
      let cursorY = 135;
      const boxW = 120;
      const boxH = 60;
      const gap = 10;
      const itemsPerRow = 3;

      const resumenItems = [
        { label: "Preferenciales", value: totPreferencial },
        { label: "Normales", value: totNormal },
        { label: "Cancelados", value: totCancelado },
        { label: "Finalizados", value: totFinalizado },
        { label: "Total filtrados", value: total },
        { label: "Espera promedio", value: esperaPromedio },
      ];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(
        "Resumen de tickets (según filtro aplicado)",
        marginX,
        cursorY - 8
      );

      resumenItems.forEach((item, idx) => {
        const row = Math.floor(idx / itemsPerRow);
        const col = idx % itemsPerRow;

        const x = marginX + col * (boxW + gap);
        const y = cursorY + row * (boxH + gap);

        doc.setFillColor(244, 247, 252);
        doc.setDrawColor(200, 210, 220);
        doc.roundedRect(x, y, boxW, boxH, 6, 6, "FD");

        doc.setFontSize(9);
        doc.setTextColor(70);
        doc.setFont("helvetica", "normal");
        doc.text(item.label, x + 8, y + 20);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(13, 53, 94);
        doc.text(String(item.value), x + 8, y + 40);
      });

      const rowsCount = Math.ceil(resumenItems.length / itemsPerRow);
      const tablaStartY = cursorY + rowsCount * (boxH + gap) + 20;

      const columnas = [
        "Ticket",
        "Tipo",
        "Estado",
        "Fecha creación",
        "Llamado",
        "Espera",
        "Fin",
        "Duración",
        "Empleado",
      ];

      const filas = rows.map((t) => [
        t.NO_ticket ?? "—",
        t.tipo_ticket ?? "—",
        normalizeEstado(t.estado),
        t.creado_en ? new Date(t.creado_en).toLocaleString("es-HN") : "—",
        t.llamado_en ? new Date(t.llamado_en).toLocaleString("es-HN") : "—",
        getTiempoEspera(t),
        t.finalizado_en
          ? new Date(t.finalizado_en).toLocaleString("es-HN")
          : "—",
        getDuracionAtencion(t),
        getEmpleadoNombre(t),
      ]);

      autoTable(doc, {
        startY: tablaStartY,
        head: [columnas],
        body: filas,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [242, 245, 247] },
      });

      const pageCount = doc.internal.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(100);

        doc.text(
          "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 30,
          { align: "center" }
        );

        doc.text(
          `Página ${i} de ${pageCount}`,
          40,
          doc.internal.pageSize.height - 30
        );
      }

      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (e) {
      console.error(e);
      toast.error("No se pudo generar el PDF");
    }
  };

  // ===== UI =====
  return (
    <div className="tk-root">
      <ToastContainer position="bottom-right" />

      {/* Encabezado */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">TICKETS</div>
        <div className="tk-card-header__actions">
          <a className="tk-btn tk-btn--ghost" href="/">
            Volver al Menú Principal
          </a>
          <button className="tk-btn tk-btn--danger" onClick={generarReportePDF}>
            Generar Reporte
          </button>
          <button className="tk-btn tk-btn--secondary" onClick={abrirMonitor}>
            Monitor
          </button>
          <button className="tk-btn tk-btn--primary" onClick={abrirCrear}>
            Nuevo Ticket
          </button>
        </div>
      </div>

      {/* Resumen + filtros */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Total registros filtrados:</strong> {resumen.total}
          <span className="sep">|</span>
          <strong>Rango:</strong> {resumen.rango}
        </div>

        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Desde</label>
              <input
                type="date"
                value={filtros.from}
                onChange={(e) =>
                  setFiltros({ ...filtros, from: e.target.value })
                }
              />
            </div>

            <div className="tk-field">
              <label>Hasta</label>
              <input
                type="date"
                value={filtros.to}
                onChange={(e) =>
                  setFiltros({ ...filtros, to: e.target.value })
                }
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
                {estadosCatalogo.map((st) => (
                  <option key={st.id_estado_ticket} value={st.estado}>
                    {st.estado.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-field">
              <label>Buscar</label>
              <input
                placeholder="# Ticket…"
                value={filtros.q}
                onChange={(e) =>
                  setFiltros({ ...filtros, q: e.target.value })
                }
                onKeyDown={(e) =>
                  e.key === "Enter" &&
                  fetchTickets({ showLoading: true, page: 1 })
                }
              />
            </div>

            <div className="tk-field tk-field--actions">
              <button
                className="tk-btn"
                onClick={() => {
                  setPage(1);
                  fetchTickets({ showLoading: true, page: 1 });
                }}
                disabled={loading}
              >
                {loading ? "Cargando…" : "Buscar"}
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                title="Restablecer filtros"
                onClick={() => {
                  const hoyStr = hoyLocalYYYYMMDD();
                  setFiltros({
                    from: hoyStr,
                    to: hoyStr,
                    empleado_id: "",
                    estado: "",
                    q: "",
                  });
                  setPage(1);
                  setTimeout(
                    () => fetchTickets({ showLoading: true, page: 1 }),
                    0
                  );
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="tk-totales-card">
        <div className="tk-totales-title">
          Resumen de tickets (filtro aplicado)
        </div>

        <div className="tk-totales-grid">
          <div className="tk-totales-item tk-totales-pref">
            <FaWheelchair className="tk-totales-icon" />
            <div className="tk-totales-label">Preferenciales</div>
            <div className="tk-totales-value">{totPreferencial}</div>
          </div>

          <div className="tk-totales-item tk-totales-norm">
            <FaUserClock className="tk-totales-icon" />
            <div className="tk-totales-label">Normales</div>
            <div className="tk-totales-value">{totNormal}</div>
          </div>

          <div className="tk-totales-item tk-totales-canc">
            <FaTimesCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Cancelados</div>
            <div className="tk-totales-value">{totCancelado}</div>
          </div>

          <div className="tk-totales-item tk-totales-final">
            <FaCheckCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Finalizados</div>
            <div className="tk-totales-value">{totFinalizado}</div>
          </div>

          <div className="tk-totales-item tk-totales-dia">
            <FaChartBar className="tk-totales-icon" />
            <div className="tk-totales-label">Total filtrados</div>
            <div className="tk-totales-value">{resumen.total}</div>
          </div>

          <div className="tk-totales-item tk-totales-avg">
            <div className="tk-totales-icon" style={{ fontSize: 28 }}>
              ⏱
            </div>
            <div className="tk-totales-label">Espera promedio</div>
            <div className="tk-totales-value">{esperaPromedio}</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
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
            </tr>
          </thead>
          <tbody>
            {!loading && tickets.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="tk-empty">
                    <div className="tk-empty-title">Sin resultados</div>
                    <div className="tk-empty-desc">
                      Ajusta el rango de fechas o los filtros y vuelve a
                      intentar.
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {loading && tickets.length === 0 && (
              <tr>
                <td colSpan={9}>
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
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="tk-pagination">
        <div className="tk-pagination-info">
          Mostrando{" "}
          <strong>
            {firstItem}–{lastItem}
          </strong>{" "}
          de <strong>{total}</strong> registros
        </div>

        <div className="tk-pagination-controls">
          <button
            className="tk-btn tk-btn--sm"
            onClick={paginaAnterior}
            disabled={page <= 1}
          >
            ‹ Anterior
          </button>

          <span className="tk-pagination-page">
            Página <strong>{page}</strong> de{" "}
            <strong>{totalPagesCalc}</strong>
          </span>

          <button
            className="tk-btn tk-btn--sm"
            onClick={paginaSiguiente}
            disabled={page >= totalPagesCalc}
          >
            Siguiente ›
          </button>

          <div className="tk-pagination-size">
            <span>Mostrar</span>
            <select value={pageSize} onChange={handlePageSizeChange}>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>por página</span>
          </div>
        </div>
      </div>

      {/* MODAL CREAR */}
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
                setNuevoTicket({
                  ...nuevoTicket,
                  id_tipo_ticket: e.target.value,
                })
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

      {/* MODAL EDITAR */}
      <Modal
        isOpen={isEditOpen}
        onRequestClose={() => setIsEditOpen(false)}
        className="tk-modal"
        overlayClassName="tk-overlay"
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
              {estadosCatalogo.length === 0 && (
                <option value="">Cargando…</option>
              )}
              {estadosCatalogo.map((st) => (
                <option key={st.id_estado_ticket} value={st.estado}>
                  {st.estado.replace(/_/g, " ")}
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

      {/* MODAL ELIMINAR */}
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
              <strong>Estado:</strong>{" "}
              {normalizeEstado(deleteTarget?.estado)}
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
