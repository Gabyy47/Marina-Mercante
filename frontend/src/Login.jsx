// src/Login.jsx
import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import { useLocation, useNavigate } from "react-router-dom";
import api from "./api";
import miImagen from "./imagenes/DGMM-Gobierno.png";
import fondo from "./imagenes/Fondo.jpg";
import Register from "./Register";
import "./Login.css";

const Login = () => {
  const [formData, setFormData] = useState({
    nombre_usuario: "",
    contraseña: ""
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [activeTab, setActiveTab] = useState("login"); // "login" | "register"
  const [showPass, setShowPass] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "nombre_usuario") value = value.toUpperCase();
    // bloquear espacios en usuario y contraseña
    if ((name === "nombre_usuario" || name === "contraseña") && /\s/.test(value)) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const blockClipboard = (e) => e.preventDefault();
  const blockHotkeys = (e) => {
    if (e.ctrlKey && ["c", "x", "v"].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  };

  const showToastMsg = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/login", formData);
      localStorage.setItem("token", data?.token);
      showToastMsg("✅ ¡Inicio de sesión exitoso!", "success");
      setTimeout(() => {
        navigate(from === "/login" ? "/" : from, { replace: true });
      }, 800);
    } catch (error) {
      const msg = error.response?.data?.mensaje || error.message || "Error al iniciar sesión";
      showToastMsg("❌ " + msg, "error");
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
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  onKeyDown={blockHotkeys}
                />
              </div>

              {/* Contraseña con ojito */}
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
                  onCopy={blockClipboard}
                  onCut={blockClipboard}
                  onPaste={blockClipboard}
                  onKeyDown={blockHotkeys}
                />
                <button
                  type="button"
                  className="toggle-pass"
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPass}
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

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default Login;
