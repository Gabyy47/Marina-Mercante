// src/MantenimientoTipoTicket.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimiento.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaFilePdf } from "react-icons/fa";

Modal.setAppElement("#root");

export default function MantenimientoTipoTicket() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // formulario
  const [nuevoTipo, setNuevoTipo] = useState("");
  const [nuevoPrefijo, setNuevoPrefijo] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("ACTIVO");

  const [editItemId, setEditItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // PDF
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Tipos de Ticket", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Tipo", "Prefijo", "Estado"];
    const filas = items.map((it) => [
      it.id_tipo_ticket,
      it.tipo_ticket,
      it.prefijo,
      it.estado || "ACTIVO",
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] },
    });

    doc.save("TiposTicket_DGMM.pdf");
  };

  // cargar datos
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/tipo_ticket");
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error("Error al cargar datos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // abrir modal crear
  const openModal = () => {
    setNuevoTipo("");
    setNuevoPrefijo("");
    setNuevoEstado("ACTIVO");
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  // abrir modal editar
  const openEditModal = (item) => {
    setEditItemId(item.id_tipo_ticket);
    setNuevoTipo(item.tipo_ticket);
    setNuevoPrefijo(item.prefijo);
    setNuevoEstado(item.estado || "ACTIVO");
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);

  // crear
  const handleCreate = async () => {
    if (!nuevoTipo.trim() || !nuevoPrefijo.trim()) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      await api.post("/tipo_ticket", {
        tipo_ticket: nuevoTipo.trim(),
        prefijo: nuevoPrefijo.trim(),
        estado: nuevoEstado,
      });

      toast.success("Tipo creado correctamente");
      fetchItems();
      closeModal();
    } catch (err) {
      toast.error("Error al crear");
      console.error(err);
    }
  };

  // actualizar
  const handleUpdate = async () => {
    try {
      await api.put(`/tipo_ticket/${editItemId}`, {
        tipo_ticket: nuevoTipo.trim(),
        prefijo: nuevoPrefijo.trim(),
        estado: nuevoEstado,
      });

      toast.success("Actualizado correctamente");
      fetchItems();
      closeEditModal();
    } catch (err) {
      toast.error("Error al actualizar");
      console.error(err);
    }
  };

  // eliminar
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar este tipo?")) return;

    try {
      await api.delete(`/tipo_ticket/${id}`);
      toast.success("Eliminado correctamente");
      setItems((prev) => prev.filter((i) => i.id_tipo_ticket !== id));
    } catch (err) {
      toast.error("Error al eliminar");
      console.error(err);
    }
  };

  return (
    <div className="mm-page">
      <header className="mm-header">
        <img src={logo} alt="DGMM" className="mm-logo" />
      </header>

      <section className="mm-card">
        <div className="mm-card__head">
          <h2>Mantenimiento de Tipos de Ticket</h2>

          <div className="mm-actions">
            <Link to="/" className="mm-link">
              ← Volver al Menú Principal
            </Link>

            <button className="btn btn-primary" onClick={openModal}>
              + Nuevo tipo
            </button>

            <button className="btn btn-topbar-primary" onClick={generarPDF}>
              <FaFilePdf size={16} /> Generar Reporte
            </button>
          </div>
        </div>

        <div className="mm-table__wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tipo de ticket</th>
                <th>Prefijo</th>
                <th>Estado</th>
                <th style={{ width: 160 }}>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center">
                    Sin registros
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id_tipo_ticket}>
                    <td>{it.id_tipo_ticket}</td>
                    <td>{it.tipo_ticket}</td>
                    <td>{it.prefijo}</td>

                    {/* ESTADO — si viene vacío mostramos ACTIVO */}
                    <td>{it.estado || "ACTIVO"}</td>

                    <td className="mm-actions--row">
                      <button
                        className="btn btn-outline"
                        onClick={() => openEditModal(it)}
                      >
                        Editar
                      </button>

                      <button
                        className="btn btn-danger"
                        onClick={() =>
                          handleDelete(it.id_tipo_ticket)
                        }
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL CREAR */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Crear Tipo de Ticket</h3>

        <div className="mm-form">
          <input
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            placeholder="Tipo de ticket"
          />

          <input
            value={nuevoPrefijo}
            onChange={(e) => setNuevoPrefijo(e.target.value)}
            placeholder="Prefijo"
          />

          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
          >
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleCreate}>
            Guardar
          </button>
          <button className="btn btn-outline" onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </Modal>

      {/* MODAL EDITAR */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeEditModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Editar Tipo de Ticket</h3>

        <div className="mm-form">
          <input
            value={nuevoTipo}
            onChange={(e) => setNuevoTipo(e.target.value)}
            placeholder="Tipo de ticket"
          />

          <input
            value={nuevoPrefijo}
            onChange={(e) => setNuevoPrefijo(e.target.value)}
            placeholder="Prefijo"
          />

          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
          >
            <option value="ACTIVO">ACTIVO</option>
            <option value="INACTIVO">INACTIVO</option>
          </select>
        </div>

        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleUpdate}>
            Guardar
          </button>
          <button className="btn btn-outline" onClick={closeEditModal}>
            Cerrar
          </button>
        </div>
      </Modal>

      <ToastContainer autoClose={3000} hideProgressBar={false} />
    </div>
  );
}
