// src/MantenimientoPermisos.jsx
import { useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import api from "./api";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import "./mantenimientoPermisos.css"; // luego lo hacemos simple

const Permisos = () => {
  const [roles, setRoles] = useState([]);
  const [objetos, setObjetos] = useState([]);
  const [rolSeleccionado, setRolSeleccionado] = useState("");
  const [permisos, setPermisos] = useState([]); // filas por objeto
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ================= CARGA INICIAL =================
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        // Ajusta las rutas a como ya las tengas
        const [rRoles, rObjs] = await Promise.all([
          api.get("/roles"),       // SELECT * FROM tbl_rol
          api.get("/objetos"),     // SELECT * FROM tbl_objeto
        ]);

        setRoles(Array.isArray(rRoles.data) ? rRoles.data : []);
        setObjetos(Array.isArray(rObjs.data) ? rObjs.data : []);
      } catch (err) {
        console.error("Error cargando roles/objetos:", err);
        toast.error("Error al cargar roles u objetos");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, []);

  // ================= CARGAR PERMISOS DE UN ROL =================
  useEffect(() => {
    if (!rolSeleccionado) {
      setPermisos([]);
      return;
    }

    const cargarPermisosDeRol = async () => {
      try {
        setLoading(true);
        // Endpoint esperado: GET /seguridad/permisos?id_rol=#
        const { data } = await api.get("/seguridad/permisos", {
          params: { id_rol: rolSeleccionado },
        });

        const list = Array.isArray(data) ? data : [];

        // Mapeamos por id_objeto para mezclar con lista de objetos
        const mapa = {};
        list.forEach((p) => {
          mapa[p.id_objeto] = p;
        });

        // Construimos filas: una por objeto
        const filas = objetos.map((obj) => {
          const previo = mapa[obj.id_objeto] || {};
          return {
            id_objeto: obj.id_objeto,
            nombre_objeto: obj.nombre_objeto,
            puede_insertar: previo.puede_insertar === 1,
            puede_eliminar: previo.puede_eliminar === 1,
            puede_actualizar: previo.puede_actualizar === 1,
            puede_consultar: previo.puede_consultar === 1 || previo.puede_consultar === undefined,
          };
        });

        setPermisos(filas);
      } catch (err) {
        console.error("Error cargando permisos:", err);
        toast.error("Error al cargar permisos del rol");
      } finally {
        setLoading(false);
      }
    };

    cargarPermisosDeRol();
  }, [rolSeleccionado, objetos]);

  // ================= HANDLERS =================
  const handleCheck = (id_objeto, campo) => {
    setPermisos((prev) =>
      prev.map((row) =>
        row.id_objeto === id_objeto
          ? { ...row, [campo]: !row[campo] }
          : row
      )
    );
  };

  const handleGuardar = async () => {
    if (!rolSeleccionado) {
      toast.warn("Selecciona un rol primero");
      return;
    }

    try {
      setSaving(true);

      // armamos payload: 1 y 0 para MySQL
      const payload = {
        id_rol: Number(rolSeleccionado),
        permisos: permisos.map((p) => ({
          id_objeto: p.id_objeto,
          puede_insertar: p.puede_insertar ? 1 : 0,
          puede_eliminar: p.puede_eliminar ? 1 : 0,
          puede_actualizar: p.puede_actualizar ? 1 : 0,
          puede_consultar: p.puede_consultar ? 1 : 0,
        })),
      };

      // Endpoint esperado: POST /seguridad/permisos/guardar
      await api.post("/seguridad/permisos/guardar", payload);

      toast.success("Permisos guardados correctamente");
    } catch (err) {
      console.error("Error guardando permisos:", err);
      toast.error(
        err.response?.data?.mensaje || "Error al guardar permisos"
      );
    } finally {
      setSaving(false);
    }
  };

  const rolNombre = useMemo(
    () =>
      roles.find((r) => String(r.id_rol) === String(rolSeleccionado))
        ?.nombre || "",
    [roles, rolSeleccionado]
  );

  // ================= RENDER =================
  return (
    <div className="perm-page">
      <ToastContainer position="bottom-right" />

      <header className="perm-header">
        <div className="perm-logo">
          <img src={logoDGMM} alt="DGMM" />
          <span>Módulo de Seguridad</span>
        </div>
        <h2>Configuración de Accesos por Rol</h2>
      </header>

      <section className="perm-card">
        <div className="perm-filtros">
          <label>
            Rol:
            <select
              value={rolSeleccionado}
              onChange={(e) => setRolSeleccionado(e.target.value)}
            >
              <option value="">-- Selecciona un rol --</option>
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </label>

          <button
            className="perm-btn-primary"
            disabled={!rolSeleccionado || saving}
            onClick={handleGuardar}
          >
            {saving ? "Guardando..." : "Guardar permisos"}
          </button>
        </div>

        {rolSeleccionado && (
          <p className="perm-help">
            Estás configurando permisos para el rol:{" "}
            <strong>{rolNombre}</strong>
          </p>
        )}

        {loading && <p>Cargando datos...</p>}

        {!loading && rolSeleccionado && (
          <div className="perm-table-wrap">
            <table className="perm-table">
              <thead>
                <tr>
                  <th>Objeto / Pantalla</th>
                  <th>Insertar</th>
                  <th>Eliminar</th>
                  <th>Actualizar</th>
                  <th>Consultar</th>
                </tr>
              </thead>
              <tbody>
                {permisos.map((row) => (
                  <tr key={row.id_objeto}>
                    <td>{row.nombre_objeto}</td>
                    {["puede_insertar", "puede_eliminar", "puede_actualizar", "puede_consultar"].map(
                      (campo) => (
                        <td key={campo} className="perm-check-cell">
                          <input
                            type="checkbox"
                            checked={row[campo]}
                            onChange={() =>
                              handleCheck(row.id_objeto, campo)
                            }
                          />
                        </td>
                      )
                    )}
                  </tr>
                ))}

                {permisos.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center" }}>
                      No hay objetos configurados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {!rolSeleccionado && !loading && (
          <p>Selecciona un rol para ver y editar sus permisos.</p>
        )}
      </section>
    </div>
  );
};

export default Permisos;
