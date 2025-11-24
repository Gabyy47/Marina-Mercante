import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function DetalleSalida() {
  const navigate = useNavigate();

const usuarioData = JSON.parse(localStorage.getItem("usuarioData"));
console.log(usuarioData.id_rol);


  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    id_salida: "",
    id_producto: "",
    cantidad: "",
  });

  const [creating, setCreating] = useState(false);

  // =======================
  //   GENERAR PDF
  // =======================
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Detalle de Salidas", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID Detalle", "ID Salida", "ID Producto", "Cantidad"];

    const filas = detalles.map((d) => [
      d.id_detalle_salida,
      d.id_salida,
      d.id_producto,
      d.cantidad,
    ]);

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

    doc.save("Detalle_Salidas_DGMM.pdf");
  };

  // =======================
  //   CARGAR DATOS
  // =======================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/sp-detalle-salida");
      setDetalles(res.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message || "Error");
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener("dataChanged", h);
    return () => window.removeEventListener("dataChanged", h);
  }, []);

  // =======================
  //  VALIDACIÓN CAMPOS
  // =======================

  const soloEnteros = (v) => /^\d*$/.test(v);

  const handleChange = (field, value) => {
    // Todos los campos son numéricos enteros
    if (!soloEnteros(value)) return;

    setForm({ ...form, [field]: value });
  };

  // =======================
  //  GUARDAR
  // =======================
  const save = async () => {
    if (!form.id_salida.trim()) return alert("Debe ingresar el ID de la salida");
    if (!form.id_producto.trim()) return alert("Debe ingresar el ID del producto");
    if (!form.cantidad.trim()) return alert("Debe ingresar la cantidad");

    const cantidadNum = parseInt(form.cantidad, 10);
    if (isNaN(cantidadNum) || cantidadNum <= 0)
      return alert("La cantidad debe ser mayor que 0");

    setCreating(true);

    try {
      await api.post("/sp-detalle-salida", {
        id_salida: parseInt(form.id_salida, 10),
        id_producto: parseInt(form.id_producto, 10),
        cantidad: cantidadNum,
      });

      window.dispatchEvent(new Event("dataChanged"));
      setForm({ id_salida: "", id_producto: "", cantidad: "" });
    } catch (e) {
      // Aquí te van a llegar mensajes como:
      // "Producto no existe en inventario."
      // "No hay stock suficiente para la salida."
      alert("Error: " + (e.response?.data?.error || e.message));
    }

    setCreating(false);
  };

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Detalle de Salidas</span>

        <div className="topbar-actions">
          <button
            className="btn btn-topbar-outline"
            onClick={() => navigate("/")}
          >
            ← Menú
          </button>

          <button
            className="btn btn-topbar-outline"
            style={{ marginLeft: 8 }}
            onClick={fetchAll}
          >
            ⟳ Refrescar
          </button>

          <button
            className="btn btn-topbar-outline"
            style={{ marginLeft: 8 }}
            onClick={() =>
              setForm({ id_salida: "", id_producto: "", cantidad: "" })
            }
          >
            ＋ Nuevo
          </button>

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading && <div className="loading">Cargando detalle de salidas...</div>}
        {error && <div className="inventario-error">{error}</div>}

        <table className="inventario-table">
          <thead>
            <tr>
              <th># Detalle</th>
              <th>ID Salida</th>
              <th>ID Producto</th>
              <th>Cantidad</th>
            </tr>
          </thead>

          <tbody>
            {detalles.map((d) => (
              <tr key={d.id_detalle_salida}>
                <td>{d.id_detalle_salida}</td>
                <td>{d.id_salida}</td>
                <td>{d.id_producto}</td>
                <td>{d.cantidad}</td>
              </tr>
            ))}

            {detalles.length === 0 && (
              <tr>
                <td colSpan={4} className="no-data">
                  No hay detalle de salidas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FORMULARIO */}
        <div style={{ marginTop: 12 }}>
          <h5>Nuevo Detalle de Salida</h5>

          <input
            className="form-control mb-2"
            placeholder="ID Salida"
            value={form.id_salida}
            onChange={(e) => handleChange("id_salida", e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="ID Producto"
            value={form.id_producto}
            onChange={(e) => handleChange("id_producto", e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Cantidad"
            value={form.cantidad}
            onChange={(e) => handleChange("cantidad", e.target.value)}
          />

          <div>
            <button
              className="btn btn-success me-2"
              onClick={save}
              disabled={creating}
            >
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() =>
                setForm({ id_salida: "", id_producto: "", cantidad: "" })
              }
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
