import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
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
  const [loading, setLoading] = useState(false); // ← ahora sí lo usamos

  // ============================
  // CARGAR COMPRAS + PROVEEDORES
  // ============================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rCompras, rProv] = await Promise.all([
        api.get("/compra"),
        api.get("/proveedor"),
      ]);

      setCompras(rCompras.data || []);
      setProveedores(rProv.data || []);

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
  // CREAR COMPRA
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

        {/* TABLA DE COMPRAS */}
        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Proveedor</th>
              <th>Fecha</th>
              <th>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {compras.length > 0 ? (
              compras.map((c) => (
                <tr key={c.id_compra}>
                  <td>{c.id_compra}</td>
                  <td>{c.nombre_proveedor}</td>
                  <td>{new Date(c.fecha).toLocaleString()}</td>
                  <td>L. {Number(c.total).toFixed(2)}</td>
                  <td>
                    <button
                      className="btn-table"
                      onClick={() => navigate(`/detalle_compra/${c.id_compra}`)}
                    >
                      Ver detalle
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="no-data">No hay compras registradas.</td></tr>
            )}
          </tbody>
        </table>

        {/* FORM NUEVA COMPRA */}
        <h3 className="form-title">Nueva compra</h3>

        <form className="inventario-form" onSubmit={handleCrearCompra}>
          <select
            value={form.id_proveedor}
            onChange={(e) => setForm({ ...form, id_proveedor: e.target.value })}
          >
            <option value="">Seleccione proveedor</option>
            {proveedores.map((p) => (
              <option key={p.id_proveedor} value={p.id_proveedor}>
                {p.nombre}
              </option>
            ))}
          </select>

          <input
            type="number"
            placeholder="Total de compra"
            value={form.total}
            onChange={(e) => setForm({ ...form, total: e.target.value })}
          />

          <button className="btn btn-topbar-primary" type="submit">
            Guardar
          </button>
        </form>

      </div>
    </div>
  );
}

