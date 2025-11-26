// ===============================
//   Gestión de Salidas – DGMM
// ===============================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function Salidas() {
  const navigate = useNavigate();

  // ============================
  // ESTADOS PRINCIPALES
  // ============================
  const [salidas, setSalidas] = useState([]);
  const [productos, setProductos] = useState([]);

  // Filtros
  const [filtros, setFiltros] = useState({
    usuario: "",
    fecha: "",
    motivo: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal nueva salida
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [formSalida, setFormSalida] = useState({
    motivo: "",
    detalles: []
  });

  const [detalleTemp, setDetalleTemp] = useState({
    id_producto: "",
    cantidad: ""
  });

  // Modal detalle
  const [showModalDetalle, setShowModalDetalle] = useState(false);
  const [salidaSeleccionada, setSalidaSeleccionada] = useState(null);
  const [detalleSalida, setDetalleSalida] = useState([]);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // ============================
  // HELPERS
  // ============================
  const formatearFecha = (value) => {
    if (!value) return "—";

    // Normalizar formatos con espacio → "2025-11-26T10:00:00"
    let fechaNormalizada = value.replace(" ", "T");

    const fecha = new Date(fechaNormalizada);

    if (isNaN(fecha)) return "Fecha no válida";

    return fecha.toLocaleString("es-HN", {
      dateStyle: "short",
      timeStyle: "short"
    });
  };

  // ============================
  // CARGAR DATOS
  // ============================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rSalidas, rProd] = await Promise.all([
        api.get("/salida"),
        api.get("/productos")
      ]);

      setSalidas(rSalidas.data || []);
      setProductos(rProd.data || []);
    } catch (e) {
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data
      });
    }

    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  // ============================
  // FILTRADO
  // ============================
  const aplicarFiltro = (s) => {
    const { usuario, fecha, motivo } = filtros;

    return (
      (!usuario || s.nombre_usuario?.toLowerCase().includes(usuario.toLowerCase())) &&
      (!motivo || s.motivo?.toLowerCase().includes(motivo.toLowerCase())) &&
      (!fecha || new Date(s.fecha_salida).toLocaleDateString("en-CA") === fecha)
    );
  };

  const salidasFiltradas = salidas.filter(aplicarFiltro);

  // ============================
  // VER DETALLE
  // ============================
  const verDetalle = async (salida) => {
    setSalidaSeleccionada(salida);
    setShowModalDetalle(true);
    setLoadingDetalle(true);

    try {
      const res = await api.get(`/salida/detalle/${salida.id_salida}`);
      setDetalleSalida(res.data || []);
    } catch (e) {
      console.error("Error cargando detalle:", e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarModalDetalle = () => {
    setShowModalDetalle(false);
    setDetalleSalida([]);
    setSalidaSeleccionada(null);
  };

  // ============================
  // NUEVA SALIDA
  // ============================
  const abrirModalNueva = () => {
    setShowModalNueva(true);
    setFormSalida({ motivo: "", detalles: [] });
    setDetalleTemp({ id_producto: "", cantidad: "" });
  };

  const cerrarModalNueva = () => {
    setShowModalNueva(false);
  };

  const agregarDetalle = () => {
    if (!detalleTemp.id_producto || !detalleTemp.cantidad) {
      return alert("Complete los campos del detalle");
    }

    const prod = productos.find(p => p.id_producto === parseInt(detalleTemp.id_producto));

    const nuevo = {
      id_producto: parseInt(detalleTemp.id_producto),
      nombre_producto: prod?.nombre_producto,
      cantidad: parseInt(detalleTemp.cantidad)
    };

    setFormSalida({
      ...formSalida,
      detalles: [...formSalida.detalles, nuevo]
    });

    setDetalleTemp({ id_producto: "", cantidad: "" });
  };

  const eliminarDetalle = (idx) => {
    setFormSalida({
      ...formSalida,
      detalles: formSalida.detalles.filter((_, i) => i !== idx)
    });
  };

  const guardarSalida = async () => {
    if (!formSalida.motivo.trim()) return alert("El motivo es obligatorio");
    if (formSalida.detalles.length === 0) return alert("Debe agregar al menos un producto");

    try {
      setLoading(true);

      // Crear salida
      const r1 = await api.post("/salida", { motivo: formSalida.motivo });
      const id_salida = r1.data.id_salida;

      // Insertar detalles
      for (const d of formSalida.detalles) {
        await api.post("/salida/detalle", {
          id_salida,
          id_producto: d.id_producto,
          cantidad: d.cantidad
        });
      }

      alert("Salida registrada correctamente");
      cerrarModalNueva();
      cargarDatos();
    } catch (e) {
      alert("Error al guardar: " + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // GENERAR PDF SALIDAS
  // ============================
  const generarPDFSalidas = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Salidas", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Usuario", "Fecha", "Motivo"];

    const filas = salidasFiltradas.map((s) => [
      s.id_salida,
      s.nombre_usuario,
      formatearFecha(s.fecha_salida),
      s.motivo
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] }
    });

    const h = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width / 2,
      h - 30,
      { align: "center" }
    );

    doc.save("Salidas_DGMM.pdf");
  };

  // ============================
  // GENERAR PDF DETALLE SALIDA
  // ============================
  const generarPDFDetalleSalida = () => {
    if (!salidaSeleccionada) return;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Detalle de Salida", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    // Información de la salida
    doc.setFontSize(11);
    doc.setTextColor(14, 42, 59);
    doc.text(`ID Salida: ${salidaSeleccionada.id_salida}`, 40, 130);
    doc.text(`Usuario: ${salidaSeleccionada.nombre_usuario}`, 40, 145);
    doc.text(`Fecha: ${formatearFecha(salidaSeleccionada.fecha_salida)}`, 40, 160);
    doc.text(`Motivo: ${salidaSeleccionada.motivo}`, 40, 175);

    const columnas = ["ID Producto", "Producto", "Cantidad"];

    const filas = detalleSalida.map((d) => [
      d.id_producto,
      d.nombre_producto,
      d.cantidad
    ]);

    autoTable(doc, {
      startY: 195,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] }
    });

    const h = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width / 2,
      h - 30,
      { align: "center" }
    );

    doc.save(`Detalle_Salida_${salidaSeleccionada.id_salida}_DGMM.pdf`);
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="inventario-page">

      {/* LOGO */}
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      {/* TOPBAR */}
      <div className="inventario-topbar">
        <span className="topbar-title">Gestión de Salidas</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={abrirModalNueva}>＋ Nueva Salida</button>
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={cargarDatos}>⟳ Refrescar</button>
          <button className="btn btn-topbar-primary" onClick={generarPDFSalidas}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      {/* CARD PRINCIPAL */}
      <div className="inventario-card">

        {/* ERROR */}
        {error && (
          <div className="inventario-error">
            <strong>Error:</strong>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        {loading && <div className="loading-msg">Cargando...</div>}

        {/* FILTROS */}
        <div className="inventario-filtros">
          <input
            placeholder="Filtrar por usuario"
            value={filtros.usuario}
            onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
          />

          <input
            placeholder="Filtrar por motivo"
            value={filtros.motivo}
            onChange={(e) => setFiltros({ ...filtros, motivo: e.target.value })}
          />

          <input
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
          />
        </div>

        {/* TABLA */}
        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {salidasFiltradas.length > 0 ? (
              salidasFiltradas.map((s) => (
                <tr key={s.id_salida}>
                  <td>{s.id_salida}</td>
                  <td>{s.nombre_usuario}</td>
                  <td>{formatearFecha(s.fecha_salida)}</td>
                  <td>{s.motivo}</td>
                  <td>
                    <button className="btn-table" onClick={() => verDetalle(s)}>
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="no-data">No hay salidas registradas.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ============================
            MODAL NUEVA SALIDA
      ============================= */}
      {showModalNueva && (
        <div className="inv-modal-overlay" onClick={cerrarModalNueva}>
          <div className="inv-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>
            
            <div className="inv-modal-header">
              <h3>Nueva Salida</h3>
              <button className="inv-modal-close" onClick={cerrarModalNueva}>✕</button>
            </div>

            <div className="inv-modal-body">

              {/* Motivo */}
              <div style={{ marginBottom: 20 }}>
                <label>Motivo:</label>
                <textarea
                  className="form-control"
                  value={formSalida.motivo}
                  onChange={(e) => setFormSalida({ ...formSalida, motivo: e.target.value })}
                  style={{ width: "100%", minHeight: 60 }}
                />
              </div>

              {/* AGREGAR DETALLE */}
              <div style={{ marginBottom: 20, background: "#f5f5f5", padding: 15, borderRadius: 6 }}>
                <h4 style={{ marginBottom: 10 }}>Agregar Producto</h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr auto",
                    gap: 10
                  }}
                >
                  <select
                    className="form-control"
                    value={detalleTemp.id_producto}
                    onChange={(e) => setDetalleTemp({ ...detalleTemp, id_producto: e.target.value })}
                  >
                    <option value="">Seleccione...</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.nombre_producto}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    className="form-control"
                    placeholder="Cantidad"
                    value={detalleTemp.cantidad}
                    onChange={(e) => setDetalleTemp({ ...detalleTemp, cantidad: e.target.value })}
                  />

                  <button className="btn btn-success" onClick={agregarDetalle}>
                    ＋ Agregar
                  </button>
                </div>
              </div>

              {/* TABLA DETALLES AGREGADOS */}
              {formSalida.detalles.length > 0 && (
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formSalida.detalles.map((d, i) => (
                      <tr key={i}>
                        <td>{d.nombre_producto}</td>
                        <td>{d.cantidad}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => eliminarDetalle(i)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="inv-modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalNueva}>Cancelar</button>
              <button className="btn btn-success" onClick={guardarSalida} disabled={loading}>
                {loading ? "Guardando..." : "Guardar Salida"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ============================
            MODAL DETALLE
      ============================= */}
      {showModalDetalle && (
        <div className="inv-modal-overlay" onClick={cerrarModalDetalle}>
          <div className="inv-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 850 }}>

            <div className="inv-modal-header">
              <h3>Detalle de Salida #{salidaSeleccionada?.id_salida}</h3>
              <button className="inv-modal-close" onClick={cerrarModalDetalle}>✕</button>
            </div>

            <div className="inv-modal-body">
              {salidaSeleccionada && (
                <div style={{ marginBottom: 20 }}>
                  <p><strong>Motivo:</strong> {salidaSeleccionada.motivo}</p>
                  <p><strong>Usuario:</strong> {salidaSeleccionada.nombre_usuario}</p>
                  <p><strong>Fecha:</strong> {formatearFecha(salidaSeleccionada.fecha_salida)}</p>
                </div>
              )}

              {loadingDetalle ? (
                <p>Cargando detalles...</p>
              ) : detalleSalida.length === 0 ? (
                <p>No hay detalles registrados.</p>
              ) : (
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleSalida.map((d, idx) => (
                      <tr key={idx}>
                        <td>{d.nombre_producto || d.producto}</td>
                        <td>{d.cantidad}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="inv-modal-footer">
              <button className="btn btn-topbar-outline" onClick={cerrarModalDetalle}>
                Cerrar
              </button>
              <button className="btn btn-topbar-primary" onClick={generarPDFDetalleSalida} style={{ marginLeft: 8 }}>
                <FaFilePdf size={16} /> Exportar Detalle PDF
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
