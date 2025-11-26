// MantTramites.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./mantenimientoTickets.css"; // mismo CSS de tickets
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import {
  FaCheckCircle,
  FaTimesCircle,
  FaChartBar,
  FaUserCheck,
  FaEdit,
  FaMinusCircle,
  FaTrashAlt,
} from "react-icons/fa";

const hoyISO = () => new Date().toISOString().slice(0, 10);

export default function MantTramites() {
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtros
  const [from, setFrom] = useState(hoyISO());
  const [to, setTo] = useState(hoyISO());
  const [estado, setEstado] = useState("Todos"); // Todos | Activos | Inactivos
  const [busqueda, setBusqueda] = useState("");

  // modal crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre_tramite: "",
    descripcion: "",
    activo: 1,
  });

  // modal de confirmación (activar/desactivar/eliminar)
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null); // "toggle" | "delete"
  const [targetTramite, setTargetTramite] = useState(null);

  // dropdown Acciones
  const [openMenuId, setOpenMenuId] = useState(null);

  // resumen
  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
    inactivos: 0,
    totalPersonas: 0,
  });

  // ======================
  // Cargar trámites (API)
  // ======================
  const construirParams = () => {
    const params = { from, to };

    if (estado === "Activos") params.activo = "1";
    else if (estado === "Inactivos") params.activo = "0";

    if (busqueda.trim()) params.nombre = busqueda.trim();
    return params;
  };

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await api.get("/tramites", { params: construirParams() });
      const data = res.data || [];
      setRows(data);

      // resumen
      let activos = 0;
      let inactivos = 0;
      let totalPersonas = 0;

      data.forEach((t) => {
        if (t.activo === 1) activos += 1;
        else inactivos += 1;
        totalPersonas += Number(t.total_personas || 0);
      });

      setStats({
        total: data.length,
        activos,
        inactivos,
        totalPersonas,
      });
    } catch (err) {
      console.error("Error cargando trámites:", err);
      setError("Error al cargar los trámites");
    }

    setLoading(false);
  };

  useEffect(() => {
    cargar();
  }, []);

  const limpiarFiltros = () => {
    const hoy = hoyISO();
    setFrom(hoy);
    setTo(hoy);
    setEstado("Todos");
    setBusqueda("");
    cargar();
  };

  // ======================
  //   Modal Nuevo / Edit
  // ======================
  const abrirNuevo = () => {
    setEditing(null);
    setForm({
      nombre_tramite: "",
      descripcion: "",
      activo: 1,
    });
    setShowModal(true);
  };

  const abrirEditar = (t) => {
    setEditing(t.id_tramite);
    setForm({
      nombre_tramite: t.nombre_tramite,
      descripcion: t.descripcion || "",
      activo: t.activo ? 1 : 0,
    });
    setShowModal(true);
  };

  const guardar = async () => {
    if (!form.nombre_tramite.trim()) {
      alert("El nombre del trámite es obligatorio");
      return;
    }

    const payload = {
      nombre_tramite: form.nombre_tramite.trim(),
      descripcion: form.descripcion.trim(),
      activo: form.activo ? 1 : 0,
    };

    try {
      if (editing) {
        await api.put(`/tramites/${editing}`, payload);
      } else {
        await api.post("/tramites", payload);
      }
      setShowModal(false);
      await cargar();
    } catch (err) {
      console.error("Error guardando trámite:", err);
      alert("Error al guardar el trámite");
    }
  };

  // ======================
  //   Activar / Desactivar
  // ======================
  const toggleActivo = async (t) => {
    const nuevoActivo = t.activo === 1 ? 0 : 1;

    try {
      await api.put(`/tramites/${t.id_tramite}`, {
        nombre_tramite: t.nombre_tramite,
        descripcion: t.descripcion || "",
        activo: nuevoActivo,
      });
      await cargar();
    } catch (err) {
      console.error("Error cambiando estado del trámite:", err);
      alert("No se pudo cambiar el estado del trámite");
    }
  };

  // ======================
  //   Eliminar
  // ======================
  const eliminar = async (id) => {
    try {
      await api.delete(`/tramites/${id}`);
      await cargar();
    } catch (err) {
      console.error("Error eliminando trámite:", err);
      alert("No se pudo eliminar el trámite");
    }
  };

  // ======================
  //   Abrir modal de confirmación
  // ======================
  const abrirConfirmToggle = (t) => {
    setTargetTramite(t);
    setConfirmAction("toggle");
    setConfirmOpen(true);
  };

  const abrirConfirmDelete = (t) => {
    setTargetTramite(t);
    setConfirmAction("delete");
    setConfirmOpen(true);
  };

  const cerrarConfirm = () => {
    setConfirmOpen(false);
    setConfirmAction(null);
    setTargetTramite(null);
  };

  const confirmarAccion = async () => {
    if (!targetTramite || !confirmAction) return;

    if (confirmAction === "toggle") {
      await toggleActivo(targetTramite);
    } else if (confirmAction === "delete") {
      await eliminar(targetTramite.id_tramite);
    }

    cerrarConfirm();
  };

  // ======================
  //   PDF (similar a Tickets)
  // ======================
  const generarReportePDF = async () => {
    try {
      const res = await api.get("/tramites", {
        params: construirParams(),
      });

      const data = (res.data || []).filter(Boolean);

      // Recalcular stats para el PDF según filtro
      let activos = 0;
      let inactivos = 0;
      let totalPersonas = 0;

      data.forEach((t) => {
        if (t.activo === 1) activos += 1;
        else inactivos += 1;
        totalPersonas += Number(t.total_personas || 0);
      });

      const total = data.length;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      const marginX = 40;

      // === ENCABEZADO ===
      doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(14, 42, 59);
      doc.text("Dirección General de la Marina Mercante", 170, 50);

      doc.setFontSize(14);
      doc.text("Reporte de Trámites", 170, 72);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(
        `Generado el: ${new Date().toLocaleString("es-HN")}`,
        40,
        105
      );

      // === RESUMEN TARJETAS ===
      let cursorY = 135;

      const boxW = 140;
      const boxH = 60;
      const gap = 10;
      const itemsPerRow = 3;

      const resumenItems = [
        { label: "Activos", value: activos },
        { label: "Inactivos", value: inactivos },
        { label: "Total trámites", value: total },
        {
          label: "Personas atendidas (tickets finalizados)",
          value: totalPersonas,
        },
      ];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(20);
      doc.text(
        "Resumen de trámites (según filtro aplicado)",
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

      // === TABLA ===
      const columnas = [
        "#",
        "Trámite",
        "Descripción",
        "Estado",
        "Creado en",
        "Personas",
      ];

      const filas = data.map((t, idx) => [
        idx + 1,
        t.nombre_tramite || "—",
        t.descripcion || "—",
        t.activo === 1 ? "ACTIVO" : "INACTIVO",
        t.creado_en
          ? new Date(t.creado_en).toLocaleString("es-HN")
          : "—",
        t.total_personas || 0,
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
      alert("No se pudo generar el PDF");
    }
  };

  // ======================
  // Render
  // ======================
  return (
    <div className="tk-root">
      {/* Encabezado */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">TRÁMITES</div>
        <div className="tk-card-header__actions">
          <button
            className="tk-btn tk-btn--ghost"
            onClick={() => navigate("/dashboard")}
          >
            Volver al Menú Principal
          </button>
          <button
            className="tk-btn tk-btn--danger"
            onClick={generarReportePDF}
          >
            Generar Reporte
          </button>
          <button className="tk-btn tk-btn--primary" onClick={abrirNuevo}>
            Nuevo Trámite
          </button>
        </div>
      </div>

      {/* Resumen + filtros */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Total registros filtrados:</strong> {stats.total}
          <span className="sep">|</span>
          <strong>Rango:</strong> {from} a {to}
        </div>

        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Desde</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </div>

            <div className="tk-field">
              <label>Hasta</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>

            <div className="tk-field">
              <label>Estado</label>
              <select
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                <option value="Todos">Todos</option>
                <option value="Activos">Activos</option>
                <option value="Inactivos">Inactivos</option>
              </select>
            </div>

            <div className="tk-field">
              <label>Buscar</label>
              <input
                type="text"
                placeholder="Nombre del trámite…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && cargar()}
              />
            </div>

            <div className="tk-field tk-field--actions">
              <button className="tk-btn" onClick={cargar} disabled={loading}>
                {loading ? "Cargando…" : "Buscar"}
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                title="Restablecer filtros"
                onClick={limpiarFiltros}
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
          Resumen de trámites (filtro aplicado)
        </div>

        <div className="tk-totales-grid">
          <div className="tk-totales-item tk-totales-pref">
            <FaCheckCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Activos</div>
            <div className="tk-totales-value">{stats.activos}</div>
          </div>

          <div className="tk-totales-item tk-totales-canc">
            <FaTimesCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Inactivos</div>
            <div className="tk-totales-value">{stats.inactivos}</div>
          </div>

          <div className="tk-totales-item tk-totales-dia">
            <FaChartBar className="tk-totales-icon" />
            <div className="tk-totales-label">Total trámites</div>
            <div className="tk-totales-value">{stats.total}</div>
          </div>

          <div className="tk-totales-item tk-totales-avg">
            <FaUserCheck className="tk-totales-icon" />
            <div className="tk-totales-label">
              Personas atendidas (tickets finalizados)
            </div>
            <div className="tk-totales-value">{stats.totalPersonas}</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="tk-tablewrap">
        <table className="tk-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Trámite</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Creado en</th>
              <th>Total personas</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="tk-loader">
                    <div className="tk-spinner" />
                    <span>Cargando datos…</span>
                  </div>
                </td>
              </tr>
            )}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7}>
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

            {!loading &&
              rows.map((t, idx) => (
                <tr key={t.id_tramite}>
                  <td className="tk-mono">{idx + 1}</td>
                  <td>{t.nombre_tramite}</td>
                  <td className="wrap">{t.descripcion}</td>
                  <td>
                    {t.activo === 1 ? (
                      <span className="chip chip--finalizado">ACTIVO</span>
                    ) : (
                      <span className="chip chip--cancelado">INACTIVO</span>
                    )}
                  </td>
                  <td>
                    {t.creado_en
                      ? new Date(t.creado_en).toLocaleDateString("es-HN")
                      : "—"}
                  </td>
                  <td className="tk-mono">{t.total_personas || 0}</td>
                  <td>
                    <div
                      className="tk-actions"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="tk-actions-btn"
                        onClick={() =>
                          setOpenMenuId(
                            openMenuId === t.id_tramite ? null : t.id_tramite
                          )
                        }
                      >
                        Acciones ▾
                      </button>

                      {openMenuId === t.id_tramite && (
                        <div className="tk-actions-menu">
                          <button
                            type="button"
                            className="tk-actions-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              abrirEditar(t);
                            }}
                          >
                            <FaEdit style={{ marginRight: 6 }} />
                            Editar
                          </button>

                          <button
                            type="button"
                            className="tk-actions-item"
                            onClick={() => {
                              setOpenMenuId(null);
                              abrirConfirmToggle(t);
                            }}
                          >
                            <FaMinusCircle
                              style={{ marginRight: 6, color: "#f97373" }}
                            />
                            {t.activo === 1 ? "Desactivar" : "Activar"}
                          </button>

                          <button
                            type="button"
                            className="tk-actions-item danger"
                            onClick={() => {
                              setOpenMenuId(null);
                              abrirConfirmDelete(t);
                            }}
                          >
                            <FaTrashAlt style={{ marginRight: 6 }} />
                            Eliminar
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {showModal && (
        <div className="tk-overlay">
          <div className="tk-modal">
            <h3>{editing ? "Editar Trámite" : "Nuevo Trámite"}</h3>

            <div className="tk-grid">
              <div className="tk-field tk-field--col">
                <label>Nombre del trámite</label>
                <input
                  type="text"
                  value={form.nombre_tramite}
                  onChange={(e) =>
                    setForm({ ...form, nombre_tramite: e.target.value })
                  }
                />
              </div>

              <div className="tk-field tk-field--col">
                <label>Descripción</label>
                <textarea
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                />
              </div>

              <div className="tk-field">
                <label>Estado</label>
                <select
                  value={form.activo}
                  onChange={(e) =>
                    setForm({ ...form, activo: Number(e.target.value) })
                  }
                >
                  <option value={1}>ACTIVO</option>
                  <option value={0}>INACTIVO</option>
                </select>
              </div>
            </div>

            <div className="tk-modal-actions">
              <button className="tk-btn tk-btn--primary" onClick={guardar}>
                Guardar
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMACIÓN */}
      {confirmOpen && (
        <div className="tk-overlay">
          <div className="tk-modal">
            <h3
              className={
                confirmAction === "delete" ? "tk-danger" : undefined
              }
            >
              {confirmAction === "delete"
                ? "Eliminar Trámite"
                : "Cambiar estado del trámite"}
            </h3>

            <div className="modal__content">
              <p>
                Estás a punto de{" "}
                <strong>
                  {confirmAction === "delete"
                    ? "eliminar"
                    : targetTramite?.activo === 1
                    ? "desactivar"
                    : "activar"}
                </strong>{" "}
                el trámite{" "}
                <strong>{targetTramite?.nombre_tramite}</strong>.
              </p>

              <ul>
                <li>
                  <strong>Estado actual:</strong>{" "}
                  {targetTramite?.activo === 1 ? "ACTIVO" : "INACTIVO"}
                </li>
                <li>
                  <strong>Descripción:</strong>{" "}
                  {targetTramite?.descripcion || "Sin descripción"}
                </li>
              </ul>

              {confirmAction === "delete" && (
                <p>Esta acción es permanente.</p>
              )}
            </div>

            <div className="tk-modal-actions">
              <button
                className={
                  confirmAction === "delete"
                    ? "tk-btn tk-btn--danger"
                    : "tk-btn tk-btn--primary"
                }
                onClick={confirmarAccion}
              >
                Confirmar
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                onClick={cerrarConfirm}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
