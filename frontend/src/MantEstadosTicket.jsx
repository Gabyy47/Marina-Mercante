// src/MantEstadosTicket.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import "./tramites.css"; // aquí están las clases tk- (mismo diseño que Tickets)
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { FaEdit, FaTrashAlt } from "react-icons/fa";

/* Normaliza a MAYÚSCULAS */
function normalizeEstado(raw) {
  return String(raw ?? "").trim().toUpperCase();
}

export default function MantEstadosTicket() {
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [nombreEstado, setNombreEstado] = useState("");

  const [filtroNombre, setFiltroNombre] = useState("");

  // para el menú Acciones ▾
  const [openMenuId, setOpenMenuId] = useState(null);

  /* =============== CARGAR ESTADOS =============== */
  const cargar = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/estado_ticket");

      const rows = (Array.isArray(data) ? data : []).map((e) => ({
        ...e,
        estado: normalizeEstado(e.estado),
      }));

      setEstados(rows);
    } catch (e) {
      console.error(e);
      alert("No se pudo cargar la lista de estados de ticket");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  /* =============== FILTRADO =============== */
  const estadosFiltrados = useMemo(() => {
    const q = filtroNombre.trim().toLowerCase();
    if (!q) return estados;
    return estados.filter((e) =>
      String(e.estado || "").toLowerCase().includes(q)
    );
  }, [estados, filtroNombre]);

  const totalEstados = estados.length;

  /* =============== FORMULARIO =============== */
  const abrirNuevo = () => {
    setEditing(null);
    setNombreEstado("");
    setShowForm(true);
  };

  const abrirEditar = (row) => {
    setEditing(row);
    setNombreEstado(row.estado || "");
    setShowForm(true);
  };

  const cerrarForm = () => {
    setShowForm(false);
    setEditing(null);
    setNombreEstado("");
  };

  const guardar = async (e) => {
    e.preventDefault();

    const nombre = normalizeEstado(nombreEstado);

    if (!nombre) {
      alert("El nombre del estado es obligatorio");
      return;
    }

    try {
      setLoading(true);

      if (editing) {
        await api.put(`/estado_ticket/${editing.id_estado_ticket}`, {
          estado: nombre,
        });
        alert("Estado actualizado correctamente");
      } else {
        await api.post("/estado_ticket", { estado: nombre });
        alert("Estado creado correctamente");
      }

      cerrarForm();
      await cargar();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el estado");
    } finally {
      setLoading(false);
    }
  };

  /* =============== ELIMINAR =============== */
  const eliminar = async (row) => {
    if (!window.confirm(`¿Eliminar el estado "${row.estado}"?`)) return;

    try {
      setLoading(true);
      await api.delete(`/estado_ticket/${row.id_estado_ticket}`);
      alert("Estado eliminado correctamente");
      await cargar();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el estado");
    } finally {
      setLoading(false);
    }
  };

  /* =============== RENDER =============== */
  return (
    <div className="tk-root">
      {/* Banner con logo (opcional, mismo estilo tk-brand) */}
      <div className="tk-brand">
      </div>

      {/* ENCABEZADO OSCURO (igual que Tickets/Trámites) */}
      <div className="tk-card-header">
        <div className="tk-card-header__title">ESTADOS DE TICKET</div>
        <div className="tk-card-header__actions">
          <button className="tk-btn tk-btn--primary" onClick={abrirNuevo}>
            + Nuevo estado
          </button>
        </div>
      </div>

      {/* CARD RESUMEN + FILTRO (estilo tk-card / tk-resumen / tk-filters) */}
      <div className="tk-card">
        <div className="tk-resumen">
          <strong>Total estados:</strong> {totalEstados}
        </div>

        <div className="tk-filters">
          <div className="tk-filters-row">
            <div className="tk-field">
              <label>Buscar</label>
              <input
                type="text"
                placeholder="Ej. FINALIZADO, EN_COLA…"
                value={filtroNombre}
                onChange={(e) => setFiltroNombre(e.target.value)}
              />
            </div>

            {/* Relleno para respetar grid de 5 columnas como en Tickets */}
            <div className="tk-field" />
            <div className="tk-field" />
            <div className="tk-field" />

            <div className="tk-field tk-field--actions">
              <button
                className="tk-btn tk-btn--ghost"
                type="button"
                onClick={() => setFiltroNombre("")}
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABLA (mismo estilo que Tickets: tk-tablewrap, tk-table, tk-empty, tk-actions) */}
      <div className="tk-tablewrap">
        <table className="tk-table">
          <thead>
            <tr>
              <th>Nombre del estado</th>
              <th className="col--acciones">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {estadosFiltrados.length === 0 && (
              <tr>
                <td colSpan={2}>
                  <div className="tk-empty">
                    <div className="tk-empty-title">
                      {loading ? "Cargando..." : "Sin registros"}
                    </div>
                    {!loading && (
                      <div className="tk-empty-desc">
                        Agrega un nuevo estado o ajusta el filtro.
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )}

            {estadosFiltrados.map((row) => (
              <tr key={row.id_estado_ticket}>
                <td className="wrap">{row.estado}</td>

                <td className="col--acciones">
                  <div className="tk-actions">
                    <button
                      type="button"
                      className="tk-actions-btn"
                      onClick={() =>
                        setOpenMenuId(
                          openMenuId === row.id_estado_ticket
                            ? null
                            : row.id_estado_ticket
                        )
                      }
                    >
                      Acciones ▾
                    </button>

                    {openMenuId === row.id_estado_ticket && (
                      <div className="tk-actions-menu">
                        {/* Editar */}
                        <button
                          type="button"
                          className="tk-actions-item"
                          onClick={() => {
                            setOpenMenuId(null);
                            abrirEditar(row);
                          }}
                        >
                          <FaEdit style={{ marginRight: 6 }} />
                          Editar
                        </button>

                        {/* Eliminar */}
                        <button
                          type="button"
                          className="tk-actions-item danger"
                          onClick={() => {
                            setOpenMenuId(null);
                            eliminar(row);
                          }}
                        >
                          <FaTrashAlt style={{ marginRight: 6 }} />
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL (mismo estilo tk-overlay / tk-modal / tk-grid / tk-modal-actions) */}
      {showForm && (
        <div className="tk-overlay">
          <div className="tk-modal">
            <h3>{editing ? "Editar estado" : "Nuevo estado"}</h3>

            <form onSubmit={guardar}>
              <div className="tk-grid">
                <div className="tk-field tk-field--col">
                  <label>Nombre del estado *</label>
                  <input
                    type="text"
                    value={nombreEstado}
                    onChange={(e) => setNombreEstado(e.target.value)}
                    placeholder="Ej. EN_COLA, FINALIZADO…"
                    required
                  />
                </div>
              </div>

              <div className="tk-modal-actions">
                <button
                  type="submit"
                  className="tk-btn tk-btn--primary"
                  disabled={loading}
                >
                  Guardar
                </button>

                <button
                  type="button"
                  className="tk-btn tk-btn--ghost"
                  onClick={cerrarForm}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", marginTop: 8 }}>Procesando...</div>
      )}
    </div>
  );
}