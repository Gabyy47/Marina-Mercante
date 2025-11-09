// src/Register.jsx
import React, { useState } from "react";
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
    confirmar_contraseña: "",
  });

  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // --- Nuevo: estado de toast como en Login ---
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [lastEmail, setLastEmail] = useState("");
  const [resendOpen, setResendOpen] = useState(false);
  const [resendEmail, setResendEmail] = useState("");

  // ==== Toast ====
  const showToast = (message, type = "success", duration = 3500) => {
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
        <h2 className="register-title">Crear cuenta</h2>

        {/* Campos principales */}
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
              maxLength={40}
            />
          </div>
        </div>

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
            maxLength={20}
          />
        </div>

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
          />
        </div>

        <div className="resend-row">
          <button
            type="button"
            className="link-button"
            onClick={() => {
              const prefill = formData.correo || lastEmail || "";
              setResendEmail(prefill);
              setResendOpen(true);
            }}
            disabled={resendLoading}
          >
            {resendLoading ? "Reenviando..." : "Reenviar código"}
          </button>
        </div>

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
            minLength={8}
            maxLength={20}
            aria-invalid={!passwordStrong}
          />
          <button
            type="button"
            className="show-pass"
            onClick={() => setShowPass((v) => !v)}
            aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {showPass ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        <p className="field-hint">
          Debe incluir mayúsculas, minúsculas, número y símbolo (mín. 8).
        </p>


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