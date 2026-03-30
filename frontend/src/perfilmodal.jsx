import { useEffect, useRef, useState } from "react";
import { FaPen, FaEye, FaEyeSlash } from "react-icons/fa";
import api from "./api"; // axios con baseURL y withCredentials = true
import "./perfil.css";

export default function PerfilModal({ open, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    nombre_usuario: "",
  });

  const [pwdForm, setPwdForm] = useState({
    actual: "",
    nueva1: "",
    nueva2: "",
  });

  const [showPwd, setShowPwd] = useState({
    actual: false,
    nueva1: false,
    nueva2: false,
  });

  const dialogRef = useRef(null);

  // Cargar perfil cuando se abre
  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/me");
        setForm({
          nombre: data.nombre || "",
          correo: data.correo || "",
          nombre_usuario: data.nombre_usuario || "",
        });
      } catch (e) {
        console.error("Error cargando perfil:", e);
        alert("No se pudo cargar tu perfil");
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  // Cerrar con ESC o click en overlay
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onChangePwd = (e) => {
    const { name, value } = e.target;
    setPwdForm((f) => ({ ...f, [name]: value }));
  };

  const toggleShow = (field) => {
    setShowPwd((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const validar = () => {
    if (!form.nombre.trim()) return "El nombre no puede estar vacío.";
    if (!form.nombre_usuario.trim()) return "El nombre de usuario no puede estar vacío.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.correo.trim()))
      return "El correo no es válido.";
    return null;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const err = validar();
    if (err) return alert(err);

    setSaving(true);
    try {
      await api.put("/me", {
        nombre: form.nombre.trim(),
        nombre_usuario: form.nombre_usuario.trim(),
        correo: form.correo.trim().toLowerCase(),
      });
      onSaved?.(); 
      onClose?.();
    } catch (e) {
      const msg = e?.response?.data?.mensaje || "Error al guardar.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const validarPassword = () => {
    if (!pwdForm.actual.trim() || !pwdForm.nueva1.trim() || !pwdForm.nueva2.trim()) {
      return "Todos los campos son obligatorios.";
    }
    if (pwdForm.nueva1 !== pwdForm.nueva2) {
      return "La nueva contraseña y su confirmación no coinciden.";
    }
    if (pwdForm.nueva1.length < 6) {
      return "La nueva contraseña debe tener al menos 6 caracteres.";
    }
    return null;
  };

  const onSubmitPassword = async (e) => {
    e.preventDefault();
    const err = validarPassword();
    if (err) return alert(err);

    setSaving(true);
    try {
      const { data } = await api.post("/me/password", {
        actual: pwdForm.actual.trim(),
        nueva1: pwdForm.nueva1.trim(),
        nueva2: pwdForm.nueva2.trim(),
      });
      alert(data?.mensaje || "Contraseña actualizada correctamente.");
      setPwdForm({ actual: "", nueva1: "", nueva2: "" });
      setChangingPassword(false);
    } catch (e) {
      const msg = e?.response?.data?.mensaje || "Error al actualizar la contraseña.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="mm-overlay" onMouseDown={onClose}>
      <div
        className="mm-modal"
        ref={dialogRef}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-title"
      >
        <h2 id="mm-title" className="mm-title">
          {changingPassword ? "Cambiar Contraseña" : "Configuración de Perfil"}
        </h2>

        {loading ? (
          <div className="mm-loading">Cargando…</div>
        ) : changingPassword ? (
          <form onSubmit={onSubmitPassword} className="mm-form">
            <label className="mm-label">Contraseña Actual</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                type={showPwd.actual ? "text" : "password"}
                name="actual"
                value={pwdForm.actual}
                onChange={onChangePwd}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="mm-pen"
                onClick={() => toggleShow("actual")}
                aria-label={showPwd.actual ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd.actual ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <label className="mm-label">Nueva Contraseña</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                type={showPwd.nueva1 ? "text" : "password"}
                name="nueva1"
                value={pwdForm.nueva1}
                onChange={onChangePwd}
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="mm-pen"
                onClick={() => toggleShow("nueva1")}
                aria-label={showPwd.nueva1 ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd.nueva1 ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <label className="mm-label">Confirmar Nueva Contraseña</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                type={showPwd.nueva2 ? "text" : "password"}
                name="nueva2"
                value={pwdForm.nueva2}
                onChange={onChangePwd}
                autoComplete="new-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="mm-pen"
                onClick={() => toggleShow("nueva2")}
                aria-label={showPwd.nueva2 ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPwd.nueva2 ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            <div className="mm-actions">
              <button
                type="button"
                className="mm-btn mm-btn-outline"
                onClick={() => {
                  setChangingPassword(false);
                  setPwdForm({ actual: "", nueva1: "", nueva2: "" });
                }}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="submit" className="mm-btn mm-btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Cambiar Contraseña"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={onSubmit} className="mm-form">
            {/* Nombre completo */}
            <label className="mm-label">Nombre Completo</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                name="nombre"
                value={form.nombre}
                onChange={onChange}
                autoComplete="name"
                placeholder="Juan Pérez"
              />
              <FaPen className="mm-pen" aria-hidden />
            </div>

            {/* Correo */}
            <label className="mm-label">Correo Electrónico</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                type="email"
                name="correo"
                value={form.correo}
                onChange={onChange}
                autoComplete="email"
                placeholder="juan.perez@marinamerchant.gob.hn"
              />
              <FaPen className="mm-pen" aria-hidden />
            </div>

            {/* Usuario */}
            <label className="mm-label">Nombre de Usuario</label>
            <div className="mm-input-wrap">
              <input
                className="mm-input"
                name="nombre_usuario"
                value={form.nombre_usuario}
                onChange={onChange}
                autoComplete="username"
                placeholder="juan_perez_hn"
              />
              <FaPen className="mm-pen" aria-hidden />
            </div>

            <div className="mm-actions">
              <button type="button" className="mm-btn mm-btn-outline" onClick={onClose}>
                Cancelar
              </button>
              <button type="submit" className="mm-btn mm-btn-primary" disabled={saving}>
                {saving ? "Guardando…" : "Guardar Cambios"}
              </button>
            </div>

            <button
              type="button"
              className="mm-link"
              onClick={() => setChangingPassword(true)}
            >
              Cambiar Contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
