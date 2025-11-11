import { useState, useEffect } from "react";
import axios from "axios";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { Link } from "react-router-dom";
import { FaFilePdf, FaPlus, FaTimes, FaSave } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import "react-toastify/dist/ReactToastify.css";
import "./proveedores.css";

const BASE_URL = "http://localhost:49146/api/";

Modal.setAppElement("#root");

const Proveedores = () => {
  const [items, setItems] = useState([]);
  const [newNombre, setNewNombre] = useState("");
  const [newTelefono, setNewTelefono] = useState("");
  const [newDireccion, setNewDireccion] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtros individuales
  const [filterNombre, setFilterNombre] = useState("");
  const [filterTelefono, setFilterTelefono] = useState("");
  const [filterDireccion, setFilterDireccion] = useState("");

  // === Cargar datos ===
  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${BASE_URL}proveedores`);
      setItems(response.data);
    } catch (error) {
      toast.error("Error al cargar los datos");
      console.error("Error al obtener los proveedores:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // === Crear nuevo proveedor ===
  const handleCreate = async () => {
    if (!newNombre.trim() || !newTelefono.trim() || !newDireccion.trim()) {
      return toast.error("Por favor completa todos los campos");
    }
    if (newTelefono.length !== 8) {
      return toast.error("El número de teléfono debe tener 8 dígitos");
    }

    try {
      const { data } = await axios.post(`${BASE_URL}proveedores`, {
        nombre: newNombre,
        telefono: newTelefono,
        direccion: newDireccion,
      });
      toast.success("Proveedor agregado correctamente");
      setItems((prev) => [...prev, data]);
      closeModal();
    } catch (err) {
      toast.error("Error al guardar proveedor");
      console.error(err);
    }
  };

  // === Editar proveedor ===
  const handleUpdate = async () => {
    if (!newNombre.trim() || !newTelefono.trim() || !newDireccion.trim()) {
      return toast.error("Completa todos los campos");
    }
    if (newTelefono.length !== 8) {
      return toast.error("El número de teléfono debe tener 8 dígitos");
    }

    try {
      await axios.put(`${BASE_URL}proveedores/${editItemId}`, {
        nombre: newNombre,
        telefono: newTelefono,
        direccion: newDireccion,
      });

      toast.success("Proveedor actualizado correctamente");
      setItems((prev) =>
        prev.map((i) =>
          i.id_proveedor === editItemId
            ? { ...i, nombre: newNombre, telefono: newTelefono, direccion: newDireccion }
            : i
        )
      );
      closeEditModal();
    } catch (err) {
      toast.error("Error al actualizar proveedor");
      console.error(err);
    }
  };

  // === Eliminar proveedor ===
  const handleDelete = (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este proveedor?")) {
      axios
        .delete(`${BASE_URL}proveedores/${id}`)
        .then(() => {
          toast.success("Proveedor eliminado");
          setItems((prev) => prev.filter((i) => i.id_proveedor !== id));
        })
        .catch((err) => {
          toast.error("Error al eliminar proveedor");
          console.error(err);
        });
    }
  };

  // === Generar PDF ===
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });
    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);
    doc.setFontSize(14);
    doc.text("Listado de Proveedores", 170, 72);
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["Nombre", "Teléfono", "Dirección"];
    const filas = items.map((i) => [i.nombre, i.telefono, i.direccion]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] },
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

  // === Filtros por nombre, teléfono, dirección ===
  const filteredItems = items.filter((i) => {
    const nombreMatch = i.nombre.toLowerCase().includes(filterNombre.toLowerCase());
    const telefonoMatch = i.telefono.toLowerCase().includes(filterTelefono.toLowerCase());
    const direccionMatch = i.direccion.toLowerCase().includes(filterDireccion.toLowerCase());
    return nombreMatch && telefonoMatch && direccionMatch;
  });

  // === Manejo de modales ===
  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setNewNombre("");
    setNewTelefono("");
    setNewDireccion("");
  };

  const openEditModal = (item) => {
    setEditItemId(item.id_proveedor);
    setNewNombre(item.nombre);
    setNewTelefono(item.telefono);
    setNewDireccion(item.direccion);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => setIsEditModalOpen(false);

  // === Validar teléfono ===
  const handleTelefonoChange = (e) => {
    const value = e.target.value;
    if (/[^0-9]/.test(value)) return toast.error("Solo se permiten números");
    if (value.length > 8) return toast.error("Máximo 8 dígitos");
    setNewTelefono(value);
  };

  return (
    <div className="prov-page">
      {/* Logo */}
      <div className="prov-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      {/* Barra azul */}
      <div className="prov-topbar">
        <h2>Gestión de Proveedores</h2>
        <div className="prov-actions">
          <Link to="/" className="btn btn-topbar-outline">Volver al Menú Principal</Link>
          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte
          </button>
          <button className="btn btn-primary" onClick={openModal}>
            <FaPlus size={14} /> Nuevo
          </button>
        </div>
      </div>

      {/* Campos de filtros */}
      <div className="prov-filters">
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filterNombre}
          onChange={(e) => setFilterNombre(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por teléfono..."
          value={filterTelefono}
          onChange={(e) => setFilterTelefono(e.target.value)}
        />
        <input
          type="text"
          placeholder="Filtrar por dirección..."
          value={filterDireccion}
          onChange={(e) => setFilterDireccion(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="prov-card">
        {loading ? (
          <p>Cargando proveedores...</p>
        ) : filteredItems.length === 0 ? (
          <p>No se encontraron proveedores</p>
        ) : (
          <table className="prov-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Teléfono</th>
                <th>Dirección</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id_proveedor}>
                  <td>{item.nombre}</td>
                  <td>{item.telefono}</td>
                  <td>{item.direccion}</td>
                  <td>
                    <button className="btn btn-outline" onClick={() => openEditModal(item)}>Editar</button>
                    <button className="btn btn-danger" onClick={() => handleDelete(item.id_proveedor)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      <Modal isOpen={isModalOpen} onRequestClose={closeModal} className="prov-modal" overlayClassName="ReactModal__Overlay">
        <h2>Agregar Proveedor</h2>
        <div className="prov-form">
          <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre" />
          <input value={newTelefono} onChange={handleTelefonoChange} placeholder="Teléfono (8 dígitos)" />
          <input type="text" value={newDireccion} onChange={(e) => setNewDireccion(e.target.value)} placeholder="Dirección" />
        </div>
        <div className="prov-modal__actions">
          <button className="btn btn-primary" onClick={handleCreate}><FaSave /> Guardar</button>
          <button className="btn btn-outline" onClick={closeModal}><FaTimes /> Cerrar</button>
        </div>
      </Modal>

      <Modal isOpen={isEditModalOpen} onRequestClose={closeEditModal} className="prov-modal" overlayClassName="ReactModal__Overlay">
        <h2>Editar Proveedor</h2>
        <div className="prov-form">
          <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder="Nombre" />
          <input value={newTelefono} onChange={handleTelefonoChange} placeholder="Teléfono (8 dígitos)" />
          <input type="text" value={newDireccion} onChange={(e) => setNewDireccion(e.target.value)} placeholder="Dirección" />
        </div>
        <div className="prov-modal__actions">
          <button className="btn btn-primary" onClick={handleUpdate}><FaSave /> Guardar</button>
          <button className="btn btn-outline" onClick={closeEditModal}><FaTimes /> Cerrar</button>
        </div>
      </Modal>

      <ToastContainer autoClose={3000} hideProgressBar={false} closeOnClick pauseOnHover draggable />
    </div>
  );
};

export default Proveedores;
