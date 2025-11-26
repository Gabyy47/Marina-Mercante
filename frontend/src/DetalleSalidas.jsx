import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

export default function DetalleSalidas() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [detalle, setDetalle] = useState([]);
  const [error, setError] = useState(null);

const cargarDetalle = async () => {
  try {
    const res = await api.get(`/api/salida/detalle/${id}`);
    setDetalle(res.data || []);
  } catch (e) {
    console.error("Error cargando detalle:", e);
    setError(e.response?.data || { mensaje: "Error desconocido" });
  }
};


useEffect(() => {
  if (!id || isNaN(id)) {
    setError({ mensaje: "ID inválido" });
    return;
  }
  cargarDetalle();
}, [id]);

console.log("useParams ID:", id);
console.log("window URL:", window.location.href);

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar">
        <span className="topbar-title">Detalle de Salida #{id}</span>

        <div className="topbar-actions">
          <button
            className="btn btn-topbar-outline"
            onClick={() => navigate("/salidas")}
          >
            ← Volver a salidas
          </button>
        </div>
      </div>

      <div className="inventario-card">
        {error && (
          <div className="inventario-error">
            <strong>Error cargando datos:</strong>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        <table className="inventario-table inv-style2">
          <thead>
            <tr>
              <th>#</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Fecha movimiento</th>
            </tr>
          </thead>

          <tbody>
            {detalle.length > 0 ? (
              detalle.map((d) => (
                <tr key={d.id_detalle_salida}>
                  <td>{d.id_detalle_salida}</td>
                  <td>{d.nombre_producto}</td>
                  <td>{d.cantidad}</td>
                  <td>{new Date(d.fecha).toLocaleString("es-HN")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="no-data">
                  No hay movimientos para esta salida.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


