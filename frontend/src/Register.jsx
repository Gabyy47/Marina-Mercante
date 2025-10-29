import React, { useState } from "react";
import axios from "axios";
import { FaUser, FaLock, FaBriefcase, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Register.css"; // estilos existentes

const Register = ({ onShowLogin }) => {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    nombre_usuario: "",
    correo: "",
    contraseña: "",
    confirmar_contraseña: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), duration);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;

    if (name === "id_cargo") value = Number(value);

    // Usuario en MAYÚSCULAS y sin espacios
    if (name === "nombre_usuario") {
      value = value.toUpperCase();
      if (/\s/.test(value)) return; // no permitir espacios
    }

    // Contraseñas sin espacios
    if ((name === "contraseña" || name === "confirmar_contraseña") && /\s/.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Reglas de contraseña robusta
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-])[A-Za-z\d@$!%*?&#._-]{8,}$/;

  const passwordsMatch = formData.contraseña === formData.confirmar_contraseña;
  const passwordStrong = strongPassword.test(formData.contraseña);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!passwordStrong) {
      showToast(
        "La contraseña debe tener mínimo 8 caracteres e incluir mayúsculas, minúsculas, número y símbolo.",
        "error"
      );
      return;
    }

    if (!passwordsMatch) {
      showToast("Las contraseñas no coinciden.", "error");
      return;
    }

    setLoading(true);
    try {
      await axios.post("http://localhost:49146/api/usuario", {
        nombre: formData.nombre,
        apellido: formData.apellido,
        nombre_usuario: formData.nombre_usuario,
        correo: formData.correo,
        contraseña: formData.contraseña,
      });

      showToast("¡Cuenta creada exitosamente! Revisa tu correo para verificar tu cuenta.", "success");

      // Limpiar formulario
      setFormData({
        nombre: "",
        apellido: "",
        nombre_usuario: "",
        correo: "",
        contraseña: "",
        confirmar_contraseña: "",
        id_cargo: "",
      });

      // Volver al login luego de 1.5s
      setTimeout(() => onShowLogin?.(), 1500);
    } catch (error) {
      showToast(
        "Error en el registro: " + (error.response?.data?.error || error.message),
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
            aria-invalid={!passwordStrong}
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

        {/* Pista de robustez */}
        <p className="field-hint">
          Debe incluir mayúsculas, minúsculas, número y símbolo (mín. 8).
        </p>

        {/* Confirmar contraseña */}
        <div className="input-group password-field">
          <FaLock className="icon" />
          <input
            className="input-field"
            type={showConfirmPass ? "text" : "password"}
            name="confirmar_contraseña"
            placeholder="Confirmar contraseña"
            value={formData.confirmar_contraseña}
            onChange={handleChange}
            required
            autoComplete="new-password"
            minLength={8}
            maxLength={20}
            aria-invalid={formData.confirmar_contraseña ? !passwordsMatch : false}
          />
          <button
            type="button"
            className="show-pass"
            onClick={() => setShowConfirmPass((v) => !v)}
            aria-label={showConfirmPass ? "Ocultar confirmación" : "Mostrar confirmación"}
            title={showConfirmPass ? "Ocultar confirmación" : "Mostrar confirmación"}
          >
            {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Mensaje de coincidencia (en tiempo real) */}
        {formData.confirmar_contraseña && !passwordsMatch && (
          <p className="field-hint error-hint">Las contraseñas no coinciden.</p>
        )}

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

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Register;
