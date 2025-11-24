import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function Compras() {
  const navigate = useNavigate();

  const usuarioData = JSON.parse(localStorage.getItem("usuarioData")) || {};
  const idUsuario = usuarioData.id_usuario;

  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    id_proveedor: "",
    total: "",
  });

  const [creating, setCreating] = useState(false);

  // =======================================
  //     GENERAR PDF
  // =======================================
  const generarPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);
    doc.setFontSize(14);
    doc.text("Reporte de Compras", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Fecha", "Proveedor", "Total", "Usuario"];

    const filas = compras.map((c) => [
      c.id_compra,
      c.fecha,
      c.id_proveedor,
      `L. ${c.total}`,
      c.id_usuario,
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

    doc.save("Compras_DGMM.pdf");
  };

  // =======================================
  //       CARGAR DATOS
  // =======================================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/sp-compras");
      setCompras(res.data || []);
    } catch (e) {
      setError(e.message);
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

  // =======================================
  //        VALIDACIONES
  // =======================================
  const validarNumero = (v) => /^[0-9.]*$/.test(v);

  const handleChange = (field, value) => {
    if (field === "total" && !validarNumero(value)) return;
    if (field === "id_proveedor" && !/^\d*$/.test(value)) return;

    setForm({ ...form, [field]: value });
  };

  // =======================================
  //         CREAR COMPRA
  // =======================================
  const save = async () => {
    if (!form.id_proveedor.trim())
      return alert("Debe ingresar el proveedor");
    if (!form.total.trim())
      return alert("Debe ingresar el total");

    if (!idUsuario)
      return alert("No se encontró el usuario logueado");

    setCreating(true);

    try {
      await api.post("/sp-compras", {
        id_proveedor: form.id_proveedor,
        total: form.total,
        id_usuario: idUsuario,
      });

      window.dispatchEvent(new Event("dataChanged"));
      setForm({ id_proveedor: "", total: "" });
    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }

    setCreating(false);
  };

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1100 }}>
        <span className="topbar-title">Gestión de Compras</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>
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
            onClick={() => setForm({ id_proveedor: "", total: "" })}
          >
            ＋ Nueva
          </button>

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1100 }}>
        {loading && <div className="loading">Cargando compras...</div>}
        {error && <div className="inventario-error">{error}</div>}

        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Fecha</th>
              <th>Proveedor</th>
              <th>Total</th>
              <th>Usuario</th>
            </tr>
          </thead>

          <tbody>
            {compras.map((c) => (
              <tr key={c.id_compra}>
                <td>{c.id_compra}</td>
                <td>{c.fecha}</td>
                <td>{c.id_proveedor}</td>
                <td>L. {c.total}</td>
                <td>{c.id_usuario}</td>
              </tr>
            ))}

            {compras.length === 0 && (
              <tr>
                <td colSpan={5} className="no-data">
                  No hay compras
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FORMULARIO */}
        <div style={{ marginTop: 15 }}>
          <h5>Nueva Compra</h5>

          <input
            className="form-control mb-2"
            placeholder="ID Proveedor"
            value={form.id_proveedor}
            onChange={(e) => handleChange("id_proveedor", e.target.value)}
          />

          <input
            className="form-control mb-2"
            placeholder="Total (ej. 1500.50)"
            value={form.total}
            onChange={(e) => handleChange("total", e.target.value)}
          />

          <div>
            <button
              className="btn btn-success me-2"
              disabled={creating}
              onClick={save}
            >
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setForm({ id_proveedor: "", total: "" })}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
