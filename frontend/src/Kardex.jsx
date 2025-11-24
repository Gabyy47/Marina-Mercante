import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function Kardex() {
  const navigate = useNavigate();

  const [kardex, setKardex] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const [filtros, setFiltros] = useState({
    producto: "",
    tipo: "",
    fecha: "",
    usuario: ""
  });

  // =======================
  //   Cargar datos
  // =======================
  const cargarDatos = async () => {
    setLoading(true);
    setError(null);

    try {
      const [rKardex, rProductos] = await Promise.all([
        api.get("/kardex"),
        api.get("/productos")
      ]);

      setKardex(rKardex.data || []);
      setProductos(rProductos.data || []);

    } catch (e) {
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url
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
    const { producto, tipo, fecha, usuario } = filtros;

    return (
      (!producto || item.producto?.toLowerCase().includes(producto.toLowerCase())) &&
      (!tipo || item.tipo_movimiento === tipo) &&
      (!usuario || String(item.id_usuario).includes(usuario)) &&
      (!fecha || new Date(item.fecha).toDateString() === new Date(fecha).toDateString())
    );
  };

  const kardexFiltrado = kardex.filter(aplicarFiltro);

  // =======================
  //   Generar PDF
  // =======================
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    // ENCABEZADO
    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Kardex", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    // TABLA
    const columnas = ["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Motivo"];

    const filas = kardexFiltrado.map(k => [
      new Date(k.fecha).toLocaleString(),
      k.producto,
      k.tipo_movimiento,
      k.cantidad,
      k.id_usuario,
      k.motivo || ""
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] }
    });

    // PIE DE PÁGINA
    const h = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width / 2,
      h - 30,
      { align: "center" }
    );

    doc.save("Kardex_DGMM.pdf");
  };

  // =======================
  //   UI
  // =======================
  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

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

      <div className="inventario-card">

        {/* ERROR */}
        {error && (
          <div className="inventario-error" style={{ padding: 12 }}>
            <strong>Error cargando datos:</strong>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        )}

        {/* FILTROS */}
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

        {/* TABLA */}
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
                  <td>{k.tipo_movimiento}</td>
                  <td>{k.cantidad}</td>
                  <td>{k.id_usuario}</td>
                  <td>{k.motivo || "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="no-data">No hay registros que coincidan.</td>
              </tr>
            )}
          </tbody>
        </table>

      </div>
    </div>
  );
}
