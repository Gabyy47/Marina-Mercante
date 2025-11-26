// ===============================
//   Gestión de Salidas – DGMM
// ===============================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

export default function Salidas() {
  const navigate = useNavigate();

  // ===============================
  //      Estados principales
  // ===============================
  const [salidas, setSalidas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [motivo, setMotivo] = useState("");
  const [productoSel, setProductoSel] = useState("");
  const [cantidad, setCantidad] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ===============================
  //   Cargar salidas
  // ===============================
  const cargarSalidas = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/salida");
      setSalidas(res.data || []);
    } catch (e) {
      console.error("Error cargando salidas:", e);
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url
      });
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  //     Cargar productos
  // ===============================
  const cargarProductos = async () => {
    try {
      const res = await api.get("/productos");
      setProductos(res.data || []);
    } catch (e) {
      console.error("Error cargando productos:", e);
    }
  };

  useEffect(() => {
    cargarSalidas();
    cargarProductos();
  }, []);

  useEffect(() => {
    const h = () => cargarSalidas();
    window.addEventListener("dataChanged", h);
    return () => window.removeEventListener("dataChanged", h);
  }, []);

  // ===============================
  //   Crear nueva salida COMPLETA
  // ===============================
  const handleCrearSalida = async (e) => {
    e.preventDefault();

    if (!motivo.trim()) return alert("El motivo es obligatorio");
    if (!productoSel) return alert("Debe seleccionar un producto");
    if (!cantidad || cantidad <= 0) return alert("Cantidad inválida");

    try {
      setLoading(true);
      setError(null);

      // 1️⃣ Crear encabezado de salida
      const r1 = await api.post("/salida", { motivo });
      const id_salida = r1.data.id_salida;

      // 2️⃣ Insertar detalle salida
      await api.post("/salida/detalle", {
        id_salida,
        id_producto: productoSel,
        cantidad
      });

      // 3️⃣ Reset
      setMotivo("");
      setProductoSel("");
      setCantidad(0);

      cargarSalidas();
      window.dispatchEvent(new Event("dataChanged"));

      alert("Salida registrada correctamente");
    } catch (e) {
      console.error("Error creando salida:", e);
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url
      });
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  //   UI
  // ===============================
  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar">
        <span className="topbar-title">Gestión de Salidas</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>
            ← Menú
          </button>
          <button className="btn btn-topbar-outline" onClick={cargarSalidas}>
            ⟳ Refrescar
          </button>
        </div>
      </div>

      <div className="inventario-card">
        {/* ERROR */}
        {error && (
          <div className="inventario-error">
            <strong>Error cargando datos:</strong>
            <div>Mensaje: {String(error.message)}</div>
            <div>URL: {error.url || "-"}</div>
            <div>Estado: {error.status || "-"}</div>
            <pre>{JSON.stringify(error.data, null, 2)}</pre>
          </div>
        )}

        {/* TABLA */}
        <h3>Salidas registradas</h3>
        <table className="inventario-table inv-style2">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Motivo</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {salidas.length > 0 ? (
              salidas.map((s) => (
                <tr key={s.id_salida}>
                  <td>{s.id_salida}</td>
                  <td>{s.nombre_usuario}</td>
                  <td>{new Date(s.fecha_salida).toLocaleString("es-HN")}</td>
                  <td>{s.motivo}</td>
                  <td>
                    <button
                      className="btn btn-topbar-outline btn-sm"
                      onClick={() => navigate(`/guarda/DetalleSalidas/${s.id_salida}`)}

                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="no-data">
                  No hay salidas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FORMULARIO */}
        <h3>Nueva Salida</h3>

        <form onSubmit={handleCrearSalida}>
          <textarea
            placeholder="Motivo de la salida"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />

          <select
            value={productoSel}
            onChange={(e) => setProductoSel(e.target.value)}
          >
            <option value="">Seleccione un producto</option>
            {productos.map((p) => (
              <option key={p.id_producto} value={p.id_producto}>
                {p.nombre_producto}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="1"
            placeholder="Cantidad"
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value))}
          />

          <button className="btn btn-topbar-primary" type="submit">
            Guardar salida
          </button>
        </form>
      </div>
    </div>
  );
}

