import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";   // instancia Axios con baseURL http://localhost:49146/api
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimientoproductos.css";
import "./Dashboardguarda";
import "./bitacora.jsx";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png"; // <-- para el PDF institucional
import { FaFilePdf } from "react-icons/fa";          // <-- icono PDF

Modal.setAppElement("#root");

export default function MantenimientoProducto() {
  // ====== estado tabla ======
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ====== filtros de búsqueda ======
  const [filtros, setFiltros] = useState({
    nombre: "",
    cantidad_minima: "",
    cantidad_maxima: ""
  });

  // ====== estado de formulario (compartido para crear/editar) ======
  const [newNombre_producto, setNewNombre_producto] = useState("");
  const [newCantidad_minima, setNewCantidad_minima] = useState("");
  const [newCantidad_maxima, setNewCantidad_maxima] = useState("");

  // ====== modales ======
  const [isModalOpen, setIsModalOpen] = useState(false);         // crear
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

  const camposCompletos = useMemo(
    () =>
      Boolean(
        newNombre_producto.trim() !== "" &&
          newCantidad_minima !== "" &&
          newCantidad_maxima !== ""
      ),
    [newNombre_producto, newCantidad_minima, newCantidad_maxima]
  );

  // ====== función de filtrado ======
  const aplicarFiltro = (producto) => {
    const nombreLower = producto.nombre_producto?.toLowerCase() || "";
    const filtroNombreLower = filtros.nombre.toLowerCase();
    
    if (filtros.nombre && !nombreLower.includes(filtroNombreLower)) {
      return false;
    }
    
    if (filtros.cantidad_minima) {
      const min = Number(filtros.cantidad_minima);
      if (producto.cantidad_minima < min) {
        return false;
      }
    }
    
    if (filtros.cantidad_maxima) {
      const max = Number(filtros.cantidad_maxima);
      if (producto.cantidad_maxima > max) {
        return false;
      }
    }
    
    return true;
  };

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

    if (
      (rol.includes("guarda") && rol.includes("almacen")) ||
      (rol.includes("auxiliar") &&
        rol.includes("de") &&
        rol.includes("almacen"))
    ) {
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
      console.error(
        `PUT /productos/${editItemId} error:`,
        error.response?.data || error
      );
      toast.error(
        error.response?.data?.mensaje || "Error al actualizar el producto"
      );
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
      toast.error(
        error.response?.data?.mensaje || "Error al eliminar el registro"
      );
    }
  };

  // ====== Permisos según rol ======
  const rawUser = localStorage.getItem("mm_user");
  const user = rawUser ? JSON.parse(rawUser) : null;
  const rol = (user?.rol_nombre || "").toLowerCase();

  const canEdit =
    rol.includes("admin") ||
    (rol.includes("guarda") && rol.includes("almacen")) ||
    (rol.includes("auxiliar") &&
      rol.includes("de") &&
      rol.includes("almacen"));

  // ====== REPORTE PDF (estilo institucional) ======
  const generarPDFProductos = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });

    // --- Encabezado DGMM ---
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

    // --- Tabla ---
    const columnas = [
      "ID Producto",
      "Nombre del producto",
      "Cantidad mínima",
      "Cantidad máxima",
    ];

    const filas = items.map((it) => [
      it.id_producto,
      it.nombre_producto,
      it.cantidad_minima,
      it.cantidad_maxima,
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 10, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] },
    });

    // --- Pie de página ---
    const h = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width / 2,
      h - 30,
      { align: "center" }
    );

    doc.save("Productos_DGMM.pdf");
  };

  // ====== UI ======
  return (
    <div className="mant-prod-page">
      {/* Encabezado institucional */}
      <div className="mant-prod-logo-wrap">
        <img src={logo} alt="DGMM" />
      </div>

      <div className="mant-prod-topbar" style={{ maxWidth: 1000 }}>
        <span className="mant-prod-topbar-title">Mantenimiento de Productos</span>

        <div className="mant-prod-topbar-actions">
          <button className="mant-prod-btn mant-prod-btn-topbar-outline" onClick={handleVolver}>
            ← Volver al Menú Principal
          </button>

          <button className="mant-prod-btn mant-prod-btn-topbar-outline" onClick={openModal} style={{ marginLeft: 8 }}>
            + Nuevo producto
          </button>

          <button
            className="mant-prod-btn mant-prod-btn-topbar-outline"
            onClick={generarPDFProductos}
            style={{ marginLeft: 8 }}
          >
            <FaFilePdf size={16} /> Generar Reporte
          </button>
        </div>
      </div>

      <div className="mant-prod-card" style={{ maxWidth: 1000 }}>
        
        {/* Filtros de búsqueda */}
        <div className="mant-prod-filters" style={{ marginBottom: 20, display: "flex", gap: 15, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 250px" }}>
            <label htmlFor="filtroNombre" style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
              Nombre del producto:
            </label>
            <input
              id="filtroNombre"
              type="text"
              placeholder="Buscar por nombre..."
              value={filtros.nombre}
              onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label htmlFor="filtroCantMin" style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
              Cantidad mínima ≥:
            </label>
            <input
              id="filtroCantMin"
              type="number"
              placeholder="Ej: 10"
              value={filtros.cantidad_minima}
              onChange={(e) => setFiltros({ ...filtros, cantidad_minima: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ flex: "1 1 150px" }}>
            <label htmlFor="filtroCantMax" style={{ display: "block", marginBottom: 5, fontWeight: "bold" }}>
              Cantidad máxima ≤:
            </label>
            <input
              id="filtroCantMax"
              type="number"
              placeholder="Ej: 100"
              value={filtros.cantidad_maxima}
              onChange={(e) => setFiltros({ ...filtros, cantidad_maxima: e.target.value })}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 4, border: "1px solid #ccc" }}
            />
          </div>

          <div style={{ flex: "0 0 auto", display: "flex", alignItems: "flex-end" }}>
            <button
              className="mant-prod-btn mant-prod-btn-topbar-outline"
              onClick={() => setFiltros({ nombre: "", cantidad_minima: "", cantidad_maxima: "" })}
              style={{ padding: "8px 16px" }}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mant-prod-loading">Cargando...</div>
        ) : (
          <table className="mant-prod-table">
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
              {(() => {
                const productosFiltrados = items.filter(aplicarFiltro);
                return productosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center">
                      Sin registros
                    </td>
                  </tr>
                ) : (
                  productosFiltrados.map((it) => (
                  <tr key={it.id_producto}>
                    <td>{it.id_producto}</td>
                    <td>{it.nombre_producto}</td>
                    <td>{it.cantidad_minima}</td>
                    <td>{it.cantidad_maxima}</td>
                    <td>
                      {canEdit && (
                        <>
                          <button
                            className="mant-prod-btn mant-prod-btn-sm mant-prod-btn-outline-primary mant-prod-me-2"
                            onClick={() => openEditModal(it)}
                          >
                            Editar
                          </button>
                          <button
                            className="mant-prod-btn mant-prod-btn-sm mant-prod-btn-outline-danger"
                            onClick={() => handleDelete(it.id_producto)}
                          >
                            Eliminar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  ))
                );
              })()}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Crear */}
      {isModalOpen && (
        <div className="mant-prod-modal-overlay" onClick={closeModal}>
          <div
            className="mant-prod-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 550 }}
          >
            <div className="mant-prod-modal-header">
              <h3>Crear Producto</h3>
              <button className="mant-prod-modal-close" onClick={closeModal}>
                ✕
              </button>
            </div>

            <div className="mant-prod-modal-body">
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Nombre del Producto</label>
                  <input
                    className="mant-prod-form-control"
                    placeholder="Nombre del producto"
                    value={newNombre_producto}
                    onChange={(e) => setNewNombre_producto(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Mínima</label>
                    <input
                      className="mant-prod-form-control"
                      type="number"
                      min="0"
                      placeholder="Mínima"
                      value={newCantidad_minima}
                      onChange={(e) => setNewCantidad_minima(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Máxima</label>
                    <input
                      className="mant-prod-form-control"
                      type="number"
                      min="0"
                      placeholder="Máxima"
                      value={newCantidad_maxima}
                      onChange={(e) => setNewCantidad_maxima(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mant-prod-modal-footer">
              <button className="mant-prod-btn mant-prod-btn-secondary" onClick={closeModal}>
                Cerrar
              </button>
              <button className="mant-prod-btn mant-prod-btn-success" onClick={handleCreate}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {isEditModalOpen && (
        <div className="mant-prod-modal-overlay" onClick={closeEditModal}>
          <div
            className="mant-prod-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 550 }}
          >
            <div className="mant-prod-modal-header">
              <h3>Editar Producto</h3>
              <button className="mant-prod-modal-close" onClick={closeEditModal}>
                ✕
              </button>
            </div>

            <div className="mant-prod-modal-body">
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Nombre del Producto</label>
                  <input
                    className="mant-prod-form-control"
                    placeholder="Nombre del producto"
                    value={newNombre_producto}
                    onChange={(e) => setNewNombre_producto(e.target.value)}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Mínima</label>
                    <input
                      className="mant-prod-form-control"
                      type="number"
                      min="0"
                      placeholder="Mínima"
                      value={newCantidad_minima}
                      onChange={(e) => setNewCantidad_minima(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Cantidad Máxima</label>
                    <input
                      className="mant-prod-form-control"
                      type="number"
                      min="0"
                      placeholder="Máxima"
                      value={newCantidad_maxima}
                      onChange={(e) => setNewCantidad_maxima(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mant-prod-modal-footer">
              <button className="mant-prod-btn mant-prod-btn-secondary" onClick={closeEditModal}>
                Cerrar
              </button>
              <button className="mant-prod-btn mant-prod-btn-success" onClick={handleUpdate}>
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer autoClose={3000} hideProgressBar={false} />
    </div>
  );
}



