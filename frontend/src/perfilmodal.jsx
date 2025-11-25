import { useEffect, useRef, useState } from "react";
import { FaPen } from "react-icons/fa";
import api from "./api"; // axios con baseURL y withCredentials = true
import "./perfil.css";

export default function PerfilModal({ open, onClose, onSaved }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: "",
    correo: "",
    nombre_usuario: "",
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
        <h2 id="mm-title" className="mm-title">Configuración de Perfil</h2>

        {loading ? (
          <div className="mm-loading">Cargando…</div>
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
              onClick={() => alert("Esta sección cambia la contraseña en otra pantalla.")}
            >
              Cambiar Contraseña
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
