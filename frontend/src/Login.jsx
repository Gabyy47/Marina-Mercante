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
  // ====== ESTADOS PRINCIPALES ======
  const [formData, setFormData] = useState({ nombre_usuario: "", contraseña: "" });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [showPass, setShowPass] = useState(false);

  // ====== TOAST Y MODALES ======
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modal, setModal] = useState({ show: false, message: "" });

  // ====== RECUPERACIÓN DE CONTRASEÑA ======
  const [forgotStep, setForgotStep] = useState(0); // 0=oculto, 1=correo, 2=código, 3=nueva contraseña
  const [recoveryData, setRecoveryData] = useState({
    correo: "",
    codigo: "",
    nueva1: "",
    nueva2: "",
  });
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || "/";

  // ====== TOAST ======
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), duration);
  };

  // ====== LOGIN ======
  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === "nombre_usuario") value = value.toUpperCase();
    if ((name === "nombre_usuario" || name === "contraseña") && /\s/.test(value)) return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre_usuario || !formData.contraseña) {
      showToast("Completa usuario y contraseña.", "error");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/login", formData);

      // Asegurarse que viene el token
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      // Guardar datos del usuario que inició sesión
      if (data?.usuario) {
        localStorage.setItem("mm_user", JSON.stringify(data.usuario));
        localStorage.setItem("usuarioData", JSON.stringify(data.usuario)); 
      }

      showToast("¡Inicio de sesión exitoso!", "success");

      const rol = data?.usuario?.rol_nombre || "";
const rolNorm = rol.toLowerCase();

if (
  (rolNorm.includes("guarda") && rolNorm.includes("almacen")) ||
  (rolNorm.includes("auxiliar") && rolNorm.includes("almacen"))
) {
  navigate("/guarda/dashboard", { replace: true });

} else if (rolNorm.includes("tickets")) {
  navigate("/tickets/dashboard", { replace: true });

} else if (rolNorm.includes("admin")) {
  navigate("/dashboard", { replace: true });

} else {
  navigate(from === "/login" ? "/" : from, { replace: true });
}


    } catch (error) {
      const status = error.response?.status;
      const msg = error.response?.data?.mensaje || "Error al iniciar sesión.";

      if (status === 403 && msg.includes("No tiene un rol")) {
        setModal({
          show: true,
          message:
            "No tiene un rol asignado. Comuníquese con el Administrador para que le asigne un rol.",
        });
      } else if (status === 401) {
        showToast("Credenciales inválidas. Verifica usuario y contraseña.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // ====== RECUPERACIÓN DE CONTRASEÑA ======
  const handleRecoveryChange = (e) => {
    const { name, value } = e.target;
    setRecoveryData((prev) => ({ ...prev, [name]: value }));
  };

  // === Paso 1: Enviar código al correo ===
  const sendRecoveryCode = async (e) => {
    e.preventDefault();
    const correo = recoveryData.correo.trim();
    if (!correo) return showToast("Ingresa tu correo o usuario.", "error");

    console.log("[FRONT] Enviando a /recuperar-iniciar:", { correo });
    setRecoveryLoading(true);
    try {
      const { data } = await api.post("/recuperar-iniciar", { correo });
      showToast(data?.mensaje || "Código enviado. Revisa tu correo.", "success");
      setForgotStep(2); // avanzar a verificar código
    } catch (err) {
      console.error("[FRONT] Error /recuperar-iniciar:", err);
      showToast(err.response?.data?.mensaje || "No se pudo enviar el código.", "error");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // === Paso 2: Verificar código ===
  const verifyRecoveryCode = async (e) => {
    e.preventDefault();
    const { correo, codigo } = recoveryData;
    if (!codigo || codigo.length !== 6) return showToast("Código inválido.", "error");

    setRecoveryLoading(true);
    try {
      const { data } = await api.post("/recuperar-verificar", { correo, codigo });
      showToast(data?.mensaje || "Código verificado.", "success");
      setForgotStep(3); // avanzar al paso de nueva contraseña
    } catch (err) {
      showToast(err.response?.data?.mensaje || "Código incorrecto.", "error");
    } finally {
      setRecoveryLoading(false);
    }
  };

  // === Paso 3: Restablecer contraseña ===
  const resetPassword = async (e) => {
    e.preventDefault();
    const { correo, nueva1, nueva2 } = recoveryData;

    if (nueva1 !== nueva2) return showToast("Las contraseñas no coinciden.", "error");
    if (nueva1.length < 8) return showToast("Contraseña demasiado corta (mín. 8).", "error");

    setRecoveryLoading(true);
    try {
      const { data } = await api.post("/recuperar-restablecer", {
        correo,
        nueva_contraseña: nueva1,
      });
      showToast(
        data?.mensaje || "Contraseña actualizada. Ya puedes iniciar sesión.",
        "success"
      );
      setForgotStep(0);
      setRecoveryData({ correo: "", codigo: "", nueva1: "", nueva2: "" });
    } catch (err) {
      showToast(err.response?.data?.mensaje || "Error al restablecer.", "error");
    } finally {
      setRecoveryLoading(false);
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

              <p
                className="forgot-link"
                onClick={() => setForgotStep(1)}
                style={{ cursor: "pointer", textDecoration: "underline" }}
              >
                ¿Olvidaste tu usuario y/o contraseña?
              </p>
            </form>
          ) : (
            <Register onShowLogin={() => setActiveTab("login")} />
          )}
        </div>
      </div>

      {/* Toast flotante */}
      {toast.show && (
        <div
          className={`toast-box ${toast.type === "error" ? "error" : "success"}`}
          onClick={() => setToast({ show: false, message: "", type: "success" })}
        >
          {toast.message}
        </div>
      )}

      {/* Modal de acceso denegado */}
      {modal.show && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Acceso denegado</h3>
            <p>{modal.message}</p>
            <button onClick={() => setModal({ show: false, message: "" })}>
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 🔒 MODALES DE RECUPERACIÓN */}
      {forgotStep > 0 && (
        <div className="modal-overlay">
          <div className="modal-box">
            {/* Paso 1 */}
            {forgotStep === 1 && (
              <>
                <h3>Recuperar contraseña</h3>
                <p>Ingresa tu correo o usuario registrado</p>
                <form onSubmit={sendRecoveryCode}>
                  <input
                    type="text"
                    name="correo"
                    placeholder="Correo o usuario"
                    value={recoveryData.correo}
                    onChange={handleRecoveryChange}
                    required
                    className="input-field"
                  />
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setForgotStep(0)}
                      disabled={recoveryLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={recoveryLoading}
                    >
                      {recoveryLoading ? "Enviando..." : "Enviar código"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Paso 2 */}
            {forgotStep === 2 && (
              <>
                <h3>Verificar código</h3>
                <p>Revisa tu correo y escribe el código recibido</p>
                <form onSubmit={verifyRecoveryCode}>
                  <input
                    type="text"
                    name="codigo"
                    placeholder="Código de 6 dígitos"
                    value={recoveryData.codigo}
                    onChange={handleRecoveryChange}
                    maxLength={6}
                    required
                    className="input-field"
                  />
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setForgotStep(1)}
                      disabled={recoveryLoading}
                    >
                      Atrás
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={recoveryLoading}
                    >
                      {recoveryLoading ? "Verificando..." : "Verificar código"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {/* Paso 3 */}
            {forgotStep === 3 && (
              <>
                <h3>Restablecer contraseña</h3>
                <p>Ingresa tu nueva contraseña y confírmala</p>
                <form onSubmit={resetPassword}>
                  <input
                    type="password"
                    name="nueva1"
                    placeholder="Nueva contraseña"
                    value={recoveryData.nueva1}
                    onChange={handleRecoveryChange}
                    required
                    className="input-field"
                  />
                  <input
                    type="password"
                    name="nueva2"
                    placeholder="Confirmar contraseña"
                    value={recoveryData.nueva2}
                    onChange={handleRecoveryChange}
                    required
                    className="input-field"
                  />
                  <div className="actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setForgotStep(0)}
                      disabled={recoveryLoading}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={recoveryLoading}
                    >
                      {recoveryLoading ? "Guardando..." : "Cambiar contraseña"}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
