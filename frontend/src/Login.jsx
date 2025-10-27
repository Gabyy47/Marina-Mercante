// src/Login.jsx
import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaUser, FaLock, FaBriefcase, FaEye, FaEyeSlash } from "react-icons/fa";
import miImagen from "./imagenes/DGMM-Gobierno.png";
import Register from "./Register";
import "./Login.css";
import api from "./api"; // instancia con interceptores
import fondo from "./imagenes/Fondo.jpg";

const Login = () => {
  const [formData, setFormData] = useState({
    nombre_usuario: "",
    contraseña: ""
  });
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [activeTab, setActiveTab] = useState("login"); // "login" | "register"
  const [showPass, setShowPass] = useState(false); // 👁️ para mostrar/ocultar contraseña

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // Cargar cargos
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data } = await api.get("/cargos");
        if (isMounted) setCargos(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error al cargar los cargos:", err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "id_cargo") value = Number(value);
    if (name === "nombre_usuario") value = value.toUpperCase();
    if ((name === "nombre_usuario" || name === "contraseña") && /\s/.test(value)) return; // sin espacios
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.id_cargo) return showToast("Selecciona tu cargo.", "error");
    setLoading(true);
    try {
      const { data } = await api.post("/login", formData);
      localStorage.setItem("token", data?.token);
      showToast("✅ ¡Inicio de sesión exitoso!", "success");
      setTimeout(() => {
        navigate(from === "/login" ? "/" : from, { replace: true });
      }, 800);
    } catch (error) {
      const msg = error.response?.data?.mensaje || error.message || "Error al iniciar sesión";
      showToast("❌ " + msg, "error");
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
                />
              </div>

              {/* Contraseña con ojito  */}
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
                  aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
                  aria-pressed={showPass}
                  onClick={() => setShowPass((s) => !s)}
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              {/* Cargo */}
              {Array.isArray(cargos) && cargos.length > 0 && (
                <div className="input-icon">
                  <FaBriefcase className="icon" />
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
                </div>
              )}

              <button type="submit" disabled={loading}>
                {loading ? "Ingresando..." : "Ingresa"}
              </button>
              <p className="forgot-link">¿Olvidaste tu usuario y/o contraseña?</p>
            </form>
          ) : (
            <Register onShowLogin={() => setActiveTab("login")} />
          )}
        </div> {/* cierre login-right */}
      </div>   {/* cierre login-card */}

      {/* Toast */}
      {toast.show && (
        <div className={`toast ${toast.type === "error" ? "error" : ""}`}>
          {toast.message}
        </div>
      )}
    </div> /* cierre login-page */
  );
};

export default Login;
