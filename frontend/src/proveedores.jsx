import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";
import Modal from 'react-modal';

Modal.setAppElement('#root'); // necesario para accesibilidad

export default function Proveedores() {
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null = nuevo, objeto = editando
  const [isModalOpen, setIsModalOpen] = useState(false); // controla el modal

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: ""
  });

  // =======================
  //   GENERAR PDF
  // =======================
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Proveedores", 170, 72); 

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["Nombre", "Teléfono", "Dirección"];

    const filas = proveedores.map((p) => [
      p.nombre,
      p.telefono,
      p.direccion
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

    doc.save("Proveedores_DGMM.pdf");
  };

  // =======================
  //   CARGAR DATOS
  // =======================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/proveedor"); // usa token → registra bitácora
      setProveedores(res.data || []);
    } catch (e) {
      setError(e.message || "Error");
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener("dataChanged", h);
    return () => window.removeEventListener("dataChanged", h);
  }, []);

  // =======================
  //  VALIDACIÓN CAMPOS
  // =======================

  // Solo números y 8 dígitos
  const handleTelefonoChange = (e) => {
    const value = e.target.value;

    if (!/^\d*$/.test(value)) return; // no letras
    if (value.length > 8) return; // máximo 8 dígitos

    setForm({ ...form, telefono: value });
  };

  // Nombre y dirección permiten acentos, comas, puntos, números, letras…
  const validarTexto = (texto) =>
    /^[A-Za-z0-9áéíóúÁÉÍÓÚñÑ.,\-\s#()/:°]*$/.test(texto);

  const handleChangeText = (field, value) => {
    if (!validarTexto(value)) return;
    setForm({ ...form, [field]: value });
  };

  // =======================
  //  MODAL: NUEVO / EDITAR
  // =======================
  const openNew = () => {
    setEditing(null);
    setForm({ nombre: "", telefono: "", direccion: "" });
    setIsModalOpen(true);
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      telefono: p.telefono,
      direccion: p.direccion
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // =======================
  //  GUARDAR
  // =======================
  const save = async () => {
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    if (form.telefono.length !== 8) return alert("El teléfono debe tener 8 dígitos");

    try {
      if (editing) {
        await api.put(`/proveedor/${editing.id_proveedor}`, form);
      } else {
        await api.post("/proveedor", form);
      }

      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();

      setEditing(null);
      setForm({ nombre: "", telefono: "", direccion: "" });
      setIsModalOpen(false); // cerrar modal al guardar

    } catch (e) {
      alert("Error: " + (e.response?.data?.mensaje || e.message));
    }
  };

  // =======================
  //  ELIMINAR
  // =======================
  const remove = async (id) => {
    if (!confirm("Eliminar proveedor?")) return;

    try {
      await api.delete(`/proveedor/${id}`);
      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  return (
    <div className="inventario-page">

      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Proveedores</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>
            ← Menú
          </button>
          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{ marginLeft: 8 }}>
            ⟳ Refrescar
          </button>
          <button className="btn btn-topbar-outline" onClick={openNew} style={{ marginLeft: 8 }}>
            ＋ Nuevo
          </button>
          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading && <div className="loading">Cargando proveedores...</div>}
        {error && <div className="inventario-error">{error}</div>}

        <table className="inventario-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {proveedores.map((p) => (
              <tr key={p.id_proveedor}>
                <td>{p.nombre}</td>
                <td>{p.telefono}</td>
                <td>{p.direccion}</td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary me-2"
                    onClick={() => startEdit(p)}
                  >
                    Editar
                  </button>

                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => remove(p.id_proveedor)}
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {proveedores.length === 0 && (
              <tr>
                <td colSpan={5} className="no-data">
                  No hay proveedores
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL NUEVO / EDITAR */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        contentLabel="Formulario proveedor"
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>{editing ? "Editar proveedor" : "Nuevo proveedor"}</h3>

        <div className="mm-form">
          <input
            className="form-control mb-2"
            placeholder="Nombre"
            value={form.nombre}
            onChange={(e) => handleChangeText("nombre", e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Teléfono (8 dígitos)"
            value={form.telefono}
            onChange={handleTelefonoChange}
          />

          <input
            className="form-control mb-2"
            placeholder="Dirección"
            value={form.direccion}
            onChange={(e) => handleChangeText("direccion", e.target.value)}
          />
        </div>

        <div className="mm-modal__actions" style={{ marginTop: 12 }}>
          <button className="btn btn-success me-2" onClick={save}>
            Guardar
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setForm({ nombre: "", telefono: "", direccion: "" });
              closeModal();
            }}
          >
            Cancelar
          </button>
        </div>
      </Modal>

    </div>
  );
}
