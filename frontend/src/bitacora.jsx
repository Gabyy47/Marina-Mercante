// src/bitacora.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "./api";
import "./bitacora.css";
import { FaFilePdf } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

export default function Bitacora() {
  const [bitacoras, setBitacoras] = useState([]);
  const [filtros, setFiltros] = useState({ usuario:"", objeto:"", accion:"", fecha:"" });
  const [loading, setLoading] = useState(false);


  //GENERAR REPORTE EN PDF
  const generarPDF = () => {
    const doc = new jsPDF({ orientation:"portrait", unit:"pt", format:"A4" });
    // Encabezado institucional PDF
    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.setTextColor(14,42,59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);
    doc.setFontSize(14); doc.text("Bitácora del Sistema", 170, 72);
    doc.setFontSize(10); doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["Fecha","Usuario","ID Objeto","Acción","Descripción"];
    const filas = bitacoras.map(b => [
      new Date(b.fecha).toLocaleString(), b.usuario, b.id_objeto, b.accion, b.descripcion
    ]);

    autoTable(doc, {
      startY: 125, head:[columnas], body: filas,
      styles:{ fontSize:9, cellPadding:5 }, headStyles:{ fillColor:[14,42,59], textColor:[255,255,255] },
      alternateRowStyles:{ fillColor:[242,245,247] }
    });

    const h = doc.internal.pageSize.height;
    doc.setFontSize(9); doc.setTextColor(100);
    doc.text("Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width/2, h-30, { align:"center" });
    doc.save("Bitacora_DGMM.pdf");
  };

  const cargarBitacora = async () => {
    setLoading(true);
    try { const { data } = await api.get("/bitacoras"); setBitacoras(data); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(() => { cargarBitacora(); }, []);

  const filtrar = r => {
    const { usuario, objeto, accion, fecha } = filtros;
    return (!usuario || r.usuario?.toLowerCase().includes(usuario.toLowerCase())) &&
           (!objeto || String(r.id_objeto).includes(objeto)) &&
           (!accion || r.accion?.toLowerCase().includes(accion.toLowerCase())) &&
           (!fecha || r.fecha?.startsWith(fecha));
  };

  return (
    <div className="bitacora-page">

<div className="bitacora-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>
      <div className="bitacora-topbar">
        <span className="topbar-title">Bitácora del Sistema</span>
        <div className="topbar-actions">
          <Link to="/" className="btn btn-topbar-outline">Volver al Menú Principal</Link>
          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte
          </button>
        </div>
      </div>

      {/* ===== Tarjeta con filtros + tabla ===== */}
      <div className="bitacora-card">

        <div className="bitacora-filtros">
          <input placeholder="Filtrar por usuario"
                 value={filtros.usuario}
                 onChange={e=>setFiltros({...filtros, usuario:e.target.value})}/>
          <input placeholder="Filtrar por ID de objeto"
                 value={filtros.objeto}
                 onChange={e=>setFiltros({...filtros, objeto:e.target.value})}/>
          <input placeholder="Filtrar por acción"
                 value={filtros.accion}
                 onChange={e=>setFiltros({...filtros, accion:e.target.value})}/>
          <input type="date"
                 value={filtros.fecha}
                 onChange={e=>setFiltros({...filtros, fecha:e.target.value})}/>
        </div>

        {loading ? (
          <p className="loading">Cargando registros...</p>
        ) : (
          <table className="bitacora-table">
            <thead>
              <tr>
                <th>Fecha</th><th>Usuario</th><th>ID Objeto</th>
                <th>Acción</th><th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {bitacoras.filter(filtrar).map(b=>(
                <tr key={b.id_bitacora}>
                  <td>{new Date(b.fecha).toLocaleString()}</td>
                  <td>{b.usuario}</td>
                  <td>{b.id_objeto}</td>
                  <td><span className={`action-tag action-${b.accion?.toUpperCase()}`}>{b.accion}</span></td>
                  <td>{b.descripcion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}