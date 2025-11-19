import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';

export default function Proveedores(){
  const navigate = useNavigate();
  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nombre:'', telefono:'', direccion:''});

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
