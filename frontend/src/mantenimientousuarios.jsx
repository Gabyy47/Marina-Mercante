import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimiento.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaFilePdf } from "react-icons/fa";

Modal.setAppElement("#root");

export default function MantenimientoUsuarios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Lista de roles (para el select)
  const [roles, setRoles] = useState([]);

  const [newId_rol, setNewId_rol] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newCorreo, setNewCorreo] = useState("");
  const [newNombre_usuario, setNewNombre_usuario] = useState("");
  const [newContraseña, setNewContraseña] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  // Mapa id_rol -> texto del rol (por si lo necesitas en otros lados)
  const rolesMap = useMemo(() => {
    const map = {};
    roles.forEach((r) => {
      const id = r.id_rol;
      const nombre =
        r.rol_nombre ||
        r.nombre_rol ||
        r.rol ||
        r.descripcion ||
        r.nombre ||
        "";
      if (id != null && nombre) {
        map[id] = nombre;
      }
    });
    return map;
  }, [roles]);

  const generarPDFUsuarios = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Usuarios", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["ID", "Nombre", "Usuario", "Correo", "Rol", "Estado"];

    const filas = items.map((u) => [
      u.id_usuario,
      u.nombre,
      u.nombre_usuario,
      u.correo,
      rolesMap[u.id_rol] || u.rol_nombre || u.nombreRol || "",
      u.estado || "",
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 10, cellPadding: 5 },
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

    doc.save("Usuarios_DGMM.pdf");
  };

  const limpiarCampos = () => {
    setNewId_rol("");
    setNewNombre("");
    setNewApellido("");
    setNewCorreo("");
    setNewNombre_usuario("");
    setNewContraseña("");
  };

  const openModal = () => {
    limpiarCampos();
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    limpiarCampos();
  };

  const openEditModal = (item) => {
    setEditItemId(item.id_usuario);
    const rol = item.id_rol ?? "";
    setNewId_rol(String(rol));
    setNewNombre(item.nombre ?? "");
    setNewApellido(item.apellido ?? "");
    setNewCorreo(item.correo ?? "");
    setNewNombre_usuario(item.nombre_usuario ?? "");
    setNewContraseña(item.contraseña ?? "");
    setIsEditModalOpen(true);
  };
  const closeEditModal = () => {
    setIsEditModalOpen(false);
  };

  const camposCompletos = useMemo(
    () =>
      newId_rol.trim() &&
      newNombre.trim() &&
      newApellido.trim() &&
      newCorreo.trim() &&
      newNombre_usuario.trim() &&
      newContraseña.trim(),
    [
      newId_rol,
      newNombre,
      newApellido,
      newCorreo,
      newNombre_usuario,
      newContraseña,
    ]
  );

  const toPayload = () => {
    const idrolNum = Number(newId_rol);
    return {
      id_rol: idrolNum,
      nombre: newNombre.trim(),
      apellido: newApellido.trim(),
      correo: newCorreo.trim(),
      nombre_usuario: newNombre_usuario.trim(),
      contraseña: newContraseña,
    };
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/usuario");
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET /usuario error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get("/roles");
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET /rol error:", error.response?.data || error);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchRoles();
  }, []);

  const handleCreate = async () => {
    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    const payload = toPayload();
    if (!Number.isFinite(payload.id_rol)) {
      toast.error("El campo 'Rol' (id_rol) debe ser numérico");
      return;
    }

    try {
      await api.post("/usuario", payload);
      toast.success("¡Usuario creado con éxito!");
      await fetchItems();
      closeModal();
    } catch (error) {
      console.error("POST /usuario error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al guardar datos");
    }
  };

  const handleUpdate = async () => {
    if (!editItemId) return;
    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const payload = toPayload();
    if (!Number.isFinite(payload.id_rol)) {
      toast.error("El campo 'Rol' (id_rol) debe ser numérico");
      return;
    }

    try {
      await api.put(`/usuario/${editItemId}`, payload);
      toast.success("¡Usuario actualizado con éxito!");
    } catch (err1) {
      if (err1?.response?.status === 404) {
        try {
          await api.put("/usuario", { id_usuario: editItemId, ...payload });
          toast.success("¡Usuario actualizado con éxito!");
        } catch (err2) {
          console.error("PUT /usuario error:", err2.response?.data || err2);
          toast.error(
            err2.response?.data?.mensaje || "Error al actualizar el usuario"
          );
          return;
        }
      } else {
        console.error(
          `PUT /usuario/${editItemId} error:`,
          err1.response?.data || err1
        );
        toast.error(
          err1.response?.data?.mensaje || "Error al actualizar el usuario"
        );
        return;
      }
    }

    await fetchItems();
    closeEditModal();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      await api.delete(`/usuario/${id}`);
      toast.success("Registro eliminado con éxito");
      setItems((prev) => prev.filter((i) => i.id_usuario !== id));
    } catch (error) {
      console.error("DELETE /usuario error:", error.response?.data || error);
      toast.error(
        error.response?.data?.mensaje || "Error al eliminar el registro"
      );
    }
  };

  return (
    <div className="mm-page">
      <header className="mm-header">
        <img src={logo} alt="DGMM" className="mm-logo" />
      </header>

      <section className="mm-card">
        <div className="mm-card__head">
          <h2>Mantenimiento de Usuarios</h2>
          <div className="mm-actions">
            <Link to="/" className="mm-link">
              ← Volver al Menú Principal
            </Link>
            <button className="btn btn-primary" onClick={openModal}>
              + Nuevo usuario
            </button>
            <button
              className="btn btn-topbar-primary"
              onClick={generarPDFUsuarios}
            >
              <FaFilePdf size={16} /> Generar Reporte
            </button>
          </div>
        </div>

        <div className="mm-table__wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Rol</th>
                <th>Nombre</th>
                <th>Apellido</th>
                <th>Correo</th>
                <th>Usuario</th>
                <th style={{ width: 160 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center">
                    Cargando…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center">
                    Sin registros
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it.id_usuario}>
                    <td>{it.id_usuario}</td>
                    <td>
                      {rolesMap[it.id_rol] ||
                        it.rol_nombre ||
                        it.nombreRol ||
                        it.rol ||
                        it.nombre_rol ||
                        it.id_rol}
                    </td>
                    <td>{it.nombre}</td>
                    <td>{it.apellido}</td>
                    <td>{it.correo}</td>
                    <td>{it.nombre_usuario}</td>
                    <td className="mm-actions--row">
                      <button
                        className="btn btn-outline"
                        onClick={() => openEditModal(it)}
                      >
                        Editar
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(it.id_usuario)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Crear */}
      <Modal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Crear Usuario</h3>
        <div className="mm-form">
          {/* ⬇️ SELECT DE ROLES */}
          <select
            value={newId_rol}
            onChange={(e) => setNewId_rol(e.target.value)}
          >
            <option value="">Seleccione un rol</option>
            {roles.map((r) => (
              <option key={r.id_rol} value={r.id_rol}>
                {r.rol_nombre ||
                  r.nombre_rol ||
                  r.rol ||
                  r.descripcion ||
                  r.nombre ||
                  `Rol ${r.id_rol}`}
              </option>
            ))}
          </select>

          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Nombre"
          />
          <input
            value={newApellido}
            onChange={(e) => setNewApellido(e.target.value)}
            placeholder="Apellido"
          />
          <input
            value={newCorreo}
            onChange={(e) => setNewCorreo(e.target.value)}
            placeholder="Correo"
          />
          <input
            value={newNombre_usuario}
            onChange={(e) => setNewNombre_usuario(e.target.value)}
            placeholder="Usuario"
          />
          <input
            type="password"
            value={newContraseña}
            onChange={(e) => setNewContraseña(e.target.value)}
            placeholder="Contraseña"
          />
        </div>
        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleCreate}>
            Guardar
          </button>
          <button className="btn btn-outline" onClick={closeModal}>
            Cerrar
          </button>
        </div>
      </Modal>

      {/* Modal Editar */}
      <Modal
        isOpen={isEditModalOpen}
        onRequestClose={closeEditModal}
        className="mm-modal"
        overlayClassName="mm-overlay"
      >
        <h3>Editar Usuario</h3>
        <div className="mm-form">
          {/* ⬇️ SELECT DE ROLES TAMBIÉN EN EDITAR */}
          <select
            value={newId_rol}
            onChange={(e) => setNewId_rol(e.target.value)}
          >
            <option value="">Seleccione un rol</option>
            {roles.map((r) => (
              <option key={r.id_rol} value={r.id_rol}>
                {r.rol_nombre ||
                  r.nombre_rol ||
                  r.rol ||
                  r.descripcion ||
                  r.nombre ||
                  `Rol ${r.id_rol}`}
              </option>
            ))}
          </select>

          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Nombre"
          />
          <input
            value={newApellido}
            onChange={(e) => setNewApellido(e.target.value)}
            placeholder="Apellido"
          />
          <input
            value={newCorreo}
            onChange={(e) => setNewCorreo(e.target.value)}
            placeholder="Correo"
          />
          <input
            value={newNombre_usuario}
            onChange={(e) => setNewNombre_usuario(e.target.value)}
            placeholder="Usuario"
          />
          <input
            type="password"
            value={newContraseña}
            onChange={(e) => setNewContraseña(e.target.value)}
            placeholder="Contraseña"
          />
        </div>
        <div className="mm-modal__actions">
          <button className="btn btn-primary" onClick={handleUpdate}>
            Guardar
          </button>
          <button className="btn btn-outline" onClick={closeEditModal}>
            Cerrar
          </button>
        </div>
      </Modal>

      <ToastContainer autoClose={3000} hideProgressBar={false} />
    </div>
  );
}
