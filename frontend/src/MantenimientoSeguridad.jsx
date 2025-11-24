// src/MantenimientoSeguridad.jsx
import { useEffect, useState } from "react";
import api from "./api";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./mantenimientoSeguridad.css";

export default function MantenimientoSeguridad() {
  const [parametros, setParametros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [savingCodigo, setSavingCodigo] = useState(null);

  // Cargar parámetros al entrar
  const cargarParametros = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/seguridad/parametros");
      setParametros(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando parámetros de seguridad:", error);
      toast.error(
        error.response?.data?.mensaje ||
          "Error al cargar parámetros de seguridad"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarParametros();
  }, []);

  // Cambiar valor en memoria
  const handleChangeValor = (id_parametro, nuevoValor) => {
    setParametros((prev) =>
      prev.map((p) =>
        p.id_parametro === id_parametro ? { ...p, valor: nuevoValor } : p
      )
    );
  };

  // Guardar un parámetro
  const guardarParametro = async (codigo) => {
    const param = parametros.find((p) => p.codigo === codigo);
    if (!param) return;

    if (param.valor === "" || param.valor == null) {
      toast.warning("El valor no puede estar vacío");
      return;
    }

    try {
      setSavingCodigo(codigo);
      await api.put(`/seguridad/parametros/${codigo}`, {
        valor: param.valor,
      });

      toast.success("Parámetro actualizado correctamente");
      // Opcional refrescar
      // await cargarParametros();
    } catch (error) {
      console.error("Error guardando parámetro:", error);
      toast.error(
        error.response?.data?.mensaje ||
          "Error al actualizar el parámetro"
      );
    } finally {
      setSavingCodigo(null);
    }
  };

  return (
    <div className="seguridad-wrap">
      <ToastContainer position="bottom-right" />

      <header className="seguridad-header">
        <div className="seguridad-logo">
          <img src={logoDGMM} alt="DGMM" />
        </div>
        <div>
          <h2>Módulo de Seguridad</h2>
          <p>Parámetros de seguridad del sistema</p>
        </div>
      </header>

      <section className="seguridad-card">
        <div className="seguridad-card-header">
          <h3>Configuración de parámetros</h3>
          {loading && <span className="seguridad-tag">Cargando...</span>}
        </div>

        {parametros.length === 0 && !loading ? (
          <div className="seguridad-empty">No hay parámetros configurados.</div>
        ) : (
          <div className="seguridad-table-wrap">
            <table className="seguridad-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Valor</th>
                  <th>Descripción</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {parametros.map((p) => (
                  <tr key={p.id_parametro}>
                    <td className="seguridad-codigo">{p.codigo}</td>
                    <td>{p.nombre}</td>
                    <td>
                      <input
                        className="seguridad-input"
                        value={p.valor ?? ""}
                        onChange={(e) =>
                          handleChangeValor(p.id_parametro, e.target.value)
                        }
                      />
                    </td>
                    <td className="seguridad-descripcion">
                      {p.descripcion || "-"}
                    </td>
                    <td>
                      <button
                        className="seguridad-btn-guardar"
                        onClick={() => guardarParametro(p.codigo)}
                        disabled={savingCodigo === p.codigo}
                      >
                        {savingCodigo === p.codigo ? "Guardando..." : "Guardar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
