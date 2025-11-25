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
  const [newId_cliente, setNewId_cliente] = useState("");
  const [newNombre, setNewNombre] = useState("");
  const [newIdentidad, setNewIdentidad] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState(null);

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${BASE_URL}cliente`);
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
    if(newId_cliente.trim() && newNombre.trim() && newIdentidad.trim()) {
      axios.post(`${BASE_URL}cliente`, {
        id_cliente: newId_cliente,
        nombre: newNombre,
        identidad: newIdentidad
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
      toast.error('Por favor completa todos los campos antes de guardar');
    }
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Está seguro de que desea eliminar este cliente?")) {
      axios.delete(`${BASE_URL}cliente/${id}`)
        .then(() => {
          toast.success('Registro eliminado con éxito');
          setItems((prevItems) => prevItems.filter((item) => item.id_cliente !== id));
        })
        .catch((error) => {
          toast.error('Error al eliminar el registro');
          console.log("Error al eliminar el item:", error);
        });
    }
  };

  const handleUpdate = () => {
    const { id_cliente, nombre, identidad } = { newId_cliente, newNombre, newIdentidad };
    axios.put(`${BASE_URL}cliente/${editItemId}`, {
      id_cliente,
      nombre,
      identidad
    })
    .then(() => {
      toast.success('¡Guardado con éxito!');
      setItems((prevItems) => prevItems.map((item) => 
        item.id_cliente === editItemId ? { ...item, id_cliente, nombre, identidad } : item
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
    setNewId_cliente("");
    setNewNombre("");
    setNewIdentidad("");
  };

  const openEditModal = (item) => {
    setEditItemId(item.id_cliente); // Asegúrate de usar el campo correcto
    setNewId_cliente(item.id_cliente);
    setNewNombre(item.nombre);
    setNewIdentidad(item.identidad);
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

      {/* Modal para crear un cliente */}
      <Modal isOpen={isModalOpen} onRequestClose={closeModal}>
        <h2>Crear cliente</h2>
        <input type="text" value={newId_cliente} onChange={(e) => setNewId_cargo(e.target.value)} placeholder='Id_cliente' />
        <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder='Nombre' />
        <input type="text" value={newIdentidad} onChange={(e) => setNewApellido(e.target.value)} placeholder='Identidad' />
        <button onClick={handleCreate}>Guardar</button>
        <button onClick={closeModal}>Cerrar</button>
      </Modal>

      {/* Modal para editar Cliente */}
      <Modal isOpen={isEditModalOpen} onRequestClose={closeEditModal}>
        <h2>Editar Cliente</h2>
        <input type="text" value={newId_cliente} onChange={(e) => setNewId_cargo(e.target.value)} placeholder='Id_cliente' />
        <input type="text" value={newNombre} onChange={(e) => setNewNombre(e.target.value)} placeholder='Nombre' />
        <input type="text" value={newIdentidad} onChange={(e) => setNewApellido(e.target.value)} placeholder='Identidad' />
        <button onClick={handleUpdate}>Guardar</button>
        <button onClick={closeEditModal}>Cerrar</button>
      </Modal>

      <ul>
        {items.map((item) => (
          <li key={item.id_usuario}>
            <span style={{ marginRight: '10px' }}>{item.id_cliente}</span>
            <span style={{ marginRight: '10px' }}>{item.id_cargo}</span>
            <span style={{ marginRight: '10px' }}>{item.nombre}</span>
            <span style={{ marginRight: '10px' }}>{item.iidentidad}</span>
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