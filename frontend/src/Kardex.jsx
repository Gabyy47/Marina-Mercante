import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


export default function Kardex() {

  const navigate = useNavigate();

  // Usuario logueado para bitácora
  const usuarioData = JSON.parse(localStorage.getItem("usuarioData")) || {};
  const idUsuario = usuarioData.id_usuario;
  const nombreUsuario = usuarioData.nombre_usuario;

  const [items, setItems] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    id_usuario: idUsuario,
    id_producto: '',
    cantidad: 0,
    tipo_movimiento: 'entrada',
    descripcion: '',
    fecha_hora: ''
  });

  const [editing, setEditing] = useState(null);

  // ================================
  // CARGAR TODO
  // ================================
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r, rProd, rProv] = await Promise.all([
        api.get('/kardex', {
          params: { id_usuario: idUsuario, usuario: nombreUsuario }
        }),
        api.get('/productos', {
          params: { id_usuario: idUsuario, usuario: nombreUsuario }
        }),
        api.get('/proveedor', {
          params: { id_usuario: idUsuario, usuario: nombreUsuario }
        })
      ]);

      setItems(r.data || []);
      setProductos(rProd.data || []);
      setProveedores(rProv.data || []);

    } catch (e) {
      console.error("Error cargando Kardex:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener('dataChanged', h);
    return () => window.removeEventListener('dataChanged', h);
  }, []);

  // ================================
  // GUARDAR (POST o PUT)
  // ================================
  const save = async () => {
    try {
      const payload = {
        ...form,
        id_usuario: idUsuario
      };

      if (editing) {
        await api.put(`/kardex/${editing.id_kardex}`, payload, {
          params: { id_usuario: idUsuario, usuario: nombreUsuario }
        });
      } else {
        await api.post(`/kardex`, payload, {
          params: { id_usuario: idUsuario, usuario: nombreUsuario }
        });
      }

      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();
      setEditing(null);
      setForm({
        id_usuario: idUsuario,
        id_producto: '',
        cantidad: 0,
        tipo_movimiento: 'entrada',
        descripcion: '',
        fecha_hora: ''
      });

    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }
  };

  // ================================
  // ELIMINAR
  // ================================
  const remove = async (id) => {
    if (!confirm("¿Eliminar movimiento?")) return;

    try {
      await api.delete(`/kardex/${id}`, {
        params: { id_usuario: idUsuario, usuario: nombreUsuario }
      });

      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();

    } catch (e) {
      alert("Error eliminando");
    }
  };

  // ================================
  // EDITAR
  // ================================
  const startEdit = (it) => {
    setEditing(it);
    setForm({
      id_usuario: idUsuario,
      id_producto: it.id_producto,
      cantidad: it.cantidad,
      tipo_movimiento: it.tipo_movimiento,
      descripcion: it.descripcion,
      fecha_hora: it.fecha_hora
    });
  };


  // === GENERAR REPORTE PDF KARDEX ===
const generarPDF = () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

  // ENCABEZADO
  doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(14, 42, 59);
  doc.text("Dirección General de la Marina Mercante", 170, 50);

  doc.setFontSize(14);
  doc.text("Kardex de Inventario", 170, 72);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

  // TABLA
  const columnas = [
    "ID",
    "Fecha",
    "Producto",
    "Tipo",
    "Cantidad",
    "Estado",
    "Descripción"
  ];

  const filas = items.map(it => [
    it.id_kardex,
    it.fecha_hora || it.fecha || "-",
    it.id_producto,
    it.tipo_movimiento,
    it.cantidad,
    it.estado,
    it.descripcion
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


  // ================================
  // UI
  // ================================
  return (
    <div className="inventario-page">
      
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Kardex</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate('/')}>
            ← Menú
          </button>

          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{ marginLeft: 8 }}>
            ⟳ Refrescar
          </button>

          <button
            className="btn btn-topbar-outline"
            onClick={() => {
              setEditing(null);
              setForm({
                id_usuario: idUsuario,
                id_producto: '',
                cantidad: 0,
                tipo_movimiento: 'entrada',
                descripcion: '',
                fecha_hora: ''
              });
            }}
            style={{ marginLeft: 8 }}
          >
            ＋ Nuevo
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>

        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <table className="inventario-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id_kardex}>
                  <td>{it.id_kardex}</td>
                  <td>{it.fecha_hora || it.fecha || '-'}</td>
                  <td>{it.id_producto}</td>
                  <td>{it.tipo_movimiento}</td>
                  <td>{it.cantidad}</td>
                  <td>{it.estado}</td>
                  <td>{it.descripcion}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(it)}>
                      Editar
                    </button>

                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(it.id_kardex)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        )}

        {/* FORMULARIO */}
        <div style={{ marginTop: 12 }}>
          <h5 style={{ marginBottom: 8 }}>
            {editing ? "Editar" : "Nuevo"} movimiento
          </h5>

          {/* Producto */}
          <div className="mb-2">
            <select
              className="form-control"
              value={form.id_producto}
              onChange={(e) => setForm({ ...form, id_producto: e.target.value })}
            >
              <option value=''>-- Producto --</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre_producto}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad y tipo */}
          <div className="d-flex gap-2 mb-2">
            <input
              className="form-control"
              type="number"
              placeholder="Cantidad"
              value={form.cantidad}
              onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
            />

            <select
              className="form-control"
              value={form.tipo_movimiento}
              onChange={(e) => setForm({ ...form, tipo_movimiento: e.target.value })}
            >
              <option value="entrada">entrada</option>
              <option value="salida">salida</option>
            </select>
          </div>

          <input
            className="form-control mb-2"
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          <div>
            <button className="btn btn-success me-2" onClick={save}>
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm({
                  id_usuario: idUsuario,
                  id_producto: '',
                  cantidad: 0,
                  tipo_movimiento: 'entrada',
                  descripcion: '',
                  fecha_hora: ''
                });
              }}
            >
              Limpiar
            </button>


            <button
            className="btn btn-topbar-outline"
            onClick={generarPDF}
            style={{ marginLeft: 8 }}
>
            📄 Exportar PDF
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
