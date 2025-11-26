// src/MantenimientoTipoTicket.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import "./tramites.css"; // mismo diseño tk- que trámites/tickets
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { MdCheckCircle, MdBlock, MdListAlt } from "react-icons/md";
import { FaEdit, FaMinusCircle, FaTrashAlt } from "react-icons/fa";

/* Normaliza estado a ACTIVO / INACTIVO */
function normalizeEstado(raw) {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "ACTIVO" || v === "INACTIVO") return v;
  if (v === "1") return "ACTIVO";
  if (v === "0") return "INACTIVO";
  return "ACTIVO";
}

export default function MantenimientoTipoTicket() {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal formulario
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    tipo_ticket: "",
    prefijo: "",
    activo: true, // true => ACTIVO
  });

  // filtros
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroEstado, setFiltroEstado] = useState(""); // "", "ACTIVO", "INACTIVO"

  // dropdown Acciones (igual patrón que en Trámites)
  const [openMenuId, setOpenMenuId] = useState(null);

  /* =============== CARGAR TIPOS DE TICKET =============== */
  const cargar = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/tipo_ticket");
      const rows = (Array.isArray(data) ? data : []).map((t) => ({
        ...t,
        estado: normalizeEstado(t.estado),
        prefijo: (t.prefijo || "").toUpperCase(),
      }));
      setTipos(rows);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la lista de tipos de ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  /* =============== RESUMÉN (tarjetas) =============== */
  const resumen = useMemo(() => {
    let activos = 0;
    let inactivos = 0;

    tipos.forEach((t) => {
      const est = normalizeEstado(t.estado);
      if (est === "ACTIVO") activos++;
      else inactivos++;
    });

    return {
      totalTipos: tipos.length,
      totalActivos: activos,
      totalInactivos: inactivos,
    };
  }, [tipos]);

  /* =============== FILTRO EN MEMORIA =============== */
  const tiposFiltrados = useMemo(() => {
    return tipos.filter((t) => {
      const est = normalizeEstado(t.estado);

      if (filtroEstado && est !== filtroEstado) return false;

      if (filtroNombre.trim()) {
        const q = filtroNombre.trim().toLowerCase();
        const nombre = String(t.tipo_ticket || "").toLowerCase();
        return nombre.includes(q);
      }

      return true;
    });
  }, [tipos, filtroNombre, filtroEstado]);

  /* =============== FORMULARIO (nuevo / editar) =============== */
  const abrirNuevo = () => {
    setEditing(null);
    setForm({
      tipo_ticket: "",
      prefijo: "",
      activo: true,
    });
    setShowForm(true);
  };

  const abrirEditar = (t) => {
    setEditing(t);
    setForm({
      tipo_ticket: t.tipo_ticket || "",
      prefijo: (t.prefijo || "").toUpperCase(),
      activo: normalizeEstado(t.estado) === "ACTIVO",
    });
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "prefijo"
          ? value.toUpperCase()
          : type === "checkbox"
          ? checked
          : value,
    }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!form.tipo_ticket.trim()) {
      alert("El tipo de ticket es obligatorio");
      return;
    }
    if (!form.prefijo.trim()) {
      alert("El prefijo es obligatorio");
      return;
    }

    const payload = {
      tipo_ticket: form.tipo_ticket.trim(),
      prefijo: form.prefijo.trim().toUpperCase(),
      estado: form.activo ? "ACTIVO" : "INACTIVO",
    };

    try {
      setLoading(true);

      if (editing) {
        await api.put("/tipo_ticket", {
          ...payload,
          id_tipo_ticket: editing.id_tipo_ticket,
        });
        alert("Tipo de ticket actualizado correctamente");
      } else {
        await api.post("/tipo_ticket", payload);
        alert("Tipo de ticket creado correctamente");
      }

      cerrarForm();
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        "No se pudo guardar el tipo de ticket";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =============== ACTIVAR / DESACTIVAR =============== */
  const toggleActivo = async (t) => {
    const estActual = normalizeEstado(t.estado);
    const nuevo = estActual === "ACTIVO" ? "INACTIVO" : "ACTIVO";
    const accion = estActual === "ACTIVO" ? "desactivar" : "activar";

    if (
      !window.confirm(
        `¿Deseas ${accion} el tipo de ticket "${t.tipo_ticket}"?`
      )
    )
      return;

    try {
      setLoading(true);
      await api.patch(`/tipo_ticket/${t.id_tipo_ticket}`, {
        estado: nuevo,
      });
      alert(`Tipo de ticket ${accion}o correctamente`);
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        `No se pudo ${accion} el tipo de ticket`;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =============== ELIMINAR =============== */
  const eliminar = async (t) => {
    if (
      !window.confirm(
        `⚠️ Esto eliminará permanentemente el tipo de ticket.\n\n¿Eliminar "${t.tipo_ticket}"?`
      )
    )
      return;

    try {
      setLoading(true);
      await api.delete(`/tipo_ticket/${t.id_tipo_ticket}`);
      alert("Tipo de ticket eliminado correctamente");
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        "No se pudo eliminar el tipo de ticket";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* =============== REPORTE PDF =============== */
  const generarReporte = () => {
    if (!tiposFiltrados.length) {
      alert("No hay datos para generar el reporte");
      return;
    }

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "pt",
        format: "A4",
      });

      try {
        doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
      } catch {}

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(14, 42, 59);
      doc.text(
        "Dirección General de la Marina Mercante",
        170,
        50
      );

      doc.setFontSize(14);
      doc.text("Reporte de Tipos de Ticket", 170, 72);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(
        `Generado el: ${new Date().toLocaleString("es-HN")}`,
        40,
        105
      );

      const columnas = ["Tipo de ticket", "Estado", "Prefijo"];
      const filas = tiposFiltrados.map((t) => [
        t.tipo_ticket,
        normalizeEstado(t.estado),
        t.prefijo || "—",
      ]);

      autoTable(doc, {
        startY: 125,
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

  /* =============== RENDER =============== */
  return (
    <div className="tk-root">
      {/* Encabezado oscuro */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">TIPOS DE TICKET</div>
        <div className="tk-card-header__actions">
          <button
            className="tk-btn tk-btn--ghost"
            onClick={generarReporte}
            disabled={loading || !tiposFiltrados.length}
          >
            Generar reporte
          </button>
          <button className="tk-btn tk-btn--primary" onClick={abrirNuevo}>
            + Nuevo tipo
          </button>
        </div>
      </div>

      {/* Resumen + filtros */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Total tipos:</strong> {resumen.totalTipos}
          <span className="sep">|</span>
          <strong>Activos:</strong> {resumen.totalActivos}
          <span className="sep">|</span>
          <strong>Inactivos:</strong> {resumen.totalInactivos}
        </div>

        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="ACTIVO">Activos</option>
                <option value="INACTIVO">Inactivos</option>
              </select>
            </div>

            <div className="tk-field">
              <label>Buscar por nombre</label>
              <input
                type="text"
                placeholder="Nombre del tipo de ticket…"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>

            <div className="tk-field" />
            <div className="tk-field" />

            <div className="tk-field tk-field--actions">
              <button
                className="tk-btn"
                type="button"
                disabled={loading}
                onClick={() => {}}
              >
                Buscar
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                type="button"
                disabled={loading}
                onClick={() => {
                  setFiltroEstado("");
                  setFiltroNombre("");
                }}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas resumen */}
      <div className="tk-totales-card">
        <div className="tk-totales-title">Resumen de tipos de ticket</div>
        <div className="tk-totales-grid">
          <div className="tk-totales-item tk-totales-final">
            <MdCheckCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Activos</div>
            <div className="tk-totales-value">{resumen.totalActivos}</div>
          </div>

          <div className="tk-totales-item tk-totales-canc">
            <MdBlock className="tk-totales-icon" />
            <div className="tk-totales-label">Inactivos</div>
            <div className="tk-totales-value">{resumen.totalInactivos}</div>
          </div>

          <div className="tk-totales-item tk-totales-pref">
            <MdListAlt className="tk-totales-icon" />
            <div className="tk-totales-label">Total tipos</div>
            <div className="tk-totales-value">{resumen.totalTipos}</div>
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="tk-tablewrap">
        <table className="tk-table">
          <thead>
            <tr>
              <th>Nombre del tipo</th>
              <th>Prefijo</th>
              <th>Estado</th>
              <th className="col--acciones">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {tiposFiltrados.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="tk-empty">
                    <div className="tk-empty-title">
                      {loading ? "Cargando…" : "Sin registros"}
                    </div>
                    {!loading && (
                      <div className="tk-empty-desc">
                        Ajusta filtros o agrega un nuevo tipo de ticket.
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {tiposFiltrados.map((t) => (
              <tr key={t.id_tipo_ticket}>
                <td className="wrap">{t.tipo_ticket}</td>
                <td className="wrap tk-mono">{t.prefijo}</td>

                <td>
                  {normalizeEstado(t.estado) === "ACTIVO" ? (
                    <span className="chip chip--finalizado">ACTIVO</span>
                  ) : (
                    <span className="chip chip--cancelado">INACTIVO</span>
                  )}
                </td>

                <td>
                  <div className="tk-actions">
                    <button
                      type="button"
                      className="tk-actions-btn"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === t.id_tipo_ticket
                            ? null
                            : t.id_tipo_ticket
                        )
                      }
                    >
                      Acciones ▾
                    </button>

                    {openMenuId === t.id_tipo_ticket && (
                      <div className="tk-actions-menu tk-actions-menu--inline">
                        {/* Editar */}
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

                        {/* Activar / Desactivar */}
                        <button
                          type="button"
                          className="tk-actions-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            toggleActivo(t);
                          }}
                        >
                          <FaMinusCircle
                            style={{
                              marginRight: 6,
                              color:
                                normalizeEstado(t.estado) === "ACTIVO"
                                  ? "#e11d48"
                                  : "#10b981",
                            }}
                          />
                          {normalizeEstado(t.estado) === "ACTIVO"
                            ? "Desactivar"
                            : "Activar"}
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          className="tk-actions-item danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            eliminar(t);
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

      {/* Modal nuevo / editar */}
      {showForm && (
        <div className="tk-overlay">
          <div className="tk-modal">
            <h3>
              {editing ? "Editar tipo de ticket" : "Nuevo tipo de ticket"}
            </h3>

            <form onSubmit={guardar}>
              <div className="tk-grid">
                <div className="tk-field tk-field--col">
                  <label>Tipo de ticket *</label>
                  <input
                    type="text"
                    name="tipo_ticket"
                    value={form.tipo_ticket}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="tk-field tk-field--col">
                  <label>Prefijo *</label>
                  <input
                    type="text"
                    name="prefijo"
                    maxLength={5}
                    value={form.prefijo}
                    onChange={handleChange}
                    required
                  />
                </div>

                {editing && (
                  <div className="tk-field tk-field--col">
                    <label>
                      <input
                        type="checkbox"
                        name="activo"
                        checked={form.activo}
                        onChange={handleChange}
                      />{" "}
                      Activo
                    </label>
                  </div>
                )}
              </div>

              <div className="tk-modal-actions">
                <button
                  type="submit"
                  className="tk-btn tk-btn--primary"
                  disabled={loading}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="tk-btn tk-btn--ghost"
                  onClick={cerrarForm}
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", marginTop: 8 }}>Procesando…</div>
      )}
    </div>
  );
}
