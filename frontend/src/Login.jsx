// src/Login.jsx
import React, { useState, useEffect } from "react"; // Añade useEffect aquí
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
  
  // ====== ESTADOS PARA BLOQUEO POR INTENTOS FALLIDOS ======
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutTime, setLockoutTime] = useState(0);
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_DURATION = 5 * 60 * 1000; // 5 minutos

  // ====== 2FA LOGIN ======
  const [login2FA, setLogin2FA] = useState({
    step: 0,
    id_usuario: null,
    codigo: ""
  });

  // ====== TOAST Y MODALES ======
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [modal, setModal] = useState({ show: false, message: "" });

  // ====== RECUPERACIÓN DE CONTRASEÑA ======
  const [forgotStep, setForgotStep] = useState(0);
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

  // ====== EFECTO PARA CARGAR ESTADO DE BLOQUEO DESDE LOCALSTORAGE ======
  useEffect(() => {
    const savedLockEndTime = localStorage.getItem('lockEndTime');
    const savedFailedAttempts = localStorage.getItem('failedAttempts');
    
    if (savedLockEndTime && savedFailedAttempts) {
      const lockEndTime = parseInt(savedLockEndTime);
      const now = Date.now();
      
      if (now < lockEndTime) {
        // Todavía está bloqueado
        setIsLocked(true);
        setFailedAttempts(parseInt(savedFailedAttempts));
        setLockoutTime(lockEndTime - now);
        
        // Configurar desbloqueo automático
        const timer = setTimeout(() => {
          unlockForm();
        }, lockEndTime - now);
        
        return () => clearTimeout(timer);
      } else {
        // El bloqueo ya expiró
        localStorage.removeItem('lockEndTime');
        localStorage.removeItem('failedAttempts');
      }
    }
  }, []);

  // ====== FUNCIÓN PARA DESBLOQUEAR ======
  const unlockForm = () => {
    setIsLocked(false);
    setFailedAttempts(0);
    setLockoutTime(0);
    localStorage.removeItem('lockEndTime');
    localStorage.removeItem('failedAttempts');
    showToast('Cuenta desbloqueada. Puedes intentar nuevamente.', 'success');
  };

  // ====== FUNCIÓN PARA BLOQUEAR ======
  const lockForm = () => {
    setIsLocked(true);
    const lockEndTime = Date.now() + LOCKOUT_DURATION;
    localStorage.setItem('lockEndTime', lockEndTime);
    localStorage.setItem('failedAttempts', MAX_ATTEMPTS);
    setLockoutTime(LOCKOUT_DURATION);
    
    showToast(`Demasiados intentos fallidos. Cuenta bloqueada por 5 minutos.`, 'error');
    
    // Configurar desbloqueo automático
    setTimeout(() => {
      unlockForm();
    }, LOCKOUT_DURATION);
  };

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
    
    // VERIFICAR SI ESTÁ BLOQUEADO
    if (isLocked) {
      const remainingMinutes = Math.ceil(lockoutTime / 60000);
      showToast(`Cuenta bloqueada. Espera ${remainingMinutes} minutos.`, "error");
      return;
    }
    
    if (!formData.nombre_usuario || !formData.contraseña) {
      showToast("Completa usuario y contraseña.", "error");
      return;
    }

    setLoading(true);

    try {
      const { data } = await api.post("/login", formData);

      // SI EL LOGIN ES EXITOSO, RESETEAR INTENTOS FALLIDOS
      if (data?.requiereCodigo) {
        // Resetear intentos fallidos en caso de éxito parcial
        setFailedAttempts(0);
        localStorage.removeItem('failedAttempts');
        
        showToast(data.mensaje || "Código enviado al correo", "success");
        setLogin2FA({
          step: 1,
          id_usuario: data.id_usuario,
          codigo: ""
        });
        return;
      }
      
      // Asegurarse que viene el token
      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      // Guardar datos del usuario que inició sesión
      if (data?.usuario) {
        localStorage.setItem("mm_user", JSON.stringify(data.usuario));
        localStorage.setItem("usuarioData", JSON.stringify(data.usuario));
      }

      // RESETEAR INTENTOS FALLIDOS AL INICIAR SESIÓN EXITOSAMENTE
      setFailedAttempts(0);
      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockEndTime');

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

      // INCREMENTAR CONTADOR DE INTENTOS FALLIDOS
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);
      localStorage.setItem('failedAttempts', newFailedAttempts);
      
      // VERIFICAR SI ALCANZÓ EL MÁXIMO DE INTENTOS
      if (newFailedAttempts >= MAX_ATTEMPTS) {
        lockForm();
        showToast(`Has alcanzado el máximo de ${MAX_ATTEMPTS} intentos fallidos. Cuenta bloqueada por 5 minutos.`, "error");
      } else {
        const remainingAttempts = MAX_ATTEMPTS - newFailedAttempts;
        showToast(`Credenciales incorrectas. Te quedan ${remainingAttempts} intento(s).`, "error");
      }

      if (status === 403 && msg.includes("No tiene un rol")) {
        setModal({
          show: true,
          message: "No tiene un rol asignado. Comuníquese con el Administrador para que le asigne un rol.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ... (el resto de tus funciones: handleRecoveryChange, sendRecoveryCode, etc. se mantienen igual)
  // ====== RECUPERACIÓN DE CONTRASEÑA ======
  const handleRecoveryChange = (e) => {
    const { name, value } = e.target;
    setRecoveryData((prev) => ({ ...prev, [name]: value }));
  };

  const sendRecoveryCode = async (e) => {
    e.preventDefault();
    const correo = recoveryData.correo.trim();
    if (!correo) return showToast("Ingresa tu correo o usuario.", "error");

    console.log("[FRONT] Enviando a /recuperar-iniciar:", { correo });
    setRecoveryLoading(true);
    try {
      const { data } = await api.post("/recuperar-iniciar", { correo });
      showToast(data?.mensaje || "Código enviado. Revisa tu correo.", "success");
      setForgotStep(2);
    } catch (err) {
      console.error("[FRONT] Error /recuperar-iniciar:", err);
      showToast(err.response?.data?.mensaje || "No se pudo enviar el código.", "error");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const verifyRecoveryCode = async (e) => {
    e.preventDefault();
    const { correo, codigo } = recoveryData;
    if (!codigo || codigo.length !== 6) return showToast("Código inválido.", "error");

    setRecoveryLoading(true);
    try {
      const { data } = await api.post("/recuperar-verificar", { correo, codigo });
      showToast(data?.mensaje || "Código verificado.", "success");
      setForgotStep(3);
    } catch (err) {
      showToast(err.response?.data?.mensaje || "Código incorrecto.", "error");
    } finally {
      setRecoveryLoading(false);
    }
  };

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

  const verifyLoginCode = async (e) => {
    e.preventDefault();

    if (!login2FA.codigo || login2FA.codigo.length !== 6) {
      return showToast("Código inválido.", "error");
    }

    setLoading(true);

    try {
      const { data } = await api.post("/verificar-codigo-login", {
        id_usuario: login2FA.id_usuario,
        codigo: login2FA.codigo
      });

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }

      if (data?.usuario) {
        localStorage.setItem("mm_user", JSON.stringify(data.usuario));
        localStorage.setItem("usuarioData", JSON.stringify(data.usuario));
      }

      // RESETEAR INTENTOS FALLIDOS AL INICIAR SESIÓN EXITOSAMENTE
      setFailedAttempts(0);
      localStorage.removeItem('failedAttempts');
      localStorage.removeItem('lockEndTime');

      showToast("¡Inicio de sesión exitoso!", "success");
      setLogin2FA({ step: 0, id_usuario: null, codigo: "" });

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

    } catch (err) {
      showToast(err.response?.data?.mensaje || "Código incorrecto.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handle2FAChange = (e) => {
    const { value } = e.target;
    if (/^\d*$/.test(value)) {
      setLogin2FA((prev) => ({ ...prev, codigo: value }));
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
                  disabled={isLocked} // DESHABILITAR SI ESTÁ BLOQUEADO
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
                  maxLength={50}
                  autoComplete="current-password"
                  disabled={isLocked} // DESHABILITAR SI ESTÁ BLOQUEADO
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass((s) => !s)}
                  disabled={isLocked} // DESHABILITAR SI ESTÁ BLOQUEADO
                >
                  {showPass ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <button type="submit" disabled={loading || isLocked}>
                {loading ? "Ingresando..." : isLocked ? "Cuenta Bloqueada" : "Ingresa"}
              </button>

              {/* MOSTRAR INTENTOS RESTANTES SI NO ESTÁ BLOQUEADO */}
              {!isLocked && failedAttempts > 0 && (
                <p className="attempts-warning">
                  Intentos restantes: {MAX_ATTEMPTS - failedAttempts} de {MAX_ATTEMPTS}
                </p>
              )}

              {/* MOSTRAR TIEMPO DE BLOQUEO SI ESTÁ BLOQUEADO */}
              {isLocked && (
                <p className="locked-warning">
                  Cuenta bloqueada. Espera {Math.ceil(lockoutTime / 60000)} minuto(s).
                </p>
              )}

              <p
                className="forgot-link"
                onClick={() => !isLocked && setForgotStep(1)}
                style={{ cursor: isLocked ? "not-allowed" : "pointer", textDecoration: "underline", opacity: isLocked ? 0.5 : 1 }}
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

      {/* 🔐 MODAL 2FA LOGIN */}
      {login2FA.step === 1 && (
        <div className="modal-overlay">
          <div className="modal-box">
            <h3>Verificación de seguridad</h3>
            <p>Ingresa el código que enviamos a tu correo</p>

            <form onSubmit={verifyLoginCode}>
              <input
                type="text"
                placeholder="Código de 6 dígitos"
                value={login2FA.codigo}
                onChange={handle2FAChange}
                maxLength={6}
                required
                className="input-field"
              />

              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setLogin2FA({ step: 0, id_usuario: null, codigo: "" })}
                  disabled={loading}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={loading}
                >
                  {loading ? "Verificando..." : "Verificar código"}
                </button>
              </div>
            </form>
          </div>
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