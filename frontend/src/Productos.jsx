import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './Productos.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function Productos() {

  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre_producto: '',
    cantidad_minima: 0,
    cantidad_maxima: 0,
    descripcion: ''
  });

  const [editing, setEditing] = useState(null);

  // Modal de edición
  const [showModalEditar, setShowModalEditar] = useState(false);


  
  // === Obtener lista usando SP_MostrarProductos ===
  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await api.get('/productos'); 
      setItems(r.data || []);
    } catch (e) {
      console.error("Error obteniendo productos:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener('dataChanged', h);
    return () => window.removeEventListener('dataChanged', h);
  }, []);

  // === Guardar (nuevo o edición) ===
  const save = async () => {
    try {
      if (editing) {
        await api.put(`/productos/${editing.id_producto}`, form);
      } else {
        await api.post('/productos', form);
      }

      window.dispatchEvent(new Event('dataChanged'));
      fetchAll();

      // Limpiar
      setEditing(null);
      setForm({
        nombre_producto: '',
        cantidad_minima: 0,
        cantidad_maxima: 0,
        descripcion: ''
      });
      setShowModalEditar(false);

    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }
  };

  // === Eliminar usando SP_EliminarProducto ===
  const remove = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;

    try {
      await api.delete(`/productos/${id}`);
      window.dispatchEvent(new Event('dataChanged'));
      fetchAll();
    } catch (e) {
      alert("Error eliminando producto");
      console.error(e);
    }
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      nombre_producto: p.nombre_producto,
      cantidad_minima: p.cantidad_minima,
      cantidad_maxima: p.cantidad_maxima,
      descripcion: p.descripcion
    });
    setShowModalEditar(true);
  };

  const cerrarModalEditar = () => {
    setShowModalEditar(false);
    setEditing(null);
    setForm({
      nombre_producto: '',
      cantidad_minima: 0,
      cantidad_maxima: 0,
      descripcion: ''
    });
  };

// === GENERAR REPORTE EN PDF ===
const generarPDF = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

  // ENCABEZADO
  doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(14, 42, 59);
  doc.text("Dirección General de la Marina Mercante", 170, 50);

  doc.setFontSize(14);
  doc.text("Reporte de Productos", 170, 72);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

  // TABLA
  const columnas = ["ID", "Nombre", "Min", "Max", "Descripción"];
  const filas = items.map(p => [
    p.id_producto,
    p.nombre_producto,
    p.cantidad_minima,
    p.cantidad_maxima,
    p.descripcion
  ]);

  autoTable(doc, {
    startY: 125,
    head: [columnas],
    body: filas,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [242, 245, 247] },
  });

  // PIE DE PÁGINA
  const pageCount = doc.internal.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100);

    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM ©️ 2025",
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

  // ABRIR PDF
  const blobUrl = doc.output("bloburl");
  window.open(blobUrl, "_blank");
};



  return (
    <div className="prod-page">
      
      <div className="prod-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="prod-topbar" style={{ maxWidth: 1000 }}>
        <span className="prod-topbar-title">Gestión de Productos</span>

        <div className="prod-topbar-actions">
          
          <button className="prod-btn prod-btn-topbar-outline" onClick={() => navigate('/')}>
            ← Menú
          </button>

          <button className="prod-btn prod-btn-topbar-outline" onClick={fetchAll} style={{ marginLeft: 8 }}>
            ⟳ Refrescar
          </button>

          <button
            className="prod-btn prod-btn-topbar-outline"
            onClick={generarPDF}
            style={{ marginLeft: 8 }}
>           📄 Exportar PDF
          </button>

        </div>
      </div>

      <div className="prod-card" style={{ maxWidth: 1000 }}>
        {loading ? (
          <div className="prod-loading">Cargando...</div>
        ) : (
          <table className="prod-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Min</th>
                <th>Max</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id_producto}>
                  <td>{it.id_producto}</td>
                  <td>{it.nombre_producto}</td>
                  <td>{it.cantidad_minima}</td>
                  <td>{it.cantidad_maxima}</td>
                  <td>{it.descripcion}</td>
                  <td>
                    <button className="prod-btn prod-btn-sm prod-btn-outline-primary prod-me-2" onClick={() => startEdit(it)}>
                      Editar
                    </button>

                    <button className="prod-btn prod-btn-sm prod-btn-outline-danger" onClick={() => remove(it.id_producto)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

      </div>

      {/* MODAL EDITAR PRODUCTO */}
      {showModalEditar && (
        <div className="prod-modal-overlay" onClick={cerrarModalEditar}>
          <div
            className="prod-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 550 }}
          >
            <div className="prod-modal-header">
              <h3>{editing ? "Editar" : "Nuevo"} Producto</h3>
              <button className="prod-modal-close" onClick={cerrarModalEditar}>
                ✕
              </button>
            </div>

            <div className="prod-modal-body">
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Nombre del Producto</label>
                  <input
                    className="prod-form-control"
                    placeholder="Nombre del producto"
                    value={form.nombre_producto}
                    onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Mínima</label>
                    <input
                      className="prod-form-control"
                      type="number"
                      placeholder="Mínima"
                      value={form.cantidad_minima}
                      onChange={(e) => setForm({ ...form, cantidad_minima: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Máxima</label>
                    <input
                      className="prod-form-control"
                      type="number"
                      placeholder="Máxima"
                      value={form.cantidad_maxima}
                      onChange={(e) => setForm({ ...form, cantidad_maxima: e.target.value })}
                      style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Descripción</label>
                  <textarea
                    className="prod-form-control"
                    placeholder="Descripción del producto"
                    value={form.descripcion}
                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3", minHeight: "80px", resize: "vertical" }}
                  />
                </div>
              </div>
            </div>

            <div className="prod-modal-footer">
              <button className="prod-btn prod-btn-secondary" onClick={cerrarModalEditar}>
                Cancelar
              </button>
              <button
                className="prod-btn prod-btn-success"
                onClick={save}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
