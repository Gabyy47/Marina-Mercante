import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./Compra.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";



export default function Compra() {
  const navigate = useNavigate();
  

  const [compras, setCompras] = useState([]);
  const [proveedores, setProveedores] = useState([]);

  const [form, setForm] = useState({
    id_proveedor: "",
    total: "",
  });

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [filtros, setFiltros] = useState({
    proveedor: "",
    usuario: "",
    fecha: "",
  });

  // Modal de detalle
  const [showModal, setShowModal] = useState(false);
  const [detalleCompra, setDetalleCompra] = useState([]);
  const [compraSeleccionada, setCompraSeleccionada] = useState(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);

  // Modal de nueva compra
  const [showModalNueva, setShowModalNueva] = useState(false);
  const [productos, setProductos] = useState([]);
  const [formNuevaCompra, setFormNuevaCompra] = useState({
    id_proveedor: "",
    detalles: []
  });
  const [formDetalle, setFormDetalle] = useState({
    id_producto: "",
    cantidad: "",
    precio_compra: ""
  });

  // ============================
  // CARGAR COMPRAS + PROVEEDORES
  // ============================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rCompras, rProv, rProd] = await Promise.all([
        api.get("/compra"),
        api.get("/proveedor"),
        api.get("/productos")
      ]);

      setCompras(rCompras.data || []);
      setProveedores(rProv.data || []);
      setProductos(rProd.data || []);

    } catch (e) {
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
      });
    }

    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  // ============================
  // FILTRADO
  // ============================
  const aplicarFiltro = (compra) => {
    const { proveedor, usuario, fecha } = filtros;

    return (
      (!proveedor ||
        compra.nombre_proveedor?.toLowerCase().includes(proveedor.toLowerCase())) &&
      (!usuario || 
        compra.nombre_usuario?.toLowerCase().includes(usuario.toLowerCase())) &&
      (!fecha ||
        new Date(compra.fecha).toLocaleDateString('en-CA') === fecha)
    );
  };

  const comprasFiltradas = compras.filter(aplicarFiltro);

  // ============================
  // VER DETALLE DE COMPRA
  // ============================
  const verDetalle = async (compra) => {
    setCompraSeleccionada(compra);
    setShowModal(true);
    setLoadingDetalle(true);
    setDetalleCompra([]);

    try {
      const res = await api.get("/detalle_compra");
      // Filtrar solo los detalles de esta compra
      const detallesFiltrados = (res.data || []).filter(
        (d) => d.id_compra === compra.id_compra
      );
      setDetalleCompra(detallesFiltrados);
    } catch (e) {
      console.error("Error cargando detalle de compra:", e);
    } finally {
      setLoadingDetalle(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setCompraSeleccionada(null);
    setDetalleCompra([]);
  };

  // ============================
  // NUEVA COMPRA
  // ============================
  const abrirModalNueva = () => {
    setShowModalNueva(true);
    setFormNuevaCompra({ id_proveedor: "", detalles: [] });
    setFormDetalle({ id_producto: "", cantidad: "", precio_compra: "" });
  };

  const cerrarModalNueva = () => {
    setShowModalNueva(false);
    setFormNuevaCompra({ id_proveedor: "", detalles: [] });
    setFormDetalle({ id_producto: "", cantidad: "", precio_compra: "" });
  };

  const agregarDetalle = () => {
    if (!formDetalle.id_producto || !formDetalle.cantidad || !formDetalle.precio_compra) {
      return alert("Complete todos los campos del detalle");
    }

    const producto = productos.find(p => p.id_producto === parseInt(formDetalle.id_producto));
    
    const nuevoDetalle = {
      id_producto: parseInt(formDetalle.id_producto),
      nombre_producto: producto?.nombre_producto || "Desconocido",
      cantidad: parseInt(formDetalle.cantidad),
      precio_compra: parseFloat(formDetalle.precio_compra)
    };

    setFormNuevaCompra({
      ...formNuevaCompra,
      detalles: [...formNuevaCompra.detalles, nuevoDetalle]
    });

    setFormDetalle({ id_producto: "", cantidad: "", precio_compra: "" });
  };

  const eliminarDetalle = (index) => {
    const nuevosDetalles = formNuevaCompra.detalles.filter((_, i) => i !== index);
    setFormNuevaCompra({ ...formNuevaCompra, detalles: nuevosDetalles });
  };

  const guardarNuevaCompra = async () => {
    if (!formNuevaCompra.id_proveedor) {
      return alert("Seleccione un proveedor");
    }

    if (formNuevaCompra.detalles.length === 0) {
      return alert("Agregue al menos un producto al detalle");
    }

    try {
      setLoading(true);

      // 1. Crear la compra
      const resCompra = await api.post("/sp-compras", {
        id_proveedor: parseInt(formNuevaCompra.id_proveedor)
      });

      const id_compra = resCompra.data.id_compra;

      // 2. Insertar cada detalle
      for (const detalle of formNuevaCompra.detalles) {
        await api.post("/sp-detalle-compra", {
          id_compra: id_compra,
          id_producto: detalle.id_producto,
          cantidad: detalle.cantidad,
          precio: detalle.precio_compra
        });
      }

      alert("Compra registrada correctamente");
      cerrarModalNueva();
      cargarDatos();

    } catch (e) {
      console.error("Error al guardar compra:", e);
      alert("Error al guardar la compra: " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // CREAR COMPRA (FORMULARIO ANTIGUO - ELIMINAR DESPUÉS)
  // ============================
  const handleCrearCompra = async (e) => {
    e.preventDefault();

    if (!form.id_proveedor) return alert("Seleccione un proveedor");
    if (!form.total || form.total <= 0) return alert("Total inválido");

    try {
      setLoading(true);
      setError(null);

      const res = await api.post("/compra", form);
      const id_compra = res.data.id_compra;

      alert("Compra creada correctamente");
      navigate(`/detalle_compra/${id_compra}`);

    } catch (e) {
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
      });
    }

    setLoading(false);
  };

  return (
    <div className="inventario-page">

      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar">
        <span className="topbar-title">Lista de Compras</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={abrirModalNueva}>＋ Nueva Compra</button>
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={cargarDatos}>⟳ Refrescar</button>
        </div>
      </div>

      <div className="inventario-card">

        {/* ERROR */}
        {error && (
          <div className="inventario-error">
            <strong>Error cargando datos:</strong>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        {/* CARGANDO */}
        {loading && <div className="loading-msg">Cargando...</div>}

        {/* FILTROS */}
        <div className="inventario-filtros">
          <input
            placeholder="Filtrar por proveedor"
            value={filtros.proveedor}
            onChange={(e) => setFiltros({ ...filtros, proveedor: e.target.value })}
          />

          <input
            placeholder="Filtrar por usuario"
            value={filtros.usuario}
            onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
          />

          <input
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
          />
        </div>

        {/* TABLA DE COMPRAS */}
        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Proveedor</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {comprasFiltradas.length > 0 ? (
              comprasFiltradas.map((c) => (
                <tr key={c.id_compra}>
                  <td>{c.id_compra}</td>
                  <td>{c.nombre_proveedor}</td>
                  <td>{c.nombre_usuario}</td>
                  <td>{new Date(c.fecha).toLocaleString()}</td>
                  <td>L. {Number(c.total).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>
                    <button
                      className="btn-table"
                      onClick={() => verDetalle(c)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="no-data">No hay compras registradas.</td></tr>
            )}
          </tbody>
        </table>

      </div>

      {/* MODAL NUEVA COMPRA */}
      {showModalNueva && (
        <div className="inv-modal-overlay" onClick={cerrarModalNueva}>
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 900 }}
          >
            <div className="inv-modal-header">
              <h3>Nueva Compra</h3>
              <button className="inv-modal-close" onClick={cerrarModalNueva}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              {/* Selección de proveedor */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: "block", marginBottom: 8, fontWeight: "bold" }}>
                  Proveedor:
                </label>
                <select
                  className="form-control"
                  value={formNuevaCompra.id_proveedor}
                  onChange={(e) => setFormNuevaCompra({ ...formNuevaCompra, id_proveedor: e.target.value })}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                >
                  <option value="">Seleccione proveedor</option>
                  {proveedores.map((p) => (
                    <option key={p.id_proveedor} value={p.id_proveedor}>
                      {p.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Agregar detalle de producto */}
              <div style={{ marginBottom: 20, padding: 15, background: "#f5f5f5", borderRadius: 8 }}>
                <h4 style={{ marginBottom: 12 }}>Agregar Producto</h4>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto", gap: 10, alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>Producto</label>
                    <select
                      className="form-control"
                      value={formDetalle.id_producto}
                      onChange={(e) => setFormDetalle({ ...formDetalle, id_producto: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                    >
                      <option value="">Seleccione...</option>
                      {productos.map((prod) => (
                        <option key={prod.id_producto} value={prod.id_producto}>
                          {prod.nombre_producto}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>Cantidad</label>
                    <input
                      type="number"
                      className="form-control"
                      value={formDetalle.cantidad}
                      onChange={(e) => setFormDetalle({ ...formDetalle, cantidad: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>Precio</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={formDetalle.precio_compra}
                      onChange={(e) => setFormDetalle({ ...formDetalle, precio_compra: e.target.value })}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                    />
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={agregarDetalle}
                    style={{ padding: "8px 16px", height: "38px" }}
                  >
                    ＋ Agregar
                  </button>
                </div>
              </div>

              {/* Tabla de detalles agregados */}
              {formNuevaCompra.detalles.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 10 }}>Productos Agregados</h4>
                  <table className="inventario-table">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Cantidad</th>
                        <th>Precio</th>
                        <th>Subtotal</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formNuevaCompra.detalles.map((det, idx) => (
                        <tr key={idx}>
                          <td>{det.nombre_producto}</td>
                          <td>{det.cantidad}</td>
                          <td>L. {Number(det.precio_compra).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>L. {(det.cantidad * det.precio_compra).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => eliminarDetalle(idx)}
                              style={{ padding: "4px 8px" }}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                      <tr style={{ fontWeight: "bold", background: "#f0f0f0" }}>
                        <td colSpan="3" style={{ textAlign: "right" }}>Total:</td>
                        <td colSpan="2">
                          L. {formNuevaCompra.detalles.reduce((sum, d) => sum + (d.cantidad * d.precio_compra), 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="inv-modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalNueva}>
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={guardarNuevaCompra}
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar Compra"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE DE COMPRA */}
      {showModal && (
        <div
          className="inv-modal-overlay"
          onClick={cerrarModal}
        >
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 800 }}
          >
            <div className="inv-modal-header">
              <h3>
                Detalle de Compra #{compraSeleccionada?.id_compra}
              </h3>
              <button className="inv-modal-close" onClick={cerrarModal}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              {/* Información de la compra */}
              {compraSeleccionada && (
                <div style={{ marginBottom: 20 }}>
                  <p><strong>Proveedor:</strong> {compraSeleccionada.nombre_proveedor}</p>
                  <p><strong>Fecha:</strong> {new Date(compraSeleccionada.fecha).toLocaleString()}</p>
                  <p><strong>Total:</strong> L. {Number(compraSeleccionada.total).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              )}

              {/* Tabla de detalles */}
              {loadingDetalle ? (
                <p>Cargando detalles...</p>
              ) : detalleCompra.length === 0 ? (
                <p>No hay detalles para esta compra.</p>
              ) : (
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Cantidad</th>
                      <th>Precio Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalleCompra.map((det, idx) => (
                      <tr key={idx}>
                        <td>{det.producto || det.nombre_producto}</td>
                        <td>{det.cantidad}</td>
                        <td>L. {Number(det.precio_compra || det.precio_unitario || 0).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>L. {(Number(det.cantidad) * Number(det.precio_compra || det.precio_unitario || 0)).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="inv-modal-footer">
              <button
                className="btn btn-topbar-outline"
                onClick={cerrarModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

