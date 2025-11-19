// src/MantTramites.jsx
import { useEffect, useState } from "react";
import api from "./api";
import "./tramites.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function MantTramites() {
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    nombre_tramite: "",
    descripcion: "",
    activo: true,
  });

  // 📅 Filtros de fecha
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  /* ================= CARGAR TRÁMITES ================= */
  const cargar = async () => {
    try {
      setLoading(true);

      const params = {};
      if (fromDate && toDate) {
        params.from = fromDate;
        params.to = toDate;
      }

      const { data } = await api.get("/tramites", { params });
      setTramites(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la lista de trámites");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ================= MANEJO DE FORMULARIO ================= */
  const abrirNuevo = () => {
    setEditing(null);
    setForm({
      nombre_tramite: "",
      descripcion: "",
      activo: true,
    });
    setShowForm(true);
  };

  const abrirEditar = (t) => {
    setEditing(t);
    setForm({
      nombre_tramite: t.nombre_tramite || "",
      descripcion: t.descripcion || "",
      activo: t.activo === 1 || t.activo === true,
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
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  /* ================= GUARDAR (CREAR / EDITAR) ================= */
  const guardar = async (e) => {
    e.preventDefault();
    if (!form.nombre_tramite.trim()) {
      alert("El nombre del trámite es obligatorio");
      return;
    }

    try {
      setLoading(true);

      if (editing) {
        await api.put(`/tramites/${editing.id_tramite}`, {
          nombre_tramite: form.nombre_tramite,
          descripcion: form.descripcion,
          activo: form.activo,
        });
        alert("Trámite actualizado correctamente");
      } else {
        await api.post("/tramites", {
          nombre_tramite: form.nombre_tramite,
          descripcion: form.descripcion,
        });
        alert("Trámite creado correctamente");
      }

      cerrarForm();
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        "No se pudo guardar el trámite";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ACTIVAR / DESACTIVAR ================= */
  const toggleActivo = async (t) => {
    const accion = t.activo ? "desactivar" : "activar";

    if (!window.confirm(`¿Deseas ${accion} el trámite "${t.nombre_tramite}"?`))
      return;

    try {
      setLoading(true);
      await api.patch(`/tramites/${t.id_tramite}/${accion}`);
      alert(`Trámite ${accion}o correctamente`);
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        `No se pudo ${accion} el trámite`;
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ================= ELIMINAR ================= */
  const eliminar = async (t) => {
    if (
      !window.confirm(
        `⚠️ Esto eliminará permanentemente el trámite.\n\n¿Eliminar "${t.nombre_tramite}"?`
      )
    )
      return;

    try {
      setLoading(true);
      await api.delete(`/tramites/${t.id_tramite}`);
      alert("Trámite eliminado correctamente");
      await cargar();
    } catch (e) {
      console.error(e);
      const msg =
        e.response?.data?.mensaje ||
        e.response?.data?.error ||
        "No se pudo eliminar el trámite";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ================= GENERAR REPORTE PDF ================= */
  const generarReporte = () => {
    if (!tramites.length) {
      alert("No hay datos para generar el reporte");
      return;
    }

    const doc = new jsPDF();
    const hoy = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const fechaHoy = `${pad(hoy.getDate())}/${pad(
      hoy.getMonth() + 1
    )}/${hoy.getFullYear()}`;

    doc.setFontSize(14);
    doc.text("Reporte de Trámites", 14, 15);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${fechaHoy}`, 14, 21);

    let y = 27;
    if (fromDate && toDate) {
      doc.text(`Rango de fechas: ${fromDate} a ${toDate}`, 14, y);
      y += 6;
    }

    const body = tramites.map((t) => [
      t.id_tramite,
      t.nombre_tramite,
      t.descripcion || "",
      t.activo ? "Activo" : "Inactivo",
      t.total_personas ?? 0,
      t.creado_en
        ? new Date(t.creado_en).toLocaleString()
        : "",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["ID", "Trámite", "Estado", "Personas", "Creado en"]],
      body: body.map((r) => [r[0], r[1], r[3], r[4], r[5]]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [200, 200, 200] },
    });

    doc.save("reporte_tramites.pdf");
  };

  /* ================= RENDER ================= */
  return (
    <div className="mt-page">
      <header className="mt-header">
        <div>
          <h2>Mantenimiento de Trámites</h2>
          <p className="mt-subtitle">
            Gestiona los trámites y consulta cuántas personas los
            realizaron en un rango de fechas.
          </p>
        </div>

        <div className="mt-header-right">
          <div className="mt-date-filters">
            <div className="mt-date-field">
              <label>Desde</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="mt-date-field">
              <label>Hasta</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <button
              className="btn btn-sm btn-primary"
              onClick={cargar}
              disabled={loading}
            >
              Filtrar
            </button>
            <button
              className="btn btn-sm"
              onClick={() => {
                setFromDate("");
                setToDate("");
                cargar();
              }}
              disabled={loading}
            >
              Limpiar
            </button>
            <button
              className="btn btn-sm btn-secondary"
              onClick={generarReporte}
              disabled={loading || !tramites.length}
            >
              Generar reporte
            </button>
          </div>

          <button className="btn btn-primary" onClick={abrirNuevo}>
            + Nuevo trámite
          </button>
        </div>
      </header>

      <section className="mt-table-wrap">
        <table className="mt-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre del trámite</th>
              <th>Descripción</th>
              <th>Estado</th>
              <th>Creado en</th>
              <th>Personas</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {tramites.length === 0 && (
              <tr>
                <td colSpan={7} className="mt-empty">
                  {loading ? "Cargando..." : "Sin registros"}
                </td>
              </tr>
            )}

            {tramites.map((t) => (
              <tr key={t.id_tramite}>
                <td>{t.id_tramite}</td>
                <td>{t.nombre_tramite}</td>
                <td>{t.descripcion || "—"}</td>

                <td>
                  {t.activo ? (
                    <span className="badge badge-ok">Activo</span>
                  ) : (
                    <span className="badge badge-off">Inactivo</span>
                  )}
                </td>

                <td>
                  {t.creado_en
                    ? new Date(t.creado_en).toLocaleString()
                    : "—"}
                </td>

                <td>{t.total_personas ?? 0}</td>

                <td>
                  <button
                    className="btn btn-sm"
                    onClick={() => abrirEditar(t)}
                  >
                    Editar
                  </button>

                  <button
                    className={`btn btn-sm ${
                      t.activo ? "btn-warning" : "btn-success"
                    }`}
                    onClick={() => toggleActivo(t)}
                    style={{ marginLeft: 4, marginRight: 4 }}
                  >
                    {t.activo ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => eliminar(t)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ===== Modal formulario ===== */}
      {showForm && (
        <div className="mt-modal-backdrop">
          <div className="mt-modal">
            <h3>{editing ? "Editar trámite" : "Nuevo trámite"}</h3>

            <form onSubmit={guardar} className="mt-form">
              <div className="mt-field">
                <label>Nombre del trámite *</label>
                <input
                  type="text"
                  name="nombre_tramite"
                  value={form.nombre_tramite}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="mt-field">
                <label>Descripción</label>
                <textarea
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  rows={3}
                />
              </div>

              {editing && (
                <div className="mt-field mt-inline">
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

              <div className="mt-actions">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  className="btn"
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

      {loading && <div className="mt-loading-bar">Procesando...</div>}
    </div>
  );
}
