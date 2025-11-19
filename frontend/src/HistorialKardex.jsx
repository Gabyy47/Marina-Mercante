import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';

export default function HistorialKardex(){
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = async ()=>{
    setLoading(true); setError(null);
    try{
      const r = await api.get('/historial_kardex');
      setItems(r.data || []);
    }catch(e){ setError(e.response?.data || e.message); }
    setLoading(false);
  };

  // Helper: when the server returns the generic 404 JSON {mensaje: 'Ruta no encontrada'}
  // treat it as empty data so the UI doesn't display that raw JSON to the user.
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
        <span className="topbar-title">Historial Kardex</span>
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

        {loading ? (<div className="loading">Cargando historial...</div>) : (
          <table className="inventario-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Fecha</th>
                <th>Usuario</th>
                <th>Producto</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Estado</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {items.map(it=> (
                <tr key={it.id_historial_kardex || it.id_kardex || it.id}>
                  <td>{it.id_historial_kardex ?? it.id_kardex ?? it.id}</td>
                  <td>{it.fecha_hora || it.fecha || '-'}</td>
                  <td>{it.nombre_usuario ?? it.id_usuario}</td>
                  <td>{it.nombre_producto ?? it.id_producto}</td>
                  <td>{it.tipo_movimiento}</td>
                  <td>{it.cantidad}</td>
                  <td>{it.estado}</td>
                  <td>{it.descripcion}</td>
                </tr>
              ))}
              {items.length===0 && <tr><td colSpan={8} className="no-data">No hay registros</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
