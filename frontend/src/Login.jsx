import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaUser, FaLock, FaBriefcase } from "react-icons/fa";
import "./Login.css";
import miImagen from "./imagenes/DGMM-Gobierno.png";
import Register from "./Register"; // ← se renderiza en la misma pantalla

const Login = () => {
  const [formData, setFormData] = useState({
    nombre_usuario: "",
    contraseña: ""
  });

  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [activeTab, setActiveTab] = useState("login"); // "login" | "register"

  axios.defaults.withCredentials = true;



  const handleChange = (e) => {
    let value = e.target.value;
    const { name } = e.target;

    if (name === "id_cargo") value = Number(value);
    if (name === "nombre_usuario") value = value.toUpperCase();

    // No permitir espacios en usuario/contraseña
    if ((name === "nombre_usuario" || name === "contraseña") && /\s/.test(value)) return;

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post("http://localhost:49146/api/login", formData, {
        withCredentials: true,
      });
      localStorage.setItem("token", response.data.token);

      // Solo mostrar el toast azul (sin modal)
      showToast("✅ ¡Inicio de sesión exitoso!", "success");

      // Redirigir automáticamente después de 2 segundos
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 2000);
    } catch (error) {
      showToast("❌ " + (error.response?.data?.mensaje || error.message), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card">
      {/* Lado izquierdo con imagen institucional */}
      <div className="login-left">
        <img src={miImagen} alt="Login Visual" />
      </div>

      {/* Lado derecho con pestañas y contenido dinámico */}
      <div className="login-right">
        {/* Pestañas */}
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

        {/* Contenido según pestaña */}
        {activeTab === "login" ? (
          <form className="login-form" onSubmit={handleSubmit}>
            {/* Usuario */}
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
                autoComplete="username"
              />
            </div>

            {/* Contraseña */}
            <div className="input-icon">
              <FaLock className="icon" />
              <input
                type="password"
                name="contraseña"
                placeholder="Ingresa tu contraseña"
                value={formData.contraseña}
                onChange={handleChange}
                required
                maxLength={20}
                autoComplete="current-password"
              />
            </div>

            {/* Botón */}
            <button type="submit" disabled={loading}>
              {loading ? "Ingresando..." : "Ingresa"}
            </button>

            {/* Enlace de recuperación */}
            <p className="forgot-link">¿Olvidaste tu usuario y/o contraseña?</p>
          </form>
        ) : (
          <Register onShowLogin={() => setActiveTab("login")} />
        )}
      </div>

      {/* Solo se muestra el toast azul */}
      {toast.show && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>{toast.message}</div>
      )}
    </div>
  );
};

export default Login;
