import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
<<<<<<< HEAD

export default function DetalleCompra(){
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async ()=>{
    setLoading(true); setError(null);
    try{
      const r = await api.get('/detalle_compra');
      setItems(r.data || []);
    }catch(e){ setError(e.response?.data || e.message); }
    setLoading(false);
  };

  const displayError = (err) => {
    if (!err) return null;
    if (typeof err === 'object' && err.mensaje === 'Ruta no encontrada') return null;
    return err;
  };

  useEffect(()=>{ fetchAll(); }, []);
  // refrescar cuando otros módulos emitan cambios
  useEffect(()=>{
    const h = ()=>fetchAll();
    window.addEventListener('dataChanged', h);
    return ()=> window.removeEventListener('dataChanged', h);
  }, []);

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap"><img src={logoDGMM} alt="DGMM"/></div>
      <div className="inventario-topbar" style={{maxWidth:1000}}>
        <span className="topbar-title">Detalle de Compra</span>
        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={()=>navigate('/')}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{marginLeft:8}}>⟳ Refrescar</button>
        </div>
      </div>

      <div className="inventario-card" style={{maxWidth:1000}}>
        {displayError(error) && (
          <div className="inventario-error" style={{marginBottom:12}}>
            <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(error,null,2)}</pre>
          </div>
        )}

        {loading ? (<div className="loading">Cargando detalle de compra...</div>) : (
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Proveedor</th>
                <th>Monto</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id_detalle_compra || it.id}>
                  <td>{it.id_detalle_compra ?? it.id}</td>
                  <td>{it.nombre_proveedor ?? it.proveedor ?? it.nombre ?? '-'}</td>
                  <td>{it.monto_total ?? it.monto ?? ''}</td>
                  <td>{(it.fecha_hora_compra ?? it.fecha) || '-'}</td>
                  <td></td>
                </tr>
              ))}
              {items.length===0 && <tr><td colSpan={5} className="no-data">No hay registros</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
=======
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function DetalleCompra() {
  const navigate = useNavigate();

  const usuarioData = JSON.parse(localStorage.getItem("usuarioData")) || {};
  const idUsuario = usuarioData.id_usuario;

  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [form, setForm] = useState({
    id_compra: "",
    id_producto: "",
    cantidad: "",
    precio: ""
  });

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
    doc.text("Reporte de Detalle de Compra", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = [
      "ID Detalle",
      "ID Compra",
      "Producto",
      "Cantidad",
      "Precio"
    ];

    const filas = detalles.map((d) => [
      d.id_detalle_compra,
      d.id_compra,
      d.producto,
      d.cantidad,
      d.precio_compra
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] }
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

    doc.save("DetalleCompra_DGMM.pdf");
  };

  // =======================
  //   CARGAR DETALLES
  // =======================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/compra/detalle");
      setDetalles(res.data || []);
    } catch (e) {
      setError(e.message || "Error al cargar datos");
    }

    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener("dataChanged", h);
    return () => window.removeEventListener("dataChanged", h);
  }, []);

  // =======================
  //  VALIDACIONES
  // =======================
  const soloNumeros = (v) => /^\d*$/.test(v);
  const soloDecimal = (v) => /^\d*\.?\d*$/.test(v);

  const handleChange = (field, value) => {
    if (field === "cantidad" && !soloNumeros(value)) return;
    if (field === "precio" && !soloDecimal(value)) return;

    setForm({ ...form, [field]: value });
  };

  // =======================
  //  GUARDAR DETALLE
  // =======================
  const save = async () => {
    if (!form.id_compra || !form.id_producto || !form.cantidad || !form.precio)
      return alert("Todos los campos son obligatorios");

    try {
      await api.post("/compra/detalle", {
        id_compra: form.id_compra,
        id_producto: form.id_producto,
        cantidad: form.cantidad,
        precio: form.precio
      });

      window.dispatchEvent(new Event("dataChanged"));
      setForm({ id_compra: "", id_producto: "", cantidad: "", precio: "" });
    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }
  };

  // ============================
  //  REGISTRAR ENTRADA
  // ============================
  const registrarEntrada = async (id_compra) => {
    if (!confirm("¿Registrar entrada al inventario para esta compra?")) return;

    try {
      const res = await api.post(`/sp-registrar-entrada/${id_compra}`, {
        id_usuario: idUsuario
      });

      alert(res.data.mensaje || "Entrada registrada correctamente");
    } catch (e) {
      alert("Error registrando entrada: " + (e.response?.data?.error || e.message));
    }
  };

  return (
    <div className="inventario-page">

      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Detalle de Compra</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate("/")}>
            ← Menú
          </button>

          <button
            className="btn btn-topbar-outline"
            onClick={fetchAll}
            style={{ marginLeft: 8 }}
          >
            ⟳ Refrescar
          </button>

          <button
            className="btn btn-topbar-outline"
            onClick={() => setForm({ id_compra: "", id_producto: "", cantidad: "", precio: "" })}
            style={{ marginLeft: 8 }}
          >
            ＋ Nuevo
          </button>

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading && <div className="loading">Cargando...</div>}
        {error && <div className="inventario-error">{error}</div>}

        <table className="inventario-table">
          <thead>
            <tr>
              <th>#</th>
              <th>ID Compra</th>
              <th>Producto</th>
              <th>Cantidad</th>
              <th>Precio</th>
              <th>Entrada</th>
            </tr>
          </thead>

          <tbody>
            {detalles.map((d) => (
              <tr key={d.id_detalle_compra}>
                <td>{d.id_detalle_compra}</td>
                <td>{d.id_compra}</td>
                <td>{d.producto}</td>
                <td>{d.cantidad}</td>
                <td>L. {d.precio_compra}</td>

                <td>
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => registrarEntrada(d.id_compra)}
                  >
                    Registrar Entrada
                  </button>
                </td>
              </tr>
            ))}

            {detalles.length === 0 && (
              <tr>
                <td colSpan={6} className="no-data">
                  No hay detalles registrados
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* FORMULARIO */}
        <div style={{ marginTop: 12 }}>
          <h5>Nuevo detalle de compra</h5>

          <input
            className="form-control mb-2"
            placeholder="ID Compra"
            value={form.id_compra}
            onChange={(e) => handleChange("id_compra", e.target.value)}
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

          <input
            className="form-control mb-2"
            placeholder="Precio"
            value={form.precio}
            onChange={(e) => handleChange("precio", e.target.value)}
          />

          <div>
            <button className="btn btn-success me-2" onClick={save}>
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() => setForm({ id_compra: "", id_producto: "", cantidad: "", precio: "" })}
            >
              Limpiar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
>>>>>>> inventario
