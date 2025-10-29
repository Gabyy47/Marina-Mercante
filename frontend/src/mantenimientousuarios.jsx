import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";                       // instancia Axios con baseURL http://localhost:49146/api
import logo from "./imagenes/DGMM-Gobierno.png";
import "./mantenimiento.css";

// Necesario para accesibilidad del modal
Modal.setAppElement("#root");

export default function MantenimientoUsuarios() {
  // ====== estado tabla ======
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  // ====== estado de formulario (compartido para crear/editar) ======
  const [newId_cargo, setNewId_cargo] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newCorreo, setNewCorreo] = useState("");
  const [newNombre_usuario, setNewNombre_usuario] = useState("");
  const [newContraseña, setNewContraseña] = useState("");

  // ====== modales ======
  const [isModalOpen, setIsModalOpen] = useState(false);        // crear
  const [isEditModalOpen, setIsEditModalOpen] = useState(false); // editar
  const [editItemId, setEditItemId] = useState(null);

  // ====== helpers ======
  const limpiarCampos = () => {
    setNewId_cargo("");
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
    setNewId_cargo(String(item.id_cargo ?? ""));
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
      newId_cargo.trim() &&
      newNombre.trim() &&
      newApellido.trim() &&
      newCorreo.trim() &&
      newNombre_usuario.trim() &&
      newContraseña.trim(),
    [
      newId_cargo,
      newNombre,
      newApellido,
      newCorreo,
      newNombre_usuario,
      newContraseña,
    ]
  );

  const toPayload = () => {
    const idCargoNum = Number(newId_cargo);
    return {
      id_cargo: idCargoNum,
      nombre: newNombre.trim(),
      apellido: newApellido.trim(),
      correo: newCorreo.trim(),
      nombre_usuario: newNombre_usuario.trim(),
      contraseña: newContraseña,
    };
  };

  // ====== API ======
  const fetchItems = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/usuario"); // GET /api/usuario
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("GET /usuario error:", error.response?.data || error);
      toast.error(error.response?.data?.mensaje || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = async () => {
    if (!camposCompletos) {
      toast.error("Por favor completa todos los campos");
      return;
    }
    const payload = toPayload();
    if (!Number.isFinite(payload.id_cargo)) {
      toast.error("El campo 'Cargo' (id_cargo) debe ser numérico");
      return;
    }

    try {
      await api.post("/usuario", payload); // POST /api/usuario
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
    if (!Number.isFinite(payload.id_cargo)) {
      toast.error("El campo 'Cargo' (id_cargo) debe ser numérico");
      return;
    }

    // Intentamos PUT /usuario/:id; si tu backend usa otro, hacemos fallback
    try {
      await api.put(`/usuario/${editItemId}`, payload);
      toast.success("¡Usuario actualizado con éxito!");
    } catch (err1) {
      if (err1?.response?.status === 404) {
        try {
          // fallback: PUT /usuario con id en body
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
      await api.delete(`/usuario/${id}`); // DELETE /api/usuario/:id
      toast.success("Registro eliminado con éxito");
      setItems((prev) => prev.filter((i) => i.id_usuario !== id));
    } catch (error) {
      console.error("DELETE /usuario error:", error.response?.data || error);
      toast.error(
        error.response?.data?.mensaje || "Error al eliminar el registro"
      );
    }
  };

  // ====== UI ======
  return (
    <div className="mm-page">
      {/* Encabezado institucional */}
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
          </div>
        </div>

        <div className="mm-table__wrap">
          <table className="mm-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cargo</th>
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
                    <td>{it.id_cargo}</td>
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
          <input
            value={newId_cargo}
            onChange={(e) => setNewId_cargo(e.target.value)}
            placeholder="Id Cargo (número)"
          />
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
          <input
            value={newId_cargo}
            onChange={(e) => setNewId_cargo(e.target.value)}
            placeholder="Id Cargo (número)"
          />
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
