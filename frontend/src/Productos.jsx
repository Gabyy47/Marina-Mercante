import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './inventario.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';

export default function Productos() {

  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    nombre_producto: '',
    cantidad_minima: 0,
    cantidad_maxima: 0,
    descripcion: ''
  });

  const [editing, setEditing] = useState(null);

  // === Obtener lista usando SP_MostrarProductos ===
  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await api.get('/productos'); 
      setItems(r.data || []);
    } catch (e) {
      console.error("Error obteniendo productos:", e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    const h = () => fetchAll();
    window.addEventListener('dataChanged', h);
    return () => window.removeEventListener('dataChanged', h);
  }, []);

  // === Guardar (nuevo o edición) ===
  const save = async () => {
    try {
      if (editing) {
        await api.put(`/productos/${editing.id_producto}`, form);
      } else {
        await api.post('/productos', form);
      }

      window.dispatchEvent(new Event('dataChanged'));
      fetchAll();

      // Limpiar
      setEditing(null);
      setForm({
        nombre_producto: '',
        cantidad_minima: 0,
        cantidad_maxima: 0,
        descripcion: ''
      });

    } catch (e) {
      alert("Error: " + (e.response?.data?.error || e.message));
    }
  };

  // === Eliminar usando SP_EliminarProducto ===
  const remove = async (id) => {
    if (!confirm("¿Eliminar producto?")) return;

    try {
      await api.delete(`/productos/${id}`);
      window.dispatchEvent(new Event('dataChanged'));
      fetchAll();
    } catch (e) {
      alert("Error eliminando producto");
      console.error(e);
    }
  };

  const startEdit = (p) => {
    setEditing(p);
    setForm({
      nombre_producto: p.nombre_producto,
      cantidad_minima: p.cantidad_minima,
      cantidad_maxima: p.cantidad_maxima,
      descripcion: p.descripcion
    });
  };

  return (
    <div className="inventario-page">
      
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Productos</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={() => navigate('/')}>
            ← Menú
          </button>

          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{ marginLeft: 8 }}>
            ⟳ Refrescar
          </button>

          <button
            className="btn btn-topbar-outline"
            onClick={() => {
              setEditing(null);
              setForm({ nombre_producto: '', cantidad_minima: 0, cantidad_maxima: 0, descripcion: '' });
            }}
            style={{ marginLeft: 8 }}
          >
            ＋ Nuevo
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading ? (
          <div className="loading">Cargando...</div>
        ) : (
          <table className="inventario-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre</th>
                <th>Min</th>
                <th>Max</th>
                <th>Descripción</th>
                <th></th>
              </tr>
            </thead>

            <tbody>
              {items.map((it) => (
                <tr key={it.id_producto}>
                  <td>{it.id_producto}</td>
                  <td>{it.nombre_producto}</td>
                  <td>{it.cantidad_minima}</td>
                  <td>{it.cantidad_maxima}</td>
                  <td>{it.descripcion}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(it)}>
                      Editar
                    </button>

                    <button className="btn btn-sm btn-outline-danger" onClick={() => remove(it.id_producto)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 12 }}>
          <h5 style={{ marginBottom: 8 }}>{editing ? "Editar" : "Nuevo"} producto</h5>

          <input
            className="form-control mb-2"
            placeholder="Nombre"
            value={form.nombre_producto}
            onChange={(e) => setForm({ ...form, nombre_producto: e.target.value })}
          />

          <div className="d-flex gap-2 mb-2">
            <input
              className="form-control"
              type="number"
              placeholder="Cantidad mínima"
              value={form.cantidad_minima}
              onChange={(e) => setForm({ ...form, cantidad_minima: e.target.value })}
            />

            <input
              className="form-control"
              type="number"
              placeholder="Cantidad máxima"
              value={form.cantidad_maxima}
              onChange={(e) => setForm({ ...form, cantidad_maxima: e.target.value })}
            />
          </div>

          <textarea
            className="form-control mb-2"
            placeholder="Descripción"
            value={form.descripcion}
            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
          />

          <div>
            <button className="btn btn-success me-2" onClick={save}>
              Guardar
            </button>

            <button
              className="btn btn-secondary"
              onClick={() =>
                setForm({
                  nombre_producto: '',
                  cantidad_minima: 0,
                  cantidad_maxima: 0,
                  descripcion: ''
                })
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
