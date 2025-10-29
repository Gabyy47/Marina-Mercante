import { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Link } from 'react-router-dom';

const BASE_URL = "http://localhost:49146/api/";

Modal.setAppElement('#root');

const App = () => {
  const [items, setItems] = useState([]);
  const [newId_cargo, setNewId_cargo] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newApellido, setNewApellido] = useState("");
  const [newCorreo, setNewCorreo] = useState("");
  const [newNombre_usuario, setNewNombre_usuario] = useState("");
  const [newContraseña, setNewContraseña] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${BASE_URL}usuario`);
      setItems(response.data);
      console.log("Datos recibidos:", response.data);
    } catch (error) {
      toast.error('Error al cargar los datos');
      console.error("Error al obtener los Items:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleCreate = () => {
    if(newId_cargo.trim() && newNombre.trim() && newApellido.trim() && newCorreo.trim() && newNombre_usuario.trim() && newContraseña.trim()) {
      axios.post(`${BASE_URL}usuario`, {
        id_cargo: newId_cargo,
        nombre: newNombre,
        apellido: newApellido,
        correo: newCorreo,
        username: newNombre_usuario,
        password: newContraseña
      })
      .then((response) => {
        toast.success('¡Guardado con éxito!');
        setItems((prevItems) => [...prevItems, response.data]);
        closeModal();
      })
      .catch((error) => {
        toast.error('Error al guardar datos');
        console.log("Error al crear el item:", error);
      });
    } else {
      toast.error('Por favor completa todos los campos');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) {
      axios.delete(`${BASE_URL}usuario/${id}`)
        .then(() => {
          toast.success('Registro eliminado con éxito');
          setItems((prevItems) => prevItems.filter((item) => item.id_usuario !== id));
        })
        .catch((error) => {
          toast.error('Error al eliminar el registro');
          console.log("Error al eliminar el item:", error);
        });
    }
  };

  const handleUpdate = () => {
    const { id_cargo, nombre, apellido, correo, nombre_usuario, contraseña } = { newId_cargo, newNombre, newApellido, newCorreo, newNombre_usuario, newContraseña };
    axios.put(`${BASE_URL}usuario/${editItemId}`, {
      id_cargo,
      nombre,
      apellido,
      correo,
      nombre_usuario,
      contraseña
    })
    .then(() => {
      toast.success('¡Guardado con éxito!');
      setItems((prevItems) => prevItems.map((item) => 
        item.id_usuario === editItemId ? { ...item, id_cargo, nombre, apellido, correo, nombre_usuario, contraseña } : item
      ));
      closeEditModal();
    })
    .catch((error) => {
      toast.error('Error al guardar el registro');
      console.log("Error al actualizar el item:", error);
    });
  };

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => {
    setIsModalOpen(false);
    setNewId_cargo("");
    setNewNombre("");
    setNewApellido("");
    setNewCorreo("");
    setNewNombre_usuario("");
    setNewContraseña("");
  };

  const openEditModal = (item) => {
    setEditItemId(item.id_usuario); // Asegúrate de usar el campo correcto
    setNewId_cargo(item.id_cargo);
    setNewNombre(item.nombre);
    setNewApellido(item.apellido);
    setNewCorreo(item.correo);
    setNewNombre_usuario(item.nombre_usuario);
    setNewContraseña(item.contraseña);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setEditItemId(null);
  };

  return (
    <div>
      <h1>Mantenimiento LIV (CRUD)</h1>
      {/* Link para regresar a la página principal */}
      <Link to="/">Volver al Menú Principal</Link>

      <button onClick={openModal}>Nuevo</button>

      {/* Modal para crear usuario */}
      <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
        <h2>Crear Usuario</h2>
        <input type="text" value={newId_cargo} onChange={(e) => setNewId_cargo(e.target.value)} placeholder='Id_cargo' />
        <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder='Nombre' />
        <input type="text" value={newApellido} onChange={(e) => setNewApellido(e.target.value)} placeholder='Apellido' />
        <input type="text" value={newCorreo} onChange={(e) => setNewCorreo(e.target.value)} placeholder='Correo' />
        <input type="text" value={newNombre_usuario} onChange={(e) => setNewNombre_usuario(e.target.value)} placeholder='Nombre de Usuario' />
        <input type="password" value={newContraseña} onChange={(e) => setNewContraseña(e.target.value)} placeholder='Contraseña' />
        <button onClick={handleCreate}>Guardar</button>
        <button onClick={closeModal}>Cerrar</button>
      </Modal>

      {/* Modal para editar usuario */}
      <Modal isOpen={isEditModalOpen} onRequestClose={closeEditModal}>
        <h2>Editar Usuario</h2>
        <input type="text" value={newId_cargo} onChange={(e) => setNewId_cargo(e.target.value)} placeholder='Id_cargo' />
        <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder='Nombre' />
        <input type="text" value={newApellido} onChange={(e) => setNewApellido(e.target.value)} placeholder='Apellido' />
        <input type="text" value={newCorreo} onChange={(e) => setNewCorreo(e.target.value)} placeholder='Correo' />
        <input type="text" value={newNombre_usuario} onChange={(e) => setNewNombre_usuario(e.target.value)} placeholder='Nombre de Usuario' />
        <input type="password" value={newContraseña} onChange={(e) => setNewContraseña(e.target.value)} placeholder='Contraseña' />
        <button onClick={handleUpdate}>Guardar</button>
        <button onClick={closeEditModal}>Cerrar</button>
      </Modal>

      <ul>
        {items.map((item) => (
          <li key={item.id_usuario}>
            <span style={{ marginRight: '10px' }}>{item.id_usuario}</span>
            <span style={{ marginRight: '10px' }}>{item.id_cargo}</span>
            <span style={{ marginRight: '10px' }}>{item.nombre}</span>
            <span style={{ marginRight: '10px' }}>{item.apellido}</span>
            <span style={{ marginRight: '10px' }}>{item.correo}</span>
            <span style={{ marginRight: '10px' }}>{item.nombre_usuario}</span>
            <button onClick={() => openEditModal(item)}>Editar</button>
            <button onClick={() => handleDelete(item.id_usuario)}>Eliminar</button>
          </li>
        ))}
      </ul>

      <ToastContainer
        autoClose={3000}
        hideProgressBar={false}
        closeOnClick
        pauseOnHover
        draggable
        draggablePercent={60}
      />
    </div>
  );
};

export default App;