import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Register.css';

const Register = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    usuario: '',  // ahora coincide con el input
    correo: '',
    contraseña: '',
    id_cargo: ''
  });

  const [cargos, setCargos] = useState([]);

  // Cargar los cargos desde la API al iniciar el componente
  useEffect(() => {
    const fetchCargos = async () => {
      try {
        const response = await axios.get('http://localhost:49146/api/cargos'); 
        setCargos(response.data);
      } catch (error) {
        console.error('Error al cargar cargos:', error);
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
      console.log('Registrando usuario:', formData);
      const response = await axios.post('http://localhost:49146/api/usuario', formData);
      console.log('Registro exitoso:', response.data);
      alert('¡Registro exitoso! Revisa tu correo para el código QR');

      // Limpiar formulario
      setFormData({
        nombre: '',
        apellido: '',
        usuario: '',
        correo: '',
        contraseña: '',
        id_cargo: ''
      });
    } catch (error) {
      console.error('Error en registro:', error);
      alert('Error en registro: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2 className="register-title">Crear Cuenta</h2>
        
        <div className="input-row">
          <div className="input-group">
            <input 
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
          
          <div className="input-group">
            <input 
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
              className="input-field"
            />
          </div>
        </div>

        <div className="input-group">
          <input 
            type="text"
            name="usuario"  // ✅ aquí es correcto
            placeholder="Usuario"
            value={formData.usuario}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div className="input-group">
          <input 
            type="email"
            name="correo"
            placeholder="Correo electrónico"
            value={formData.correo}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div className="input-group">
          <input 
            type="password"
            name="contraseña"
            placeholder="Contraseña"
            value={formData.contraseña}
            onChange={handleChange}
            required
            className="input-field"
          />
        </div>

        <div className="form-group">
          <label htmlFor="id_cargo">Cargo</label>
          <select
            id="id_cargo"
            name="id_cargo"
            value={formData.id_cargo}
            onChange={handleChange}
            required
          >
            <option value="">-- Selecciona un cargo --</option>
            {cargos.map((cargo) => (
              <option key={cargo.id_cargo} value={cargo.id_cargo}>
                {cargo.descripcion}
              </option>
            ))}
          </select>
        </div>
        
        <button type="submit" className="register-button">Registrarse</button>
        
        <div className="login-link">
          <a href="#" onClick={() => window.location.href = '/login'}>
            ¿Ya tienes cuenta? Inicia Sesión
          </a>
        </div>
      </form>
    </div>
  );
};

export default Register;
