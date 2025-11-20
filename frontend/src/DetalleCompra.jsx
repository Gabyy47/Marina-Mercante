import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa"; // si quieres el icono en el botón


export default function DetalleCompra(){
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generarPDF = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "A4"
  });

  // --- Encabezado institucional ---
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

  // --- Tabla ---
  const columnas = [
    "ID",
    "Proveedor",
    "Monto",
    "Fecha"
  ];

  const filas = items.map(it => [
    it.id_detalle_compra ?? it.id,
    it.nombre_proveedor ?? it.proveedor ?? it.nombre ?? "-",
    it.monto_total ?? it.monto ?? "",
    it.fecha_hora_compra ?? it.fecha ?? "-"
  ]);

  autoTable(doc, {
    startY: 125,
    head: [columnas],
    body: filas,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [242, 245, 247] }
  });

  // --- Pie de página ---
  const h = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
    doc.internal.pageSize.width / 2,
    h - 30,
    { align: "center" }
  );

  // --- Descargar PDF ---
  doc.save("DetalleCompra_DGMM.pdf");
};

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

          <button className="btn btn-topbar-primary" onClick={generarPDF}>
          <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
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
