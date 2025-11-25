import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";

// Estilos institucionales
import "./inventario.css";
import "./Kardex.css";

// Logo DGMM
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Kardex() {
  const navigate = useNavigate();

  // Estados
  const [kardex, setKardex] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    producto: "",
    tipo: "",
    usuario: "",
    fecha: "",
  });

  // =======================
  //   Cargar datos
  // =======================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rKardex, rProductos] = await Promise.all([
        api.get("/kardex"), // Backend ya corregido
        api.get("/productos"),
      ]);

      setKardex(rKardex.data || []);
      setProductos(rProductos.data || []);

    } catch (e) {
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url,
      });
    }

    setLoading(false);
  };

  useEffect(() => { cargarDatos(); }, []);

  useEffect(() => {
    const handler = () => cargarDatos();
    window.addEventListener("dataChanged", handler);
    return () => window.removeEventListener("dataChanged", handler);
  }, []);

  // =======================
  //   Filtrado
  // =======================
  const aplicarFiltro = (item) => {
    const { producto, tipo, usuario, fecha } = filtros;

    return (
      (!producto ||
        item.producto?.toLowerCase().includes(producto.toLowerCase())) &&
      (!tipo || item.tipo_movimiento === tipo) &&
      (!usuario || String(item.id_usuario).includes(usuario)) &&
      (!fecha ||
        new Date(item.fecha).toDateString() === new Date(fecha).toDateString())
    );
  };

  const kardexFiltrado = kardex.filter(aplicarFiltro);

  // =======================
  //   Generar PDF
  // =======================
  const generarPDF = () => {
    const doc = new jsPDF();

    // Encabezado DGMM
    doc.addImage(logoDGMM, "PNG", 20, 15, 110, 55);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Dirección General de la Marina Mercante", 150, 40);

    doc.setFontSize(14);
    doc.text("Reporte de Kardex", 150, 65);

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 85);

    // Datos tabla
    const columnas = ["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Motivo"];

    const filas = kardexFiltrado.map((k) => [
      new Date(k.fecha).toLocaleString(),
      k.producto,
      k.tipo_movimiento,
      k.cantidad,
      k.id_usuario,
      k.motivo || "",
    ]);

    autoTable(doc, {
      startY: 100,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [11, 58, 67], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [245, 248, 249] },
    });

    doc.save("Kardex_DGMM.pdf");
  };

  // =======================
  //   UI
  // =======================
  return (
    <div className="inventario-page">
      {/* Logo DGMM */}
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      {/* Topbar */}
      <div className="inventario-topbar">
        <span className="topbar-title">Inventario – Kardex</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>
            ← Menú
          </button>

          <button className="btn btn-topbar-outline" onClick={cargarDatos}>
            ⟳ Refrescar
          </button>

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            📄 Generar PDF
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="inventario-card">
        {error && (
          <div className="inventario-error">
            <strong>Error cargando datos:</strong>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        {/* Filtros */}
        <div className="inventario-filtros">
          <input
            placeholder="Filtrar por producto"
            value={filtros.producto}
            onChange={(e) => setFiltros({ ...filtros, producto: e.target.value })}
          />

          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
          >
            <option value="">Tipo (Todos)</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>

          <input
            placeholder="ID Usuario"
            value={filtros.usuario}
            onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
          />

          <input
            type="date"
            value={filtros.fecha}
            onChange={(e) => setFiltros({ ...filtros, fecha: e.target.value })}
          />
        </div>

        {/* Tabla */}
        <table className="inventario-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Cantidad</th>
              <th>Usuario</th>
              <th>Motivo</th>
            </tr>
          </thead>

          <tbody>
            {kardexFiltrado.length > 0 ? (
              kardexFiltrado.map((k) => (
                <tr key={k.id_kardex}>
                  <td>{new Date(k.fecha).toLocaleString()}</td>
                  <td>{k.producto}</td>
                  <td className={`mov-${k.tipo_movimiento}`}>{k.tipo_movimiento}</td>
                  <td>{k.cantidad}</td>
                  <td>{k.id_usuario}</td>
                  <td>{k.motivo || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-data">No hay registros.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

