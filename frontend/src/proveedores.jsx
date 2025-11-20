import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";


export default function Proveedores(){
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre:'', telefono:'', direccion:''});

  
  const generarPDF = () => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "A4"
  });

  // --- ENCABEZADO ---
  doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(14, 42, 59);
  doc.text("Dirección General de la Marina Mercante", 170, 50);

  doc.setFontSize(14);
  doc.text("Reporte de Proveedores", 170, 72);

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

  // --- COLUMNAS ---
  const columnas = ["ID", "Nombre", "Teléfono", "Dirección"];

  // --- FILAS ---
  const filas = proveedores.map(p => [
    p.id_proveedor,
    p.nombre,
    p.telefono,
    p.direccion
  ]);

  // --- TABLA ---
  autoTable(doc, {
    startY: 125,
    head: [columnas],
    body: filas,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [242, 245, 247] }
  });

  // --- PIE DE PÁGINA ---
  const h = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(
    "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
    doc.internal.pageSize.width / 2,
    h - 30,
    { align: "center" }
  );

  // --- DESCARGA ---
  doc.save("Proveedores_DGMM.pdf");
};


  const fetchAll = async ()=>{
    setLoading(true); setError(null);
    try{
      const res = await api.get('/proveedor');
      setProveedores(res.data || []);
    }catch(e){ setError(e.message || 'Error'); }
    setLoading(false);
  };

  useEffect(()=>{ fetchAll(); }, []);
  useEffect(()=>{ const h=()=>fetchAll(); window.addEventListener('dataChanged', h); return ()=>window.removeEventListener('dataChanged', h); }, []);

  const openNew = ()=>{ setEditing(null); setForm({ nombre:'', telefono:'', direccion:'' }); };

  const save = async ()=>{
    try{
      if(editing){
        await api.put(`/proveedor/${editing.id_proveedor}`, form);
      }else{
        await api.post('/proveedor', form);
      }
      window.dispatchEvent(new Event('dataChanged'));
      fetchAll();
    }catch(e){ alert('Error: '+ (e.response?.data?.mensaje || e.message)); }
  };

  const remove = async (id)=>{
    if(!confirm('Eliminar proveedor?')) return;
    try{ await api.delete(`/proveedor/${id}`); window.dispatchEvent(new Event('dataChanged')); fetchAll(); }
    catch(e){ alert('Error eliminando: '+(e.message)); }
  };

  const startEdit = (p)=>{ setEditing(p); setForm({ nombre:p.nombre, telefono:p.telefono, direccion:p.direccion }); };

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap"><img src={logoDGMM} alt="DGMM"/></div>
      <div className="inventario-topbar" style={{maxWidth:1000}}>
        <span className="topbar-title">Gestión de Proveedores</span>
        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={()=>navigate('/')}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{marginLeft:8}}>⟳ Refrescar</button>
          <button className="btn btn-topbar-outline" onClick={openNew} style={{marginLeft:8}}>＋ Nuevo</button>
          <div className="topbar-actions">
          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
        </div>
        </div>



      <div className="inventario-card" style={{maxWidth:1000}}>
        {loading && <div className="loading">Cargando proveedores...</div>}
        {error && <div className="inventario-error">{String(error)}</div>}

        <table className="inventario-table">
          <thead>
            <tr><th>#</th><th>Nombre</th><th>Teléfono</th><th>Dirección</th><th></th></tr>
          </thead>
          <tbody>
            {proveedores.map(p=> (
              <tr key={p.id_proveedor}>
                <td>{p.id_proveedor}</td>
                <td>{p.nombre}</td>
                <td>{p.telefono}</td>
                <td>{p.direccion}</td>
                <td>
                  <button className='btn btn-sm btn-outline-primary me-2' onClick={()=>startEdit(p)}>Editar</button>
                  <button className='btn btn-sm btn-outline-danger' onClick={()=>remove(p.id_proveedor)}>Eliminar</button>
                </td>
              </tr>
            ))}
            {proveedores.length===0 && <tr><td colSpan={5} className="no-data">No hay proveedores</td></tr>}
          </tbody>
        </table>

        <div style={{marginTop:12}}>
          <h5 style={{marginBottom:8}}>{editing ? 'Editar proveedor' : 'Nuevo proveedor'}</h5>
          <div className='mb-2'>
            <input className='form-control' placeholder='Nombre' value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})} />
          </div>
          <div className='mb-2'>
            <input className='form-control' placeholder='Teléfono' value={form.telefono} onChange={e=>setForm({...form,telefono:e.target.value})} />
          </div>
          <div className='mb-2'>
            <input className='form-control' placeholder='Dirección' value={form.direccion} onChange={e=>setForm({...form,direccion:e.target.value})} />
          </div>
          <div>
            <button className='btn btn-success me-2' onClick={save}>Guardar</button>
            <button className='btn btn-secondary' onClick={()=>{ setEditing(null); setForm({nombre:'',telefono:'',direccion:''}); }}>Limpiar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
