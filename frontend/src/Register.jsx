import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUser, FaLock, FaBriefcase, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Register.css"; // Puedes tener los estilos de .toast en Login.css; como el CSS es global, funcionará igual.

const Register = ({ onShowLogin }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    nombre_usuario: "",
    correo: "",
    contraseña: "",
    id_cargo: "",
  });

  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // --- Nuevo: estado de toast como en Login ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), duration);
  };

  useEffect(() => {
    const fetchCargos = async () => {
      try {
        const { data } = await axios.get("http://localhost:49146/api/cargos");
        setCargos(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error al cargar cargos:", error);
      }
    };
    fetchCargos();
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "id_cargo") value = Number(value);

    // Usuario en MAYÚSCULAS y sin espacios
    if (name === "nombre_usuario") {
      value = value.toUpperCase();
      if (/\s/.test(value)) return; // no permitir espacios
    }

    // Contraseña sin espacios
    if (name === "contraseña" && /\s/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Contraseña robusta
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-])[A-Za-z\d@$!%*?&#._-]{8,}$/;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!strongPassword.test(formData.contraseña)) {
      showToast(
        "La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, número y símbolo.",
        "error"
      );
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:49146/api/usuario", formData);

      // Toast de éxito
      showToast("✅ ¡Cuenta creada exitosamente!", "success");

      // Limpiar formulario
      setFormData({
        nombre: "",
        apellido: "",
        nombre_usuario: "",
        correo: "",
        contraseña: "",
        id_cargo: "",
      });

      // Volver al login en el mismo panel tras 1.5s
      setTimeout(() => onShowLogin?.(), 1500);
    } catch (error) {
      showToast(
        "❌ Error en el registro: " + (error.response?.data?.error || error.message),
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2 className="register-title"></h2>

        {/* Nombre / Apellido */}
        <div className="input-row">
          <div className="input-group">
            <FaUser className="icon" />
            <input
              className="input-field"
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              required
              autoComplete="given-name"
              maxLength={40}
            />
          </div>

          <div className="input-group">
            <FaUser className="icon" />
            <input
              className="input-field"
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={formData.apellido}
              onChange={handleChange}
              required
              autoComplete="family-name"
              maxLength={40}
            />
          </div>
        </div>

        {/* Usuario */}
        <div className="input-group">
          <FaUser className="icon" />
          <input
            className="input-field"
            type="text"
            name="nombre_usuario"
            placeholder="Nombre de usuario (MAYÚSCULAS)"
            value={formData.nombre_usuario}
            onChange={handleChange}
            required
            autoComplete="username"
            maxLength={20}
          />
        </div>

        {/* Correo */}
        <div className="input-group">
          <span className="icon">✉️</span>
          <input
            className="input-field"
            type="email"
            name="correo"
            placeholder="Correo electrónico"
            value={formData.correo}
            onChange={handleChange}
            required
            autoComplete="email"
          />
        </div>

        {/* Contraseña */}
        <div className="input-group password-field">
          <FaLock className="icon" />
          <input
            className="input-field"
            type={showPass ? "text" : "password"}
            name="contraseña"
            placeholder="Contraseña"
            value={formData.contraseña}
            onChange={handleChange}
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={20}
          />
          <button
            type="button"
            className="show-pass"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            title={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPass ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <p className="field-hint">
          Debe incluir mayúsculas, minúsculas, número y símbolo (mín. 8).
        </p>

        {/* Cargo */}
        <div className="input-group">
          <FaBriefcase className="icon" />
          <select
            className="input-field"
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

        <button type="submit" className="register-button" disabled={loading}>
          {loading ? "Registrando..." : "Registrarse"}
        </button>

        <div className="login-link">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onShowLogin?.();
            }}
          >
            Volver a Iniciar Sesión
          </a>
        </div>
      </form>

      {/* Toast (igual estilo que en Login) */}
      {toast.show && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Register;
