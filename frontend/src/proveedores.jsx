import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from './api';
import './proveedores.css';
import logoDGMM from './imagenes/DGMM-Gobierno.png';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { FaFilePdf } from "react-icons/fa";

export default function Proveedores() {
  const navigate = useNavigate();

  const [proveedores, setProveedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    nombre: "",
    telefono: "",
    direccion: "",
  });

  // Modal de nuevo proveedor
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [proveedoresNuevos, setProveedoresNuevos] = useState([]);

  // Modal de edición
  const [showModalEditar, setShowModalEditar] = useState(false);

  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    direccion: ""
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
    doc.text("Reporte de Proveedores", 170, 72); 

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Nombre", "Teléfono", "Dirección"];

    const filas = proveedores.map((p) => [
      p.id_proveedor,
      p.nombre,
      p.telefono,
      p.direccion
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

    doc.save("Proveedores_DGMM.pdf");
  };

  const handleVolver = () => {
    const rawUser = localStorage.getItem("mm_user");
    const user = rawUser ? JSON.parse(rawUser) : null;
    const rol = (user?.rol_nombre || "").toLowerCase();

    if (
      (rol.includes("guarda") && rol.includes("almacen")) ||
      (rol.includes("auxiliar") &&
        rol.includes("de") &&
        rol.includes("almacen"))
    ) {
      navigate("/guarda/dashboard");
    } else if (rol.includes("admin")) {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };  

  // =======================
  //   CARGAR DATOS
  // =======================
  const fetchAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/proveedor");
      setProveedores(res.data || []);
    } catch (e) {
      setError(e.message || "Error");
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
  //  FILTRADO
  // =======================
  const aplicarFiltro = (proveedor) => {
    const { nombre, telefono, direccion } = filtros;

    return (
      (!nombre ||
        proveedor.nombre?.toLowerCase().includes(nombre.toLowerCase())) &&
      (!telefono || 
        proveedor.telefono?.includes(telefono)) &&
      (!direccion ||
        proveedor.direccion?.toLowerCase().includes(direccion.toLowerCase()))
    );
  };

  const proveedoresFiltrados = proveedores.filter(aplicarFiltro);

  // =======================
  //  VALIDACIÓN CAMPOS
  // =======================

  // Solo números y 8 dígitos
  const handleTelefonoChange = (e) => {
    const value = e.target.value;

    if (!/^\d*$/.test(value)) return;
    if (value.length > 8) return;

    setForm({ ...form, telefono: value });
  };

  // Nombre y dirección permiten acentos, comas, puntos, números, letras…
  const validarTexto = (texto) => /^[A-Za-z0-9áéíóúÁÉÍÓÚñÑ.,\-\s#()/:°]*$/.test(texto);

  const handleChangeText = (field, value) => {
    // Limitar longitud máxima
    if (field === "nombre" && value.length > 50) return;
    if (field === "direccion" && value.length > 100) return;
    
    if (!validarTexto(value)) return;
    setForm({ ...form, [field]: value });
  };

  // =======================
  //  GUARDAR
  // =======================
  const save = async () => {
    // Validaciones del nombre
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    if (form.nombre.length < 10) return alert("El nombre debe tener al menos 10 caracteres");
    if (form.nombre.length > 50) return alert("El nombre no puede exceder los 50 caracteres");
    
    // Validación del teléfono
    if (form.telefono.length !== 8) return alert("El teléfono debe tener 8 dígitos");

    try {
      if (editing) {
        await api.put(`/proveedor/${editing.id_proveedor}`, form);
      } else {
        await api.post("/proveedor", form);
      }

      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();

      setEditing(null);
      setForm({ nombre: "", telefono: "", direccion: "" });
      setShowModalEditar(false);

    } catch (e) {
      alert("Error: " + (e.response?.data?.mensaje || e.message));
    }
  };

  // =======================
  //  MODAL NUEVO PROVEEDOR
  // =======================
  const abrirModalNuevo = () => {
    setShowModalNuevo(true);
    setProveedoresNuevos([]);
    setForm({ nombre: "", telefono: "", direccion: "" });
  };

  const cerrarModalNuevo = () => {
    setShowModalNuevo(false);
    setProveedoresNuevos([]);
    setForm({ nombre: "", telefono: "", direccion: "" });
  };

  const agregarProveedorALista = () => {
    // Validaciones del nombre
    if (!form.nombre.trim()) return alert("El nombre es obligatorio");
    if (form.nombre.length < 10) return alert("El nombre debe tener al menos 10 caracteres");
    if (form.nombre.length > 50) return alert("El nombre no puede exceder los 50 caracteres");
    
    // Validación del teléfono
    if (form.telefono.length !== 8) return alert("El teléfono debe tener 8 dígitos");

    const nuevoProveedor = {
      nombre: form.nombre.trim(),
      telefono: form.telefono,
      direccion: form.direccion.trim()
    };

    setProveedoresNuevos([...proveedoresNuevos, nuevoProveedor]);
    setForm({ nombre: "", telefono: "", direccion: "" });
  };

  const eliminarProveedorDeLista = (index) => {
    const nuevos = proveedoresNuevos.filter((_, i) => i !== index);
    setProveedoresNuevos(nuevos);
  };

  const guardarTodosLosProveedores = async () => {
    if (proveedoresNuevos.length === 0) {
      return alert("Agregue al menos un proveedor");
    }

    try {
      setLoading(true);

      for (const proveedor of proveedoresNuevos) {
        await api.post("/proveedor", proveedor);
      }

      alert("Proveedores registrados correctamente");
      cerrarModalNuevo();
      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();

    } catch (e) {
      console.error("Error al guardar proveedores:", e);
      alert("Error al guardar los proveedores: " + (e.response?.data?.mensaje || e.message));
    } finally {
      setLoading(false);
    }
  };

  // =======================
  //  ELIMINAR
  // =======================
  const remove = async (id) => {
    if (!confirm("Eliminar proveedor?")) return;

    try {
      await api.delete(`/proveedor/${id}`);
      window.dispatchEvent(new Event("dataChanged"));
      fetchAll();
    } catch (e) {
      alert("Error eliminando: " + e.message);
    }
  };

  // =======================
  //  EDITAR
  // =======================
  const startEdit = (p) => {
    setEditing(p);
    setForm({
      nombre: p.nombre,
      telefono: p.telefono,
      direccion: p.direccion
    });
    setShowModalEditar(true);
  };

  const cerrarModalEditar = () => {
    setShowModalEditar(false);
    setEditing(null);
    setForm({ nombre: "", telefono: "", direccion: "" });
  };

  // Función para determinar el color del contador
  const getContadorColor = (longitud, min = 10, max = 50) => {
    if (longitud === 0) return "#6b7280";
    if (longitud < min) return "#dc2626"; // rojo - no cumple mínimo
    if (longitud > max - 5) return "#e67e22"; // naranja - cerca del límite
    return "#10b981"; // verde - válido
  };

  return (
    <div className="inventario-page">

      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar" style={{ maxWidth: 1000 }}>
        <span className="topbar-title">Gestión de Proveedores</span>

        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={abrirModalNuevo}>
            ＋ Nuevo
          </button>
           <button className="mant-prod-btn mant-prod-btn-topbar-outline" onClick={handleVolver} style={{ marginLeft: 8 }}>
            ← Volver al Menú Principal
          </button>
          <button className="btn btn-topbar-outline" onClick={fetchAll} style={{ marginLeft: 8 }}>
            ⟳ Refrescar
          </button>
          <button className="btn btn-topbar-primary" onClick={generarPDF}>
            <FaFilePdf size={16} /> Generar Reporte PDF
          </button>
        </div>
      </div>

      <div className="inventario-card" style={{ maxWidth: 1000 }}>
        {loading && <div className="loading">Cargando proveedores...</div>}
        {error && <div className="inventario-error">{error}</div>}

        {/* FILTROS */}
        <div className="inventario-filtros">
          <input
            placeholder="Filtrar por nombre"
            value={filtros.nombre}
            onChange={(e) => setFiltros({ ...filtros, nombre: e.target.value })}
          />

          <input
            placeholder="Filtrar por teléfono"
            value={filtros.telefono}
            onChange={(e) => setFiltros({ ...filtros, telefono: e.target.value })}
          />

          <input
            placeholder="Filtrar por dirección"
            value={filtros.direccion}
            onChange={(e) => setFiltros({ ...filtros, direccion: e.target.value })}
          />
        </div>

        <table className="inventario-table">
          <thead>
              <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th>Dirección</th>
              <th>Acciones</th>
              </tr>
          </thead>

          <tbody>
            {proveedoresFiltrados.map((p) => (
              <tr key={p.id_proveedor}>
                <td>{p.id_proveedor}</td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.nombre}>
                  {p.nombre.length > 40 ? p.nombre.substring(0, 40) + "..." : p.nombre}
                </td>
                <td>{p.telefono}</td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.direccion}>
                  {p.direccion && p.direccion.length > 40 ? p.direccion.substring(0, 40) + "..." : p.direccion}
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-primary me-2" onClick={() => startEdit(p)}>
                    Editar
                  </button>

                  <button className="btn btn-sm btn-outline-danger" onClick={() => remove(p.id_proveedor)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}

            {proveedoresFiltrados.length === 0 && (
              <tr>
                <td colSpan={5} className="no-data">
                  No hay proveedores
                </td>
              </tr>
            )}
          </tbody>
        </table>

      </div>

      {/* MODAL EDITAR PROVEEDOR */}
      {showModalEditar && (
        <div className="inv-modal-overlay" onClick={cerrarModalEditar}>
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 500 }}
          >
            <div className="inv-modal-header">
              <h3>Editar Proveedor</h3>
              <button className="inv-modal-close" onClick={cerrarModalEditar}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              <div style={{ display: "grid", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>
                    Nombre <span style={{ fontSize: "11px", fontWeight: "normal", color: "#6b7280" }}>(mín. 10, máx. 50 caracteres)</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="Nombre del proveedor (mínimo 10 caracteres)"
                    value={form.nombre}
                    onChange={(e) => handleChangeText("nombre", e.target.value)}
                    maxLength={50}
                    style={{ 
                      width: "100%", 
                      padding: "10px", 
                      borderRadius: "6px", 
                      border: form.nombre.length > 0 && form.nombre.length < 10 ? "2px solid #dc2626" : "1px solid #d7dee3"
                    }}
                  />
                  <small style={{ 
                    display: "block",
                    marginTop: "4px",
                    color: getContadorColor(form.nombre.length, 10, 50), 
                    fontSize: "11px",
                    fontWeight: form.nombre.length > 0 && form.nombre.length < 10 ? "bold" : "normal"
                  }}>
                    {form.nombre.length}/50 caracteres
                    {form.nombre.length > 0 && form.nombre.length < 10 && " ❌ (mínimo 10 requerido)"}
                    {form.nombre.length >= 10 && form.nombre.length <= 50 && " ✅"}
                  </small>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Teléfono</label>
                  <input
                    className="form-control"
                    placeholder="8 dígitos"
                    value={form.telefono}
                    onChange={handleTelefonoChange}
                    maxLength={8}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3" }}
                  />
                  <small style={{ color: form.telefono.length === 8 ? "#10b981" : form.telefono.length > 0 ? "#dc2626" : "#6b7280", fontSize: "11px" }}>
                    {form.telefono.length}/8 dígitos {form.telefono.length === 8 ? "✅" : form.telefono.length > 0 ? "❌" : ""}
                  </small>
                </div>

                <div>
                  <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem", fontWeight: 600 }}>Dirección</label>
                  <input
                    className="form-control"
                    placeholder="Dirección"
                    value={form.direccion}
                    onChange={(e) => handleChangeText("direccion", e.target.value)}
                    maxLength={100}
                    style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d7dee3" }}
                  />
                  <small style={{ color: form.direccion.length > 95 ? "#e67e22" : "#6b7280", fontSize: "11px" }}>
                    {form.direccion.length}/100 caracteres
                  </small>
                </div>
              </div>
            </div>

            <div className="inv-modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalEditar}>
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={save}
                disabled={loading || (form.nombre.length > 0 && form.nombre.length < 10)}
              >
                {loading ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL NUEVO PROVEEDOR */}
      {showModalNuevo && (
        <div className="inv-modal-overlay" onClick={cerrarModalNuevo}>
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 900 }}
          >
            <div className="inv-modal-header">
              <h3>Nuevo Proveedor</h3>
              <button className="inv-modal-close" onClick={cerrarModalNuevo}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              {/* Formulario para agregar proveedor */}
              <div style={{ marginBottom: 20, padding: 15, background: "#f5f5f5", borderRadius: 8 }}>
                <h4 style={{ marginBottom: 12 }}>Agregar Proveedor</h4>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 2fr auto", gap: 10, alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>
                      Nombre <span style={{ fontSize: "10px", color: "#666" }}>(mín. 10, máx. 50)</span>
                    </label>
                    <input
                      className="form-control"
                      placeholder="Nombre del proveedor"
                      value={form.nombre}
                      onChange={(e) => handleChangeText("nombre", e.target.value)}
                      maxLength={50}
                      style={{ 
                        width: "100%", 
                        padding: "8px", 
                        borderRadius: "6px",
                        border: form.nombre.length > 0 && form.nombre.length < 10 ? "2px solid #dc2626" : "1px solid #d9d9d9"
                      }}
                    />
                    <small style={{ 
                      display: "block",
                      marginTop: "2px",
                      color: getContadorColor(form.nombre.length, 10, 50), 
                      fontSize: "10px"
                    }}>
                      {form.nombre.length}/50
                      {form.nombre.length > 0 && form.nombre.length < 10 && " ❌ mínimo 10"}
                      {form.nombre.length >= 10 && " ✅"}
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>Teléfono (8 dígitos)</label>
                    <input
                      className="form-control"
                      placeholder="8 dígitos"
                      value={form.telefono}
                      onChange={handleTelefonoChange}
                      maxLength={8}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                    />
                    <small style={{ color: form.telefono.length === 8 ? "#10b981" : "#6b7280", fontSize: "10px" }}>
                      {form.telefono.length}/8
                    </small>
                  </div>

                  <div>
                    <label style={{ display: "block", marginBottom: 5, fontSize: "0.9rem" }}>Dirección</label>
                    <input
                      className="form-control"
                      placeholder="Dirección"
                      value={form.direccion}
                      onChange={(e) => handleChangeText("direccion", e.target.value)}
                      maxLength={100}
                      style={{ width: "100%", padding: "8px", borderRadius: "6px" }}
                    />
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={agregarProveedorALista}
                    disabled={form.nombre.length > 0 && form.nombre.length < 10}
                    style={{ 
                      padding: "8px 16px", 
                      height: "38px",
                      opacity: form.nombre.length > 0 && form.nombre.length < 10 ? 0.5 : 1,
                      cursor: form.nombre.length > 0 && form.nombre.length < 10 ? "not-allowed" : "pointer"
                    }}
                  >
                    ＋ Agregar
                  </button>
                </div>
              </div>

              {/* Tabla de proveedores agregados */}
              {proveedoresNuevos.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 10 }}>Proveedores Agregados</h4>
                  <table className="inventario-table">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Teléfono</th>
                        <th>Dirección</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {proveedoresNuevos.map((prov, idx) => (
                        <tr key={idx}>
                          <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={prov.nombre}>
                            {prov.nombre.length > 40 ? prov.nombre.substring(0, 40) + "..." : prov.nombre}
                          </td>
                          <td>{prov.telefono}</td>
                          <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={prov.direccion}>
                            {prov.direccion && prov.direccion.length > 40 ? prov.direccion.substring(0, 40) + "..." : prov.direccion}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => eliminarProveedorDeLista(idx)}
                              style={{ padding: "4px 8px" }}
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="inv-modal-footer">
              <button className="btn btn-secondary" onClick={cerrarModalNuevo}>
                Cancelar
              </button>
              <button
                className="btn btn-success"
                onClick={guardarTodosLosProveedores}
                disabled={loading || proveedoresNuevos.length === 0}
              >
                {loading ? "Guardando..." : "Guardar Proveedores"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
