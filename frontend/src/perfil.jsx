import { useEffect, useState } from "react";
import api from "./api"; // axios con baseURL=http://localhost:49146/api y withCredentials:true
import "./perfil.css";

export default function Perfil() {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nombre: "",
    nombre_usuario: "",
    correo: "",
  });

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/me");
        setForm({
          nombre: data.nombre || "",
          nombre_usuario: data.nombre_usuario || "",
          correo: data.correo || "",
        });
      } catch (e) {
        console.error("Error cargando perfil:", e);
        alert("No se pudo cargar tu perfil");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put("/me", form); // Solo enviamos esos 3 campos
      alert("Perfil actualizado.");
    } catch (err) {
      alert(err.response?.data?.mensaje || "Error al actualizar.");
    }
  };

  if (loading) return <p>Cargando…</p>;

  return (
    <form onSubmit={onSubmit} className="perfil-form">
      <h2>Mi perfil</h2>

      <label>Nombre</label>
      <input
        name="nombre"
        value={form.nombre}
        onChange={onChange}
        autoComplete="name"
      />

      <label>Nombre de usuario</label>
      <input
        name="nombre_usuario"
        value={form.nombre_usuario}
        onChange={onChange}
        autoComplete="username"
      />

      <label>Correo</label>
      <input
        type="email"
        name="correo"
        value={form.correo}
        onChange={onChange}
        autoComplete="email"
      />

      {/* No mostrar rol ni contraseña aquí */}
      <button type="submit">Guardar cambios</button>
    </form>
  );
}
