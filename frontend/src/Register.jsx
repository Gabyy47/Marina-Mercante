// src/Register.jsx
import React, { useState } from "react";
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa";
import "./Register.css";
import api from "./api"; // instancia con baseURL y credenciales

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

  // Toast simple
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const showToast = (message, type = "success", duration = 3000) => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), duration);
  };

  // Modal verificación
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  const handleChange = (e) => {
    let { name, value } = e.target;

    // Usuario: MAYÚSCULAS y sin espacios
    if (name === "nombre_usuario") {
      value = value.toUpperCase();
      if (/\s/.test(value)) return;
    }

    // Contraseñas: sin espacios
    if ((name === "contraseña" || name === "confirmar_contraseña") && /\s/.test(value)) {
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Regla de contraseña robusta
  const strongPassword =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#._-])[A-Za-z\d@$!%*?&#._-]{8,}$/;

  const passwordStrong = strongPassword.test(formData.contraseña);
  const passwordsMatch = formData.contraseña === formData.confirmar_contraseña;

  // === REGISTRO ===
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
      const { data } = await api.post("/usuario", {
        nombre: formData.nombre.trim(),
        apellido: formData.apellido.trim(),
        nombre_usuario: formData.nombre_usuario.trim().toUpperCase(),
        correo: formData.correo.trim(),
        contraseña: formData.contraseña,
      });

      const msgBackend =
        data?.mensaje ||
        data?.message ||
        "¡Cuenta creada! Te enviamos un código. Revisa tu correo.";

      // Guarda el correo para usarlo en verificar / reenviar
      setLastEmail(formData.correo.trim());

      // Abre el modal para ingresar el código
      setVerifyOpen(true);
      showToast("✅ Código enviado, revisa tu correo.", "success", 5000);

      // Limpia los campos visibles (opcional)
      setFormData({
        nombre: "",
        apellido: "",
        nombre_usuario: "",
        correo: "",
        contraseña: "",
        confirmar_contraseña: "",
      });
    } catch (error) {
      console.error("Error en registro:", error);
      const raw = error.response?.data?.error || error.response?.data?.mensaje || error.message;

      let msg = raw;
      if (/Duplicate entry/i.test(raw)) {
        if (/correo/i.test(raw)) msg = "Ese correo ya está registrado.";
        else if (/nombre_usuario/i.test(raw)) msg = "Ese nombre de usuario ya existe.";
        else msg = "Registro duplicado. Verifica tus datos.";
      }

      showToast("Error en el registro: " + msg, "error");
    } finally {
      setLoading(false);
    }
  };

  // === VERIFICAR CÓDIGO ===
  const handleVerify = async (e) => {
    e.preventDefault();

    const correo = lastEmail || formData.correo.trim();
    if (!correo) return showToast("Falta el correo para verificar.", "error");

    if (!/^\d{6}$/.test(code)) {
      showToast("El código debe tener 6 dígitos.", "error");
      return;
    }

    setVerifyLoading(true);
    try {
      await api.post("/auth/verify-code", { correo, code });
      showToast("✅ Cuenta verificada.", "success");
      setVerifyOpen(false);
      setCode("");
      onShowLogin?.();
    } catch (error) {
      const msg = error.response?.data?.mensaje || error.response?.data?.error || error.message;
      showToast("No se pudo verificar: " + msg, "error");
    } finally {
      setVerifyLoading(false);
    }
  };

  // === REENVIAR CÓDIGO ===
  const handleResend = async () => {
    const correo = lastEmail || formData.correo.trim();
    if (!correo) return showToast("Escribe tu correo primero.", "error");

    setResendLoading(true);
    try {
      await api.post("/reenviar", { correo });
      showToast("✅ Código reenviado. Revisa tu bandeja.", "success");
    } catch (error) {
      const msg = error.response?.data?.mensaje || error.response?.data?.error || error.message;
      showToast("No se pudo reenviar: " + msg, "error");
    } finally {
      setResendLoading(false);
    }
  };

  // === ENVIAR CÓDIGO (ruta /api/enviar si existe; si no, usa /reenviar) ===
  const handleSend = async () => {
    const correo = lastEmail || formData.correo.trim();
    if (!correo) return showToast("Escribe tu correo primero.", "error");

    setSendLoading(true);
    try {
      await api.post("/enviar", { correo });
      showToast("✅ Código enviado. Revisa tu bandeja.", "success");
    } catch (error) {
      // Fallback si /enviar no existe
      if (error.response?.status === 404) {
        try {
          await api.post("/reenviar", { correo });
          showToast("✅ Código enviado. Revisa tu bandeja.", "success");
        } catch (e2) {
          const m2 = e2.response?.data?.mensaje || e2.response?.data?.error || e2.message;
          showToast("No se pudo enviar: " + m2, "error");
        }
      } else {
        const msg = error.response?.data?.mensaje || error.response?.data?.error || error.message;
        showToast("No se pudo enviar: " + msg, "error");
      }
    } finally {
      setSendLoading(false);
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
            aria-invalid={formData.confirmar_contraseña ? !(formData.contraseña === formData.confirmar_contraseña) : false}
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

        {formData.confirmar_contraseña && formData.contraseña !== formData.confirmar_contraseña && (
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
        <div
          className={`toast ${toast.type === "error" ? "error" : ""}`}
          onClick={() => setToast({ show: false, message: "", type: "success" })}
        >
          {toast.message}
        </div>
      )}

      {/* Modal: Verificar código (incluye Reenviar y Enviar) */}
      {verifyOpen && (
        <div className="code-modal-backdrop">
          <div className="code-modal">
            <h3>Verifica tu correo</h3>
            <p>Ingresa el código de 6 dígitos que te enviamos a <b>{lastEmail}</b>.</p>

            <form onSubmit={handleVerify} className="code-form">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="code-input"
                required
              />

              <div className="code-actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setVerifyOpen(false)}
                  disabled={verifyLoading || resendLoading || sendLoading}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="link-button"
                  onClick={handleResend}
                  disabled={resendLoading || verifyLoading || sendLoading}
                  title="Reenviar el código al mismo correo"
                >
                  {resendLoading ? "Reenviando..." : "Reenviar código"}
                </button>

                <button
                  type="button"
                  className="link-button"
                  onClick={handleSend}
                  disabled={sendLoading || verifyLoading || resendLoading}
                  title="Enviar un nuevo código"
                >
                  {sendLoading ? "Enviando..." : "Enviar código"}
                </button>

                <button
                  type="submit"
                  className="primary"
                  disabled={verifyLoading || code.length !== 6 || resendLoading || sendLoading}
                >
                  {verifyLoading ? "Verificando..." : "Verificar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;
