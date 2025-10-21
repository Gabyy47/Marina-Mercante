import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';
import miImagen from './imagenes/DGMM-Gobierno.png';

const Login = ({ onShowRegister }) => {
  const [formData, setFormData] = useState({
    nombre_usuario: '',
    contraseña: '',
    id_cargo: ''
  });

  const [cargos, setCargos] = useState([]); // <-- para guardar los cargos

  // Traer los cargos al cargar el componente
  useEffect(() => {
    const fetchCargos = async () => {
      try {
        const response = await axios.get('http://localhost:49146/api/cargos'); // <-- tu endpoint de cargos
        setCargos(response.data); // se asume que la respuesta es un array de objetos { id_cargo, descripcion }
      } catch (error) {
        console.error('Error al cargar los cargos:', error);
      }
    };
    fetchCargos();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:49146/api/login', formData);
      alert('¡Login exitoso!');
    } catch (error) {
      alert('Error en login: ' + (error.response?.data?.mensaje || error.message));
    }
  };

  return (
    <div className="login-card">
      <div className="login-left">
        <img src={miImagen} alt="Login Visual" />
      </div>

      <div className="login-right">
        <form className="login-form" onSubmit={handleSubmit}>
          <h2>Iniciar Sesión</h2>

          <input
            type="text"
            name="nombre_usuario"
            placeholder="Usuario"
            value={formData.nombre_usuario}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="contraseña"
            placeholder="Contraseña"
            value={formData.contraseña}
            onChange={handleChange}
            required
          />

          {/* Select de cargos */}
          <select
            name="id_cargo"
            value={formData.id_cargo}
            onChange={handleChange}
            required
          >
            <option value="">Selecciona tu cargo</option>
            {cargos.map((cargo) => (
              <option key={cargo.id_cargo} value={cargo.id_cargo}>
                {cargo.descripcion}
              </option>
            ))}
          </select>

          <button type="submit">Ingresar</button>

          <p className="register-link">
            ¿No tienes cuenta?{' '}
            <span onClick={onShowRegister}>Regístrate</span>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
