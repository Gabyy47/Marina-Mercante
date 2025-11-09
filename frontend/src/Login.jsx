// src/Login.jsx
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import miImagen from "./imagenes/DGMM-Gobierno.png";
import Register from "./Register";
import "./Login.css";
import api from "./api";
import fondo from "./imagenes/Fondo.jpg";

const Login = () => {
  const [formData, setFormData] = useState({ nombre_usuario: "", contraseña: "" });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPass, setShowPass] = useState(false);

  // Toast (ventana inferior)
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  // Modal (ventana centrada)
  const [modal, setModal] = useState({ show: false, message: "" });

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), duration);
  };

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "nombre_usuario") value = value.toUpperCase();
    if ((name === "nombre_usuario" || name === "contraseña") && /\s/.test(value)) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
  e.preventDefault(); // ✅ Evita recarga

  // Validar campos vacíos
  if (!formData.nombre_usuario || !formData.contraseña) {
    showToast("Completa usuario y contraseña.", "error");
    return;
  }

  setLoading(true);
  try {
    const { data } = await api.post("/login", {
      nombre_usuario: formData.nombre_usuario,
      contraseña: formData.contraseña,
    });

    if (data?.token) localStorage.setItem("token", data.token);
    showToast("¡Inicio de sesión exitoso!", "success");

    setTimeout(() => navigate(from === "/login" ? "/" : from, { replace: true }), 1000);
  } catch (error) {
    const status = error.response?.status;
    const msg = error.response?.data?.mensaje || "Error al iniciar sesión.";

    if (status === 403 && msg.includes("No tiene un rol asignado")) {
      setModal({
        show: true,
        message:
          "No tiene un rol asignado. Comuníquese con el Administrador para que le asigne un rol.",
      });
    } else if (status === 403 && msg.includes("solo puede ingresar")) {
      showToast("Solo el Administrador puede ingresar al sistema por ahora.", "error");
    } else if (status === 401) {
      showToast("Credenciales inválidas. Verifica usuario y contraseña.", "error");
    } else {
      showToast(" " + msg, "error");
    }
  } finally {
    setLoading(false);
  }
};


  return (
    <div
      className="login-page"
      style={{ background: `url(${fondo}) center / cover no-repeat fixed` }}
    >
      <div className="login-card">
        <div className="login-left">
          <img src={miImagen} alt="Login Visual" />
        </div>

        <div className="login-right">
          <div className="tabs">
            <button
              className={activeTab === "login" ? "active" : ""}
              onClick={() => setActiveTab("login")}
              type="button"
            >
              INGRESA
            </button>
            <button
              className={activeTab === "register" ? "active" : ""}
              onClick={() => setActiveTab("register")}
              type="button"
            >
              REGÍSTRATE
            </button>
          </div>

          {activeTab === "login" ? (
            <form
  className="login-form"
  onSubmit={handleSubmit}
  onKeyDown={(e) => {
    // Bloquea Enter si falta usuario o contraseña
    if (
      e.key === "Enter" &&
      (!formData.nombre_usuario || !formData.contraseña)
    ) {
      e.preventDefault();
      // opcional: muestra un toast rápido
      // showToast("Completa usuario y contraseña.", "error");
    }
  }}
>
  <div className="input-icon">
    <FaUser className="icon" />
    <input
      type="text"
      name="nombre_usuario"
      placeholder="Ingresa tu nombre de usuario"
      value={formData.nombre_usuario}
      onChange={handleChange}
      required
      maxLength={20}
    />
  </div>

  <div className="input-icon">
    <FaLock className="icon" />
    <input
      type={showPass ? "text" : "password"}
      name="contraseña"
      placeholder="Ingresa tu contraseña"
      value={formData.contraseña}
      onChange={handleChange}
      required
      maxLength={20}
      autoComplete="current-password"
    />
    <button
      type="button"
      className="toggle-pass"
      onClick={() => setShowPass((s) => !s)}
    >
      {showPass ? <FaEyeSlash /> : <FaEye />}
    </button>
  </div>

  <button type="submit" disabled={loading}>
    {loading ? "Ingresando..." : "Ingresa"}
  </button>
  <p className="forgot-link">¿Olvidaste tu usuario y/o contraseña?</p>
</form>

          ) : (
            <Register onShowLogin={() => setActiveTab("login")} />
          )}
        </div>
      </div>

      {/* ✅ Toast flotante (esquina inferior derecha) */}
      {toast.show && (
        <div
          className={`toast-box ${toast.type === "error" ? "error" : "success"}`}
          onClick={() => setToast({ show: false, message: "", type: "success" })}
        >
          {toast.message}
        </div>
      )}

      {/* ✅ Modal centrado */}
      {modal.show && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Acceso denegado</h3>
            <p>{modal.message}</p>
            <button onClick={() => setModal({ show: false, message: "" })}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;