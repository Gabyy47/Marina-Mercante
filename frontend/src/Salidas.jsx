import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function Salidas() {
  const navigate = useNavigate();

  const usuarioData = JSON.parse(localStorage.getItem("usuarioData")) || {};
  const idUsuario = usuarioData.id_usuario;

  const [salidas, setSalidas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    motivo: "",
  });

  const [creating, setCreating] = useState(false);

  // =====================================================
  //                 GENERAR PDF
  // =====================================================
  const generarPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Salidas", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Usuario", "Fecha", "Motivo"];

    const filas = salidas.map((s) => [
      s.id_salida,
      s.id_usuario,
      s.fecha,
      s.motivo,
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

    doc.save("Salidas_DGMM.pdf");
  };

  // =====================================================
  //                CARGA DE DATOS
  // =====================================================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/sp-salidas");
      setSalidas(res.data || []);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
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

  // =====================================================
  //                VALIDACIÓN FORMULARIO
  // =====================================================
  const validarTexto = (txt) =>
    /^[A-Za-z0-9áéíóúÁÉÍÓÚñÑ.,\-\s#()/:°]*$/.test(txt);

  const handleChange = (value) => {
    if (!validarTexto(value)) return;
    setForm({ motivo: value });
  };

  // =====================================================
  //                CREAR SALIDA
  // =====================================================
  const save = async () => {
    if (!form.motivo.trim())
      return alert("Debe ingresar el motivo de la salida");

    if (!idUsuario)
      return alert("No se encontró el usuario logueado");

    setCreating(true);

    try {
      await api.post("/sp-salidas", {
        id_usuario: idUsuario,
        motivo: form.motivo,
      });

      window.dispatchEvent(new Event("dataChanged"));
      setForm({ motivo: "" });
    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }

    setCreating(false);
  };

  // =====================================================
  //                     INTERFAZ
  // =====================================================
  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Salidas</span>

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
            onClick={() => setForm({ motivo: "" })}
          >
            ＋ Nueva
          </button>

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading && <div className="loading">Cargando salidas...</div>}
        {error && <div className="inventario-error">{error}</div>}

        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Usuario</th>
              <th>Fecha</th>
              <th>Motivo</th>
            </tr>
          </thead>

          <tbody>
            {salidas.map((s) => (
              <tr key={s.id_salida}>
                <td>{s.id_salida}</td>
                <td>{s.id_usuario}</td>
                <td>{s.fecha}</td>
                <td>{s.motivo}</td>
              </tr>
            ))}

            {salidas.length === 0 && (
              <tr>
                <td colSpan={4} className="no-data">
                  No hay salidas registradas
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FORMULARIO */}
        <div style={{ marginTop: 12 }}>
          <h5>Nueva Salida</h5>

          <textarea
            className="form-control mb-2"
            placeholder="Motivo de la salida"
            value={form.motivo}
            onChange={(e) => handleChange(e.target.value)}
            rows="3"
          />

          <div>
            <button className="btn btn-success me-2" onClick={save} disabled={creating}>
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setForm({ motivo: "" })}
            >
              Limpiar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
