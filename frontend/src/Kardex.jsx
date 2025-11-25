<<<<<<< HEAD
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';

export default function Kardex(){
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ id_usuario:2, id_producto:'', cantidad:0, tipo_movimiento:'entrada', descripcion:'', fecha_hora: '' });
  const [editing, setEditing] = useState(null);

  const fetchAll = async ()=>{
    setLoading(true);
    try{
      const [r,k,rp,rprov] = await Promise.all([api.get('/kardex'), api.get('/kardex'), api.get('/productos'), api.get('/proveedor')]);
      setItems(r.data || []);
      setProductos(rp.data || []);
      setProveedores(rprov.data || []);
    }catch(e){ console.error(e); }
    setLoading(false);
  };
  useEffect(()=>{ fetchAll(); }, []);
  useEffect(()=>{ const h=()=>fetchAll(); window.addEventListener('dataChanged', h); return ()=>window.removeEventListener('dataChanged', h); }, []);

  const save = async ()=>{
    try{
      if(editing){ await api.put(`/kardex/${editing.id_kardex}`, form); }
      else { await api.post('/kardex', form); }
      window.dispatchEvent(new Event('dataChanged'));
      fetchAll(); setEditing(null); setForm({ id_usuario:2, id_producto:'', cantidad:0, tipo_movimiento:'entrada', descripcion:'', fecha_hora: '' });
    }catch(e){ alert('Error: '+(e.response?.data?.error || e.message)); }
  };

  const remove = async (id)=>{ if(!confirm('Eliminar movimiento?')) return; try{ await api.delete(`/kardex/${id}`); window.dispatchEvent(new Event('dataChanged')); fetchAll(); }catch(e){ alert('Error eliminando'); } };

  const startEdit = (it)=>{ setEditing(it); setForm({ id_usuario: it.id_usuario, id_producto: it.id_producto, cantidad: it.cantidad, tipo_movimiento: it.tipo_movimiento, descripcion: it.descripcion, fecha_hora: it.fecha_hora }); };

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap"><img src={logoDGMM} alt="DGMM"/></div>
      <div className="inventario-topbar" style={{maxWidth:1000}}>
        <span className="topbar-title">Gestión de Kardex</span>
        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={()=>navigate('/')}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{marginLeft:8}}>⟳ Refrescar</button>
          <button className="btn btn-topbar-outline" onClick={()=>{ setEditing(null); setForm({ id_usuario:2, id_producto:'', cantidad:0, tipo_movimiento:'entrada', descripcion:'', fecha_hora: '' }); }} style={{marginLeft:8}}>＋ Nuevo</button>
        </div>
      </div>

      <div className="inventario-card" style={{maxWidth:1000}}>
        {loading ? <div className="loading">Cargando...</div> : (
          <table className='inventario-table'>
            <thead><tr><th>#</th><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Estado</th><th>Descripción</th><th></th></tr></thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id_kardex}>
                  <td>{it.id_kardex}</td>
                  <td>{it.fecha_hora || it.fecha || '-'}</td>
                  <td>{it.id_producto}</td>
                  <td>{it.tipo_movimiento}</td>
                  <td>{it.cantidad}</td>
                  <td>{it.estado}</td>
                  <td>{it.descripcion}</td>
                  <td>
                    <button className='btn btn-sm btn-outline-primary me-2' onClick={()=>startEdit(it)}>Editar</button>
                    <button className='btn btn-sm btn-outline-danger' onClick={()=>remove(it.id_kardex)}>Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{marginTop:12}}>
          <h5 style={{marginBottom:8}}>{editing? 'Editar' : 'Nuevo'} movimiento</h5>
          <div className='mb-2'>
            <select className='form-control' value={form.id_producto} onChange={e=>setForm({...form,id_producto:e.target.value})}>
              <option value=''>-- Producto --</option>
              {productos.map(p=> <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto}</option>)}
            </select>
          </div>
          <div className='d-flex gap-2 mb-2'>
            <input className='form-control' type='number' placeholder='Cantidad' value={form.cantidad} onChange={e=>setForm({...form,cantidad:e.target.value})} />
            <select className='form-control' value={form.tipo_movimiento} onChange={e=>setForm({...form,tipo_movimiento:e.target.value})}>
              <option value='entrada'>entrada</option>
              <option value='salida'>salida</option>
            </select>
          </div>
          <input className='form-control mb-2' placeholder='Descripción' value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} />
          <div>
            <button className='btn btn-success me-2' onClick={save}>Guardar</button>
            <button className='btn btn-secondary' onClick={()=>{ setEditing(null); setForm({ id_usuario:2, id_producto:'', cantidad:0, tipo_movimiento:'entrada', descripcion:'', fecha_hora: '' }); }}>Limpiar</button>
          </div>
        </div>
=======
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
>>>>>>> inventario
      </div>
    </div>
  );
}
<<<<<<< HEAD
=======

>>>>>>> inventario
