import React, { useEffect, useMemo, useState } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import api from "./api"; 
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function InventarioStatus() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [onlyAlerts, setOnlyAlerts] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log("🔄 Cargando inventario...");
        
        const response = await api.get("/inventario");
        console.log("✅ Datos recibidos:", response.data);
        
        const transformedData = response.data.map(item => ({
          id_inventario: item.id_inventario,
          nombre_producto: item.nombre_producto,
          cantidad_actual: item.cantidad_actual,
          stock_minimo: item.stock_minimo,
          stock_maximo: item.stock_maximo
        }));
        
        setItems(transformedData);
        
      } catch (err) {
        console.error("❌ Error:", err);
        setError("No se pudo cargar el inventario.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ==== Lógica de estado por item ====
  function getStockStatus(item) {
    const qty = Number(item.cantidad_actual ?? 0);
    const min = item.stock_minimo ?? null;
    const max = item.stock_maximo ?? null;

    if (min != null && qty < min) {
      return {
        level: "BAJO",
        color: "#ef4444",
        bg: "#fee2e2",
        text: `Bajo stock: ${qty} < mínimo (${min}).`,
        rowBg: "#fff1f2",
      };
    }

    if (max != null && qty >= max) {
      return {
        level: "ALTO",
        color: "#22c55e",
        bg: "#dcfce7",
        text: `Stock al tope o superior: ${qty} ≥ máximo (${max}).`,
        rowBg: "#ecfdf5",
      };
    }

    return {
      level: "NORMAL",
      color: "#f59e0b",
      bg: "#fef3c7",
      text: min != null && max != null
        ? `Dentro del rango (${min}–${max}).`
        : "Sin umbrales definidos.",
      rowBg: "transparent",
    };
  }

  // ==== FUNCIÓN PARA GENERAR PDF ====
  const generarPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "A4",
    });

    // -------- ENCABEZADO --------
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Reporte de Estado de Inventario", 40, 40);

    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 40, 60);

    // -------- COLUMNAS --------
    const columnas = [
      "Producto",
      "Cantidad",
      "Mínimo",
      "Máximo",
      "Estado",
      "Mensaje",
    ];

    // -------- FILAS --------
    const filas = filtered.map((it) => {
      const st = getStockStatus(it);
      return [
        it.nombre_producto,
        it.cantidad_actual,
        it.stock_minimo ?? "—",
        it.stock_maximo ?? "—",
        st.level,
        st.text,
      ];
    });

    autoTable(doc, {
      startY: 80,
      head: [columnas],
      body: filas,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [14, 42, 59], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
    });

    // -------- PIE DE PAGINA --------
    const pageHeight = doc.internal.pageSize.height;
    doc.setFontSize(9);
    doc.text(
      "Dirección General de la Marina Mercante — Sistema Interno ©️ 2025",
      300,
      pageHeight - 20,
      { align: "center" }
    );

    doc.save("InventarioStatus_DGMM.pdf");
  };

  // Notificaciones para BAJO/ALTO al cargar
  useEffect(() => {
    if (!items?.length) return;
    const criticals = items
      .map((it) => ({ it, st: getStockStatus(it) }))
      .filter(({ st }) => st.level === "BAJO" || st.level === "ALTO");

    if (!criticals.length) return;

    criticals.forEach(({ it, st }) => {
      const msg = `${it.nombre_producto}: ${st.text}`;
      if (st.level === "BAJO") {
        toast.error(msg, { autoClose: 5000 });
      } else {
        toast.success(msg, { autoClose: 5000 });
      }
    });
  }, [items]);

  const filtered = useMemo(() => {
    let data = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((x) =>
        String(x.nombre_producto).toLowerCase().includes(q)
      );
    }
    if (onlyAlerts) {
      data = data.filter((x) => {
        const st = getStockStatus(x);
        return st.level === "BAJO" || st.level === "ALTO";
      });
    }
    return data;
  }, [items, query, onlyAlerts]);

  // === UI helpers ===
  function Badge({ color, bg, children }) {
    return (
      <span
        style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 700,
          color,
          background: bg,
          border: `1px solid ${color}22`,
        }}
      >
        {children}
      </span>
    );
  }

  function Progress({ value, max = 100, tone = "#9ca3af" }) {
    const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
    return (
      <div style={{ background: "#e5e7eb", height: 8, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: tone }} />
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <ToastContainer position="bottom-right" />

      <h2 style={{ marginBottom: 12 }}>Inventario</h2>
      <p style={{ marginTop: 0, color: "#6b7280" }}>
        Rango de colores: <strong style={{ color: "#ef4444" }}>Rojo</strong> = Bajo, {" "}
        <strong style={{ color: "#22c55e" }}>Verde</strong> = Alto, {" "}
        <strong style={{ color: "#f59e0b" }}>Ámbar</strong> = Normal.
      </p>

      <div style={{ display: "flex", gap: 12, margin: "12px 0 20px", alignItems: "center" }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          style={{
            width: 280,
            padding: "10px 12px",
            border: "1px solid #d1d5db",
            borderRadius: 8,
          }}
        />
        <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} />
          Solo alertas (BAJO/ALTO)
        </label>
        
        {/* BOTÓN PARA GENERAR PDF */}
        <button
          onClick={generarPDF}
          style={{
            padding: "10px 16px",
            backgroundColor: "#1e40af",
            color: "white",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 600,
            marginLeft: "auto"
          }}
        >
          📄 Generar PDF
        </button>
      </div>

      {loading && <div>Cargando inventario...</div>}
      {error && (
        <div style={{ color: "#ef4444", marginBottom: 12 }}>{error}</div>
      )}

      <div style={{
        overflowX: "auto",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 1px 2px rgba(0,0,0,.04)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f9fafb", textAlign: "left" }}>
              <th style={th}>Producto</th>
              <th style={th}>Cantidad</th>
              <th style={th}>Mín</th>
              <th style={th}>Máx</th>
              <th style={th}>Estado</th>
              <th style={th}>Mensaje</th>
              <th style={th}>Progreso</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((it) => {
              const st = getStockStatus(it);
              const tone = st.level === "BAJO" ? "#ef4444" : st.level === "ALTO" ? "#22c55e" : "#f59e0b";

              const maxVal = Number(it.stock_maximo ?? 0);
              const qtyVal = Number(it.cantidad_actual ?? 0);
              const progressMax = maxVal > 0 ? maxVal : Math.max(qtyVal, 1);

              return (
                <tr key={it.id_inventario} style={{ background: st.rowBg }}>
                  <td style={td}>{it.nombre_producto}</td>
                  <td style={td}><strong>{qtyVal}</strong></td>
                  <td style={td}>{it.stock_minimo ?? "—"}</td>
                  <td style={td}>{it.stock_maximo ?? "—"}</td>
                  <td style={td}>
                    <Badge color={st.color} bg={st.bg}>{st.level}</Badge>
                  </td>
                  <td style={td}>{st.text}</td>
                  <td style={{ ...td, width: 220 }}>
                    <Progress value={qtyVal} max={progressMax} tone={tone} />
                  </td>
                </tr>
              );
            })}

            {!loading && !filtered.length && (
              <tr>
                <td style={{ ...td, padding: 24 }} colSpan={7}>
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  padding: "12px 14px",
  borderBottom: "1px solid #e5e7eb",
  color: "#374151",
  fontWeight: 700,
  fontSize: 12,
  letterSpacing: 0.25,
  textTransform: "uppercase",
};

const td = {
  padding: "10px 14px",
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};