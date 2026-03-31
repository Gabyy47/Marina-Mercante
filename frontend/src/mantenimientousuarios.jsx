import { useEffect, useState } from "react";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import api from "./api";
import "./mantenimientoTickets.css";

Modal.setAppElement("#root");

export default function MantenimientoUsuarios() {
  const [items, setItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [id_rol, setId_rol] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [nombre_usuario, setNombre_usuario] = useState("");
  const [contraseña, setContraseña] = useState("");
  const [estado, setEstado] = useState("activo");

  const [editItemId, setEditItemId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchRoles();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await api.get("/usuario");
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error al cargar usuarios");
    }
  };

  const fetchRoles = async () => {
    try {
      const { data } = await api.get("/roles");
      setRoles(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error al cargar roles");
    }
  };

  const usuariosFiltrados = items.filter(u =>
    u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    u.nombre_usuario.toLowerCase().includes(busqueda.toLowerCase())
  );

  /* ===== MODAL ===== */
  const abrirModal = (item = null) => {
    if (item) {
      setEditItemId(item.id_usuario);
      setId_rol(item.id_rol);
      setNombre(item.nombre);
      setApellido(item.apellido);
      setCorreo(item.correo);
      setNombre_usuario(item.nombre_usuario);
      setEstado(item.estado);
      setContraseña("");
    } else {
      setEditItemId(null);
      setId_rol("");
      setNombre("");
      setApellido("");
      setCorreo("");
      setNombre_usuario("");
      setContraseña("");
      setEstado("activo");
    }
    setIsModalOpen(true);
  };

  const cerrarModal = () => setIsModalOpen(false);

  /* ===== GUARDAR ===== */
  const guardar = async () => {
    try {
      if (!nombre || !nombre_usuario) {
        toast.error("Completa los campos");
        return;
      }

      if (editItemId) {
        const data = {
          id_usuario: editItemId,
          id_rol,
          nombre,
          apellido,
          correo,
          nombre_usuario,
          estado
        };

        if (contraseña) data.contraseña = contraseña;

        await api.put("/usuario", data);
      } else {
        await api.post("/usuario", {
          id_rol,
          nombre,
          apellido,
          correo,
          nombre_usuario,
          contraseña,
          estado
        });
      }

      toast.success("Guardado correctamente");
      cerrarModal();
      fetchItems();
    } catch {
      toast.error("Error al guardar");
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm("¿Eliminar usuario?")) return;
    await api.delete(`/usuario/${id}`);
    fetchItems();
  };

  const cambiarEstado = async (id, estadoActual) => {
    const nuevo = estadoActual === "activo" ? "inactivo" : "activo";
    await api.put(`/usuario/${id}/estado`, { estado: nuevo });
    fetchItems();
  };

  return (
    <div className="tk-root">

      {/* HEADER */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">
          Mantenimiento de Usuarios
        </div>

        <div className="tk-card-header__actions">
          <button className="tk-btn tk-btn--primary" onClick={() => abrirModal()}>
            + Nuevo Usuario
          </button>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="tk-card">
        <input
          className="tk-field input"
          placeholder="Buscar usuario..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="tk-tablewrap">
        <table className="tk-table">
          <thead>
            <tr>
              <th>Rol</th>
              <th>Nombre</th>
              <th>Usuario</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {usuariosFiltrados.map(u => (
              <tr key={u.id_usuario}>
                <td>{u.rol_nombre}</td>
                <td>{u.nombre}</td>
                <td>{u.nombre_usuario}</td>

                <td>
                  <span className={
                    u.estado === "activo"
                      ? "chip chip--finalizado"
                      : "chip chip--cancelado"
                  }>
                    {u.estado}
                  </span>
                </td>

                <td className="acciones">
                  <button className="tk-btn tk-btn--sm" onClick={() => abrirModal(u)}>
                    Editar
                  </button>

                  <button className="tk-btn tk-btn--danger tk-btn--sm" onClick={() => eliminar(u.id_usuario)}>
                    Eliminar
                  </button>

                  <button className="tk-btn tk-btn--sm" onClick={() => cambiarEstado(u.id_usuario, u.estado)}>
                    Estado
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      <Modal isOpen={isModalOpen} className="tk-modal" overlayClassName="tk-overlay">
        <h3>{editItemId ? "Editar Usuario" : "Nuevo Usuario"}</h3>

        <div className="tk-grid">
          <div className="tk-field">
            <label>Rol</label>
            <select value={id_rol} onChange={e => setId_rol(e.target.value)}>
              <option value="">Seleccione</option>
              {roles.map(r => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.rol_nombre || r.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="tk-field">
            <label>Nombre</label>
            <input value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          <div className="tk-field">
            <label>Apellido</label>
            <input value={apellido} onChange={e => setApellido(e.target.value)} />
          </div>

          <div className="tk-field">
            <label>Correo</label>
            <input value={correo} onChange={e => setCorreo(e.target.value)} />
          </div>

          <div className="tk-field">
            <label>Usuario</label>
            <input value={nombre_usuario} onChange={e => setNombre_usuario(e.target.value)} />
          </div>

          <div className="tk-field">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              placeholder="Dejar vacío si no desea cambiarla"
              value={contraseña}
              onChange={e => setContraseña(e.target.value)}
            />
          </div>

          <div className="tk-field">
            <label>Estado</label>
            <select value={estado} onChange={e => setEstado(e.target.value)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>

        <div className="tk-modal-actions">
          <button className="tk-btn tk-btn--primary" onClick={guardar}>
            Guardar
          </button>

          <button className="tk-btn" onClick={cerrarModal}>
            Cancelar
          </button>
        </div>
      </Modal>

      <ToastContainer />
    </div>
  );
}