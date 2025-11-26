// src/MantVentanilla.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";
import { ToastContainer, toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "react-toastify/dist/ReactToastify.css";
import "./mantenimientoTickets.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaListAlt, FaCheckCircle, FaTimesCircle, FaUserSlash } from "react-icons/fa";

const BASE_URL = "http://localhost:49146/api/";
const U = (s) => String(s ?? "").trim().toUpperCase();

export default function MantVentanilla() {
  const [ventanillas, setVentanillas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    q: "",
    estado: "",
    usuario_id: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    nombre_ventanilla: "",
    codigo: "",
    ubicacion: "",
    descripcion: "",
    estado: "ACTIVA",
    id_usuario: "",
  });

  /* MEMOS */
  const empleadosById = useMemo(() => {
    const map = {};
    empleados.forEach((e) => {
      const full =
        e.nombre_completo ||
        (e.nombre && e.apellido ? `${e.nombre} ${e.apellido}` : null) ||
        e.nombre_usuario ||
        e.correo ||
        `Usuario ${e.id_usuario}`;
      map[e.id_usuario] = full;
    });
    return map;
  }, [empleados]);

  const ventanillasFiltradas = useMemo(() => {
    const q = filtros.q.trim().toLowerCase();
    const est = U(filtros.estado);
    const user = filtros.usuario_id;

    return ventanillas.filter((v) => {
      let ok = true;

      if (q) {
        const cad = `${v.nombre_ventanilla} ${v.codigo} ${v.ubicacion || ""} ${
          v.descripcion || ""
        }`.toLowerCase();
        ok = ok && cad.includes(q);
      }

      if (est) ok = ok && U(v.estado) === est;
      if (user) ok = ok && String(v.id_usuario || "") === user;

      return ok;
    });
  }, [ventanillas, filtros]);

  const resumen = useMemo(() => {
    let activas = 0;
    let inactivas = 0;
    let sinAsignar = 0;

    ventanillas.forEach((v) => {
      if (!v.id_usuario) sinAsignar++;
      if (U(v.estado) === "ACTIVA") activas++;
      else inactivas++;
    });

    return {
      total: ventanillas.length,
      activas,
      inactivas,
      sinAsignar,
      filtradas: ventanillasFiltradas.length,
    };
  }, [ventanillas, ventanillasFiltradas]);

  /* FETCH */
  const cargarEmpleados = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}usuario`, { withCredentials: true });
      setEmpleados((res.data || []).filter(Boolean));
    } catch (e) {
      setEmpleados([]);
    }
  }, []);

  const cargarVentanillas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}ventanilla`, { withCredentials: true });
      setVentanillas((res.data || []).filter(Boolean));
    } catch (e) {
      toast.error("No se pudieron cargar las ventanillas");
      setVentanillas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarEmpleados();
    cargarVentanillas();
  }, [cargarEmpleados, cargarVentanillas]);

  /* FORMULARIO */
  const abrirNueva = () => {
    setEditing(null);
    setForm({
      nombre_ventanilla: "",
      codigo: "",
      ubicacion: "",
      descripcion: "",
      estado: "ACTIVA",
      id_usuario: "",
    });
    setShowForm(true);
  };

  const abrirEditar = (row) => {
    setEditing(row);
    setForm({
      nombre_ventanilla: row.nombre_ventanilla,
      codigo: row.codigo,
      ubicacion: row.ubicacion,
      descripcion: row.descripcion,
      estado: U(row.estado),
      id_usuario: row.id_usuario || "",
    });
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const guardar = async (e) => {
    e.preventDefault();
    const payload = {
      nombre_ventanilla: form.nombre_ventanilla.trim(),
      codigo: U(form.codigo),
      ubicacion: form.ubicacion.trim() || null,
      descripcion: form.descripcion.trim() || null,
      estado: U(form.estado),
      id_usuario: form.id_usuario ? Number(form.id_usuario) : null,
    };

    if (!payload.nombre_ventanilla || !payload.codigo) {
      toast.warn("Nombre y código son obligatorios");
      return;
    }

    try {
      setLoading(true);

      if (editing) {
        await axios.put(`${BASE_URL}ventanilla/${editing.id_ventanilla}`, payload, {
          withCredentials: true,
        });
        toast.success("Ventanilla actualizada con éxito");
      } else {
        await axios.post(`${BASE_URL}ventanilla`, payload, { withCredentials: true });
        toast.success("Ventanilla creada con éxito");
      }

      cerrarForm();
      cargarVentanillas();
    } catch (e) {
      toast.error("No se pudo guardar la ventanilla");
    } finally {
      setLoading(false);
    }
  };

  /* ELIMINAR */
  const eliminar = async (row) => {
    if (!window.confirm(`¿Eliminar ventanilla "${row.nombre_ventanilla}"?`)) return;

    try {
      setLoading(true);
      await axios.delete(`${BASE_URL}ventanilla/${row.id_ventanilla}`, {
        withCredentials: true,
      });
      toast.warn("Ventanilla eliminada");
      cargarVentanillas();
    } catch (e) {
      toast.error("No se pudo eliminar");
    } finally {
      setLoading(false);
    }
  };

  /* PDF (igual al estilo de tickets) */
  const generarReporte = () => {
    if (!ventanillasFiltradas.length) {
      toast.info("No hay datos para el reporte");
      return;
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    const marginX = 40;

    try {
      doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    } catch {}

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Ventanillas", 170, 72);

    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleString("es-HN")}`, 40, 105);

    const columnas = ["Nombre", "Código", "Ubicación", "Usuario", "Estado"];

    const filas = ventanillasFiltradas.map((v) => [
      v.nombre_ventanilla,
      v.codigo,
      v.ubicacion || "—",
      v.id_usuario ? empleadosById[v.id_usuario] : "—",
      U(v.estado),
    ]);

    autoTable(doc, {
      startY: 130,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
    });

    window.open(doc.output("bloburl"), "_blank");
  };

  /* RENDER */
  return (
    <div className="tk-root">
      <ToastContainer position="bottom-right" />

      {/* HEADER */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">VENTANILLAS</div>

        <div className="tk-card-header__actions">
          <button className="tk-btn tk-btn--danger" onClick={generarReporte}>
            Generar reporte
          </button>
          <button className="tk-btn tk-btn--primary" onClick={abrirNueva}>
            Nueva ventanilla
          </button>
        </div>
      </div>

      {/* CARD FILTROS */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Filtradas:</strong> {resumen.filtradas}
          <span className="sep">|</span>
          <strong>Total:</strong> {resumen.total}
        </div>

        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Buscar</label>
              <input
                value={filtros.q}
                onChange={(e) => setFiltros({ ...filtros, q: e.target.value })}
                placeholder="Nombre, código..."
              />
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
                <option value="ACTIVA">Activa</option>
                <option value="INACTIVA">Inactiva</option>
              </select>
            </div>

            <div className="tk-field">
              <label>Usuario asignado</label>
              <select
                value={filtros.usuario_id}
                onChange={(e) =>
                  setFiltros({ ...filtros, usuario_id: e.target.value })
                }
              >
                <option value="">Todos</option>
                {empleados.map((u) => (
                  <option key={u.id_usuario} value={u.id_usuario}>
                    {empleadosById[u.id_usuario]}
                  </option>
                ))}
              </select>
            </div>

            <div className="tk-field tk-field--actions">
              <button className="tk-btn" onClick={cargarVentanillas}>
                Actualizar
              </button>
              <button
                className="tk-btn tk-btn--ghost"
                onClick={() =>
                  setFiltros({ q: "", estado: "", usuario_id: "" })
                }
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETAS RESUMEN */}
      <div className="tk-totales-card">
        <div className="tk-totales-title">Resumen</div>

        <div className="tk-totales-grid">
          <div className="tk-totales-item tk-totales-dia">
            <FaListAlt className="tk-totales-icon" />
            <div className="tk-totales-label">Total</div>
            <div className="tk-totales-value">{resumen.total}</div>
          </div>

          <div className="tk-totales-item tk-totales-final">
            <FaCheckCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Activas</div>
            <div className="tk-totales-value">{resumen.activas}</div>
          </div>

          <div className="tk-totales-item tk-totales-canc">
            <FaTimesCircle className="tk-totales-icon" />
            <div className="tk-totales-label">Inactivas</div>
            <div className="tk-totales-value">{resumen.inactivas}</div>
          </div>

          <div className="tk-totales-item tk-totales-pref">
            <FaUserSlash className="tk-totales-icon" />
            <div className="tk-totales-label">Sin asignar</div>
            <div className="tk-totales-value">{resumen.sinAsignar}</div>
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="tk-tablewrap">
        <table className="tk-table tk-table--vent">
          <thead>
            <tr>
              <th style={{ width: "20%" }}>Nombre</th>
              <th style={{ width: "10%" }}>Código</th>
              <th style={{ width: "20%" }}>Ubicación</th>
              <th style={{ width: "22%" }}>Usuario asignado</th>
              <th style={{ width: "10%", textAlign: "center" }}>Estado</th>
              <th style={{ width: "10%", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {!loading && ventanillasFiltradas.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="tk-empty">
                    <div className="tk-empty-title">Sin registros</div>
                    <div className="tk-empty-desc">Ajusta los filtros.</div>
                  </div>
                </td>
              </tr>
            )}

            {ventanillasFiltradas.map((v) => (
              <tr key={v.id_ventanilla}>
                <td className="wrap">{v.nombre_ventanilla}</td>
                <td className="tk-mono">{v.codigo}</td>
                <td className="wrap">{v.ubicacion || "—"}</td>
                <td className="wrap">
                  {v.id_usuario ? empleadosById[v.id_usuario] : "—"}
                </td>

                <td>
                  <span
                    className={
                      U(v.estado) === "ACTIVA"
                        ? "chip chip--finalizado"
                        : "chip chip--cancelado"
                    }
                  >
                    {U(v.estado)}
                  </span>
                </td>

                <td style={{ textAlign: "center", whiteSpace: "nowrap" }}>
                  <select
                    className="tk-select"
                    defaultValue=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "edit") abrirEditar(v);
                      if (val === "delete") eliminar(v);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Acciones</option>
                    <option value="edit">Editar</option>
                    <option value="delete">Eliminar</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {showForm && (
        <div className="tk-overlay">
          <div className="tk-modal">
            <h3>{editing ? "Editar ventanilla" : "Nueva ventanilla"}</h3>

            <form onSubmit={guardar}>
              <div className="tk-grid">
                <div className="tk-field tk-field--col">
                  <label>Nombre *</label>
                  <input
                    name="nombre_ventanilla"
                    value={form.nombre_ventanilla}
                    onChange={handleChange}
                  />
                </div>

                <div className="tk-field">
                  <label>Código *</label>
                  <input name="codigo" value={form.codigo} onChange={handleChange} />
                </div>

                <div className="tk-field">
                  <label>Estado</label>
                  <select name="estado" value={form.estado} onChange={handleChange}>
                    <option value="ACTIVA">ACTIVA</option>
                    <option value="INACTIVA">INACTIVA</option>
                  </select>
                </div>

                <div className="tk-field">
                  <label>Usuario asignado</label>
                  <select
                    name="id_usuario"
                    value={form.id_usuario}
                    onChange={handleChange}
                  >
                    <option value="">Sin asignar</option>
                    {empleados.map((u) => (
                      <option key={u.id_usuario} value={u.id_usuario}>
                        {empleadosById[u.id_usuario]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="tk-field tk-field--col">
                  <label>Ubicación</label>
                  <input
                    name="ubicacion"
                    value={form.ubicacion}
                    onChange={handleChange}
                  />
                </div>

                <div className="tk-field tk-field--col">
                  <label>Descripción</label>
                  <textarea
                    name="descripcion"
                    rows={3}
                    value={form.descripcion}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="tk-modal-actions">
                <button className="tk-btn tk-btn--primary" type="submit" disabled={loading}>
                  Guardar
                </button>

                <button className="tk-btn tk-btn--ghost" type="button" onClick={cerrarForm}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}