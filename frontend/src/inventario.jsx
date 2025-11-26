// src/Inventario.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "./api";
import "./inventario.css";
import { FaSyncAlt } from "react-icons/fa";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const U = (s = "") => String(s).trim().toUpperCase();

export default function Inventario() {
  const navigate = useNavigate();

  const [inventario, setInventario] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filtros
  const [filtros, setFiltros] = useState({
    producto: "",
    soloAlertas: false, // BAJO / ALTO
  });

  // Modal Kardex
  const [showModal, setShowModal] = useState(false);
  const [productoSel, setProductoSel] = useState(null);
  const [movimientos, setMovimientos] = useState([]);
  const [loadingMovs, setLoadingMovs] = useState(false);

  // Modal Movimientos (Kardex completo)
  const [showModalMovimientos, setShowModalMovimientos] = useState(false);
  const [kardexCompleto, setKardexCompleto] = useState([]);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [filtrosKardex, setFiltrosKardex] = useState({
    producto: "",
    tipo: "",
    usuario: "",
    fecha: "",
  });

  const usuarioData = JSON.parse(localStorage.getItem("usuarioData") || "{}");

  // ==========================
  //   CARGAR INVENTARIO
  // ==========================
  const cargarInventario = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        id_usuario: usuarioData.id_usuario,
        usuario: usuarioData.nombre_usuario,
      };

      const res = await api.get("/inventario", { params });
      setInventario(res.data || []);
    } catch (e) {
      console.error("Error cargando inventario:", e);
      setError({
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  useEffect(() => {
    const handler = () => cargarInventario();
    window.addEventListener("dataChanged", handler);
    return () => window.removeEventListener("dataChanged", handler);
  }, []);

  // ==========================
  //   VER MÁS (KÁRDEX)
  // ==========================
  const abrirKardex = async (row) => {
    setProductoSel(row);
    setShowModal(true);
    setLoadingMovs(true);
    setMovimientos([]);

    try {
      const params = {
        id_usuario: usuarioData.id_usuario,
        usuario: usuarioData.nombre_usuario,
      };

      const res = await api.get(`/kardex/producto/${row.id_producto}`, {
        params,
      });
      setMovimientos(res.data || []);
    } catch (e) {
      console.error("Error cargando kardex del producto:", e);
    } finally {
      setLoadingMovs(false);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setProductoSel(null);
    setMovimientos([]);
  };

  // ==========================
  //   MODAL MOVIMIENTOS (KARDEX COMPLETO)
  // ==========================
  const abrirMovimientos = async () => {
    setShowModalMovimientos(true);
    setLoadingKardex(true);
    setKardexCompleto([]);

    try {
      const res = await api.get("/kardex");
      setKardexCompleto(res.data || []);
    } catch (e) {
      console.error("Error cargando kardex completo:", e);
    } finally {
      setLoadingKardex(false);
    }
  };

  const cerrarMovimientos = () => {
    setShowModalMovimientos(false);
    setKardexCompleto([]);
    setFiltrosKardex({ producto: "", tipo: "", usuario: "", fecha: "" });
  };

  const aplicarFiltroKardex = (item) => {
    const { producto, tipo, usuario, fecha } = filtrosKardex;

    return (
      (!producto ||
        item.producto?.toLowerCase().includes(producto.toLowerCase())) &&
      (!tipo || item.tipo_movimiento === tipo) &&
      (!usuario || item.usuario?.toLowerCase().includes(usuario.toLowerCase())) &&
      (!fecha ||
        new Date(item.fecha).toLocaleDateString('en-CA') === fecha)
    );
  };

  const kardexFiltrado = kardexCompleto.filter(aplicarFiltroKardex);

  const generarPDFMovimientos = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "A4" });

    doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(14, 42, 59);
    doc.text("Dirección General de la Marina Mercante", 170, 50);

    doc.setFontSize(14);
    doc.text("Reporte de Movimientos (Kardex)", 170, 72);

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

    const columnas = ["Fecha", "Producto", "Tipo", "Cantidad", "Usuario", "Motivo"];

    const filas = kardexFiltrado.map((k) => [
      new Date(k.fecha).toLocaleDateString('en-CA'),
      k.producto,
      k.tipo_movimiento,
      k.cantidad,
      k.usuario,
      k.motivo || "",
    ]);

    autoTable(doc, {
      startY: 125,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [242, 245, 247] }
    });

    const h = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(
      "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
      doc.internal.pageSize.width / 2,
      h - 30,
      { align: "center" }
    );

    doc.save("Movimientos_Kardex_DGMM.pdf");
  };

  // ==========================
  //   MENSAJE + PROGRESO
  // ==========================
  function buildRowWithInfo(row) {
    const cant = Number(row.cantidad ?? 0);
    const min = Number(row.cantidad_minima ?? 0);
    const max = Number(row.cantidad_maxima ?? 0);
    const estado = U(row.estado || "");

    let mensaje = "";
    if (cant < min) {
      mensaje = `Bajo stock: ${cant} < mínimo (${min}).`;
    } else if (cant > max) {
      mensaje = `Stock al tope o superior: ${cant} ≥ máximo (${max}).`;
    } else {
      mensaje = `Dentro del rango (${min}–${max}).`;
    }

    let porcentaje = 0;
    if (max > 0) {
      porcentaje = Math.round((cant / max) * 100);
      if (porcentaje < 0) porcentaje = 0;
      if (porcentaje > 100) porcentaje = 100;
    }

    return {
      ...row,
      estadoUpper: estado,
      mensaje,
      porcentaje,
    };
  }

  // Construir filas con info extra
  const filasBase = (inventario || []).map(buildRowWithInfo);

  // ==========================
  //   FILTROS
  // ==========================
  const aplicarFiltro = (row) => {
    const { producto, soloAlertas } = filtros;

    if (
      producto &&
      !String(row.nombre_producto || "")
        .toLowerCase()
        .includes(producto.toLowerCase())
    ) {
      return false;
    }

    if (
      soloAlertas &&
      row.estadoUpper !== "BAJO" &&
      row.estadoUpper !== "ALTO"
    ) {
      return false;
    }

    return true;
  };

  const filas = filasBase.filter(aplicarFiltro);

  // ==========================
  //   PDF INVENTARIO
  // ==========================
  const generatePDF = () => {
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "A4" });

      // Logo y encabezado
      doc.addImage(logoDGMM, "PNG", 40, 25, 120, 60);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(14, 42, 59);
      doc.text("Dirección General de la Marina Mercante", 250, 50);

      doc.setFontSize(14);
      doc.text("Reporte de Inventario", 250, 72);

      doc.setFontSize(10);
      doc.setTextColor(80);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 40, 105);

      const columnas = ["Producto", "Cantidad", "Mínimo", "Máximo", "Estado", "Mensaje"];

      const body = filas.map((r) => [
        String(r.nombre_producto ?? ""),
        String(r.cantidad ?? ""),
        String(r.cantidad_minima ?? ""),
        String(r.cantidad_maxima ?? ""),
        String(r.estadoUpper ?? ""),
        String(r.mensaje ?? ""),
      ]);

      autoTable(doc, {
        startY: 125,
        head: [columnas],
        body: body,
        styles: { fontSize: 9, cellPadding: 5 },
        headStyles: { fillColor: [14, 42, 59], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [242, 245, 247] }
      });

      const h = doc.internal.pageSize.height;
      doc.setFontSize(9);
      doc.setTextColor(100);
      doc.text(
        "Dirección General de la Marina Mercante – Sistema Interno DGMM © 2025",
        doc.internal.pageSize.width / 2,
        h - 30,
        { align: "center" }
      );

      doc.save("Inventario_DGMM.pdf");
    } catch (e) {
      console.error("Error generando PDF:", e);
      alert("Error al generar PDF. Revisa la consola.");
    }
  };

  // ==========================
  //   RENDER
  // ==========================
  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap">
        <img src={logoDGMM} alt="DGMM" />
      </div>

      <div className="inventario-topbar">
        <span className="topbar-title">Inventario</span>
        <div className="topbar-actions">
          <button
            className="btn btn-topbar-outline"
            onClick={abrirMovimientos}
          >
            📊 Movimientos
          </button>
          <button
            className="btn btn-topbar-outline"
            onClick={() => navigate("/dashboard")}
          >
            ← Menú
          </button>
          <button
            className="btn btn-topbar-outline"
            onClick={cargarInventario}
            style={{ marginLeft: 8 }}
          >
            <FaSyncAlt /> Refrescar
          </button>
          <button
            className="btn btn-topbar-outline"
            onClick={generatePDF}
            style={{ marginLeft: 8 }}
          >
            📄 Generar PDF
          </button>
        </div>
      </div>

      <div className="inventario-card">
        {/* Leyenda de colores */}
        <div className="inv-legend">
          <strong>Rango de colores:</strong>{" "}
          <span className="legend-rojo">Rojo = Bajo</span>,{" "}
          <span className="legend-verde">Verde = Alto</span>,{" "}
          <span className="legend-ambar">Ámbar = Normal</span>.
        </div>

        {error && (
          <div className="inventario-error">
            <strong>Error cargando datos:</strong>
            <div>Mensaje: {String(error.message)}</div>
            <div>URL: {error.url || "-"}</div>
            <div>Estado: {error.status || "-"}</div>
            <div className="inventario-error-json">
              {JSON.stringify(error.data, null, 2)}
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="inventario-filtros">
          <input
            placeholder="Buscar producto..."
            value={filtros.producto}
            onChange={(e) =>
              setFiltros({ ...filtros, producto: e.target.value })
            }
          />
          <label className="checkbox-inline">
            <input
              type="checkbox"
              checked={filtros.soloAlertas}
              onChange={(e) =>
                setFiltros({ ...filtros, soloAlertas: e.target.checked })
              }
            />
            <span>Solo alertas (BAJO/ALTO)</span>
          </label>
        </div>

        {loading ? (
          <p className="loading">Cargando inventario...</p>
        ) : (
          <table className="inventario-table inv-style2">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Mín</th>
                <th>Máx</th>
                <th>Estado</th>
                <th>Mensaje</th>
                <th>Progreso</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f) => (
                <tr
                  key={f.id_inventario}
                  className={`row-estado-${
                    f.estadoUpper ? f.estadoUpper.toLowerCase() : "normal"
                  }`}
                >
                  <td>{f.nombre_producto}</td>
                  <td>{f.cantidad}</td>
                  <td>{f.cantidad_minima}</td>
                  <td>{f.cantidad_maxima}</td>
                  <td>
                    <span
                      className={`estado-chip estado-${f.estadoUpper.toLowerCase()}`}
                    >
                      {f.estadoUpper}
                    </span>
                  </td>
                  <td>{f.mensaje}</td>
                  <td>
                    <div className="inv-progress">
                      <div
                        className={`inv-progress-bar estado-${f.estadoUpper.toLowerCase()}`}
                        style={{ width: `${f.porcentaje}%` }}
                      />
                    </div>
                  </td>
                  <td>
                    <button
                      className="btn btn-topbar-outline btn-sm"
                      onClick={() => abrirKardex(f)}
                    >
                      Ver más
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && filas.length === 0 && (
                <tr>
                  <td colSpan={8} className="no-data">
                    No hay registros de inventario.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL KÁRDEX POR PRODUCTO */}
      {showModal && (
        <div
          className="inv-modal-overlay"
          onClick={cerrarModal}
        >
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="inv-modal-header">
              <h3>
                Movimientos de:{" "}
                {productoSel ? productoSel.nombre_producto : ""}
              </h3>
              <button className="inv-modal-close" onClick={cerrarModal}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              {loadingMovs ? (
                <p>Cargando movimientos...</p>
              ) : movimientos.length === 0 ? (
                <p>No hay movimientos en el Kardex para este producto.</p>
              ) : (
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Movimiento</th>
                      <th>Cantidad</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((m) => (
                      <tr key={m.id_kardex}>
                        <td>
                          {m.fecha
                            ? new Date(m.fecha).toLocaleString("es-HN")
                            : ""}
                        </td>
                        <td>{m.usuario || m.nombre_usuario || m.id_usuario}</td>
                        <td>{U(m.tipo_movimiento)}</td>
                        <td>{m.cantidad}</td>
                        <td>{m.motivo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="inv-modal-footer">
              <button
                className="btn btn-topbar-outline"
                onClick={cerrarModal}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOVIMIENTOS (KARDEX COMPLETO) */}
      {showModalMovimientos && (
        <div
          className="inv-modal-overlay"
          onClick={cerrarMovimientos}
        >
          <div
            className="inv-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 1200 }}
          >
            <div className="inv-modal-header">
              <h3>Movimientos de Inventario (Kardex)</h3>
              <button className="inv-modal-close" onClick={cerrarMovimientos}>
                ✕
              </button>
            </div>

            <div className="inv-modal-body">
              {/* Filtros */}
              <div className="inventario-filtros" style={{ marginBottom: 20 }}>
                <input
                  placeholder="Filtrar por producto"
                  value={filtrosKardex.producto}
                  onChange={(e) => setFiltrosKardex({ ...filtrosKardex, producto: e.target.value })}
                />

                <select
                  value={filtrosKardex.tipo}
                  onChange={(e) => setFiltrosKardex({ ...filtrosKardex, tipo: e.target.value })}
                >
                  <option value="">Tipo (Todos)</option>
                  <option value="entrada">Entrada</option>
                  <option value="salida">Salida</option>
                </select>

                <input
                  placeholder="Filtrar por usuario"
                  value={filtrosKardex.usuario}
                  onChange={(e) => setFiltrosKardex({ ...filtrosKardex, usuario: e.target.value })}
                />

                <input
                  type="date"
                  value={filtrosKardex.fecha}
                  onChange={(e) => setFiltrosKardex({ ...filtrosKardex, fecha: e.target.value })}
                />

                <button
                  className="btn btn-topbar-outline"
                  onClick={() => setFiltrosKardex({ producto: "", tipo: "", usuario: "", fecha: "" })}
                >
                  Limpiar
                </button>
              </div>

              {/* Tabla de Kardex */}
              {loadingKardex ? (
                <p>Cargando movimientos...</p>
              ) : kardexFiltrado.length === 0 ? (
                <p>No hay movimientos registrados.</p>
              ) : (
                <table className="inventario-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Usuario</th>
                      <th>Motivo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {kardexFiltrado.map((k, idx) => (
                      <tr key={idx}>
                        <td>{new Date(k.fecha).toLocaleString("es-HN")}</td>
                        <td>{k.producto}</td>
                        <td>{U(k.tipo_movimiento)}</td>
                        <td>{k.cantidad}</td>
                        <td>{k.usuario}</td>
                        <td>{k.motivo || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="inv-modal-footer">
              <button
                className="btn btn-topbar-primary"
                onClick={generarPDFMovimientos}
              >
                📄 Generar PDF
              </button>
              <button
                className="btn btn-topbar-outline"
                onClick={cerrarMovimientos}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

