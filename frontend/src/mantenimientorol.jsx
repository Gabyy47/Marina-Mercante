import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";   // baseURL: http://localhost:49146/api
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimiento.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaFilePdf } from "react-icons/fa";


Modal.setAppElement("#root");

export default function MantenimientoRol() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [newNombre, setNewNombre] = useState("");
  const [newDescripcion, setNewDescripcion] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

   const generarPDF = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "A4",
  });

  // --- ENCABEZADO DGMM ---
  doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(14, 42, 59);
  doc.text("Dirección General de la Marina Mercante", 170, 50);

  doc.setFontSize(14);
  doc.text("Reporte de Roles", 170, 72);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

  // --- CONFIGURACIÓN DE TABLA ---
  const columnas = ["ID Rol", "Nombre", "Descripción"];

  // AQUÍ USAMOS ITEMS (LOS ROLES)
  const filas = items.map((rol) => [
    rol.id_rol,
    rol.nombre,
    rol.descripcion || "",
  ]);

  // --- TABLA ---
  autoTable(doc, {
    startY: 125,
    head: [columnas],
    body: filas,
    styles: { fontSize: 10, cellPadding: 5 },
    headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [242, 245, 247] },
  });

  // --- PIE DE PÁGINA ---
  const h = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
    doc.internal.pageSize.width / 2,
    h - 30,
    { align: "center" }
  );

  // --- GUARDAR PDF ---
  doc.save("Roles_DGMM.pdf");
};

  
  const limpiarCampos = () => {
    setNewNombre("");
    setNewDescripcion("");
  };

  const openModal = () => {
    limpiarCampos();
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    limpiarCampos();
  };

  const openEditModal = (item) => {
    setEditItemId(item.id_rol);
    setNewNombre(item.nombre ?? "");
    setNewDescripcion(item.descripcion ?? "");
    setIsEditModalOpen(true); // <-- FALTABA
  };
  const closeEditModal = () => setIsEditModalOpen(false);

  const camposCompletos = useMemo(() => {
    return Boolean(newNombre.trim() && newDescripcion.trim());
  }, [newNombre, newDescripcion]);

  const toPayload = () => ({
    nombre: newNombre.trim(),
    descripcion: newDescripcion.trim(),
  });

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/roles"); // <-- /roles (no /rol)
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET /roles error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async () => {
    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const payload = toPayload();

    try {
      await api.post("/roles", payload); // <-- /roles
      toast.success("¡Rol creado con éxito!");
      await fetchItems();
      closeModal();
    } catch (error) {
      console.error("POST /roles error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al guardar datos");
    }
  };

  const handleUpdate = async () => {
    if (!editItemId) return;
    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const payload = toPayload();

    try {
      await api.put(`/roles/${editItemId}`, payload); // <-- /roles/:id
      toast.success("¡Rol actualizado con éxito!");
      await fetchItems();
      closeEditModal();
    } catch (error) {
      console.error(`PUT /roles/${editItemId} error:`, error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al actualizar el rol");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este rol?")) return;
    try {
      await api.delete(`/roles/${id}`); // <-- /roles/:id
      toast.success("Registro eliminado con éxito");
      setItems((prev) => prev.filter((i) => i.id_rol !== id));
    } catch (error) {
      console.error("DELETE /roles error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al eliminar el registro");
    }
  };

  return (
    <div className="mm-page">
      <header className="mm-header">
        <img src={logo} alt="DGMM" className="mm-logo" />
      </header>

      <section className="mm-card">
        <div className="mm-card__head">
          <h2>Mantenimiento de Rol</h2>
          <div className="mm-actions">
            <Link to="/" className="mm-link">← Volver al Menú Principal</Link>
            <button className="btn btn-primary" onClick={openModal}>+ Nuevo rol</button>
            <button className="btn btn-topbar-primary" onClick={generarPDF}>
                        <FaFilePdf size={16} /> Generar Reporte
                      </button>
          </div>
        </div>

        <div className="mm-table__wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>ID Rol</th>
                <th>Nombre</th>
                <th>Descripción</th>
                <th style={{ width: 160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center">Cargando…</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="text-center">Sin registros</td></tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id_rol}>
                    <td>{it.id_rol}</td>
                    <td>{it.nombre}</td>
                    <td>{it.descripcion}</td>
                    <td className="mm-actions--row">
                      <button className="btn btn-outline" onClick={() => openEditModal(it)}>Editar</button>
                      <button className="btn btn-danger" onClick={() => handleDelete(it.id_rol)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Crear */}
      <Modal isOpen={isModalOpen} onRequestClose={closeModal} className="mm-modal" overlayClassName="mm-overlay">
        <h3>Crear Rol</h3>
        <div className="mm-form">
          <input value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre" />
          <input value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} placeholder="Descripción" />
        </div>
        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleCreate}>Guardar</button>
          <button className="btn btn-outline" onClick={closeModal}>Cerrar</button>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal isOpen={isEditModalOpen} onRequestClose={closeEditModal} className="mm-modal" overlayClassName="mm-overlay">
        <h3>Editar Rol</h3>
        <div className="mm-form">
          <input value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre" />
          <input value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} placeholder="Descripción" />
        </div>
        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleUpdate}>Guardar</button>
          <button className="btn btn-outline" onClick={closeEditModal}>Cerrar</button>
        </div>
      </Modal>

      <ToastContainer autoClose={3000} hideProgressBar={false} />
    </div>
  );
}
