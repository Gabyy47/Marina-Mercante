import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNavigate } from "react-router-dom";
import api from "./api";   // instancia Axios con baseURL http://localhost:49146/api
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimiento.css";
import "./Dashboardguarda";
import "./bitacora.jsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";


Modal.setAppElement("#root");

export default function MantenimientoProducto() {
  // ====== estado tabla ======
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  // ====== estado de formulario (compartido para crear/editar) ======
  const [newNombre_producto, setNewNombre_producto] = useState("");
  const [newCantidad_minima, setNewCantidad_minima] = useState("");
  const [newCantidad_maxima, setNewCantidad_maxima] = useState("");

  // ====== modales ======
  const [isModalOpen, setIsModalOpen] = useState(false);        // crear
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // editar
  const [editItemId, setEditItemId] = useState(null);

  // ====== helpers ======
  const limpiarCampos = () => {
    setNewNombre_producto("");
    setNewCantidad_minima("");
    setNewCantidad_maxima("");
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
    setEditItemId(item.id_producto);
    setNewNombre_producto(item.nombre_producto ?? "");
    setNewCantidad_minima(
      item.cantidad_minima !== null && item.cantidad_minima !== undefined
        ? String(item.cantidad_minima)
        : ""
    );
    setNewCantidad_maxima(
      item.cantidad_maxima !== null && item.cantidad_maxima !== undefined
        ? String(item.cantidad_maxima)
        : ""
    );
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const camposCompletos = useMemo(() => {
    return Boolean(
      newNombre_producto.trim() !== "" &&
      newCantidad_minima !== "" &&
      newCantidad_maxima !== ""
    );
  }, [newNombre_producto, newCantidad_minima, newCantidad_maxima]);

  const validarNumeros = () => {
    const min = Number(newCantidad_minima);
    const max = Number(newCantidad_maxima);

    if (Number.isNaN(min) || Number.isNaN(max)) {
      toast.error("Las cantidades deben ser numéricas.");
      return null;
    }
    if (min < 0 || max < 0) {
      toast.error("Las cantidades no pueden ser negativas.");
      return null;
    }
    if (min > max) {
      toast.error("La cantidad mínima no puede ser mayor que la máxima.");
      return null;
    }
    return { min, max };
  };

  const handleVolver = () => {
  const rawUser = localStorage.getItem("mm_user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const rol = (user?.rol_nombre || "").toLowerCase();

  if (rol.includes("guarda") && rol.includes("almacen")|| (rol.includes("auxiliar") && rol.includes("de") && rol.includes("almacen"))) {
    navigate("/guarda/dashboard");
  } else if (rol.includes("admin")) {
    navigate("/dashboard");
  } else {
    navigate("/"); // por si acaso
  }
};


  // ====== API ======
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/productos");
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET /productos error:", error.response?.data || error);
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
    const valid = validarNumeros();
    if (!valid) return;

    const body = {
      nombre_producto: newNombre_producto.trim(),
      cantidad_minima: valid.min,
      cantidad_maxima: valid.max,
    };

    try {
      await api.post("/productos", body);
      toast.success("¡Producto creado con éxito!");
      await fetchItems();
      closeModal();
    } catch (error) {
      console.error("POST /productos error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al guardar datos");
    }
  };

  const handleUpdate = async () => {
    if (!editItemId) return;

    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const valid = validarNumeros();
    if (!valid) return;

    const body = {
      nombre_producto: newNombre_producto.trim(),
      cantidad_minima: valid.min,
      cantidad_maxima: valid.max,
    };

    try {
      await api.put(`/productos/${editItemId}`, body);
      toast.success("¡Producto actualizado con éxito!");
      await fetchItems();
      closeEditModal();
    } catch (error) {
      console.error(`PUT /productos/${editItemId} error:`, error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al actualizar el producto");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este producto?")) return;
    try {
      await api.delete(`/productos/${id}`);
      toast.success("Registro eliminado con éxito");
      setItems((prev) => prev.filter((i) => i.id_producto !== id));
    } catch (error) {
      console.error("DELETE /productos error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al eliminar el registro");
    }
  };

  // Obtener usuario y rol desde localStorage
const rawUser = localStorage.getItem("mm_user");
const user = rawUser ? JSON.parse(rawUser) : null;
const rol = (user?.rol_nombre || "").toLowerCase();
  // Puede editar si es admin o guarda almacén
const canEdit =
  rol.includes("admin") || (rol.includes("guarda") && rol.includes("almacen"))|| (rol.includes("auxiliar") && rol.includes("de") && rol.includes("almacen"));

 const handleGenerarPDF = () => {
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Reporte de Productos", 14, 15);

  const tableColumn = ["ID", "Nombre del producto", "Cantidad Mínima", "Cantidad Máxima"];
  const tableRows = [];

  items.forEach((it) => {
    tableRows.push([
      it.id_producto,
      it.nombre_producto,
      it.cantidad_minima,
      it.cantidad_maxima
    ]);
  });

  autoTable(doc, {
    head: [tableColumn],
    body: tableRows,
    startY: 25,
  });

  doc.save("reporte_productos.pdf");
};


  // ====== UI ======
  return (
    <div className="mm-page">
      {/* Encabezado institucional */}
      <header className="mm-header">
        <img src={logo} alt="DGMM" className="mm-logo" />
      </header>

      <section className="mm-card">
        <div className="mm-card__head">
          <h2>Mantenimiento de Productos</h2>
          <div className="mm-actions">
            <button className="link-volver" onClick={handleVolver}>
             ← Volver al Menú Principal
             </button>
            <button className="btn btn-primary" onClick={openModal}>
              + Nuevo producto
            </button>
          </div>
        </div>
         <button className="btn btn-pdf" onClick={handleGenerarPDF}>
  Generar PDF
</button>
        <div className="mm-table__wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Nombre del producto</th>
                <th>Cantidad Mínima</th>
                <th>Cantidad Máxima</th>
                <th style={{ width: 160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center">Cargando…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">Sin registros</td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id_producto}>
                    <td>{it.id_producto}</td>
                    <td>{it.nombre_producto}</td>
                    <td>{it.cantidad_minima}</td>
                    <td>{it.cantidad_maxima}</td>
                    <td className="mm-actions--row">
                      {canEdit && (
                            <>
                          <button
                        className="btn btn-outline"
                        onClick={() => openEditModal(it)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(it.id_producto)}
                      >
                        Eliminar
                      </button>
                      </>
                      )}
                    </td>
                  </tr> 
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Crear */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Crear Producto</h3>
        <div className="mm-form">
          <input
            value={newNombre_producto}
            onChange={(e) => setNewNombre_producto(e.target.value)}
            placeholder="Nombre del producto"
          />
          <input
            type="number"
            min="0"
            value={newCantidad_minima}
            onChange={(e) => setNewCantidad_minima(e.target.value)}
            placeholder="Cantidad mínima"
          />
          <input
            type="number"
            min="0"
            value={newCantidad_maxima}
            onChange={(e) => setNewCantidad_maxima(e.target.value)}
            placeholder="Cantidad máxima"
          />
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

      {/* Modal Editar */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeEditModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Editar Producto</h3>
        <div className="mm-form">
          <input
            value={newNombre_producto}
            onChange={(e) => setNewNombre_producto(e.target.value)}
            placeholder="Nombre del producto"
          />
          <input
            type="number"
            min="0"
            value={newCantidad_minima}
            onChange={(e) => setNewCantidad_minima(e.target.value)}
            placeholder="Cantidad mínima"
          />
          <input
            type="number"
            min="0"
            value={newCantidad_maxima}
            onChange={(e) => setNewCantidad_maxima(e.target.value)}
            placeholder="Cantidad máxima"
          />
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


