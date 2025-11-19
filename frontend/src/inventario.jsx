import { useEffect, useState, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import api from "./api";
import "./inventario.css";
import { FaSyncAlt } from "react-icons/fa";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";
import { Pie } from "react-chartjs-2";
import Chart from 'chart.js/auto';
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import 'jspdf-autotable';

export default function Inventario() {
  const navigate = useNavigate();
  const [kardex, setKardex] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [detalleCompra, setDetalleCompra] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtros, setFiltros] = useState({
    
    producto: "",
    proveedor: "",
    tipo: "",
    estado: "",
    fecha: ""
  });

  
  const cargarTodo = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rKardex, rInv, rProd, rProv, rDet] = await Promise.all([
        api.get("/kardex"),
        api.get("/inventario"),
        api.get("/productos"),
        api.get("/proveedor"), // endpoint en el backend es '/api/proveedor' (singular)
        api.get("/detalle_compra")
      ]);
      setKardex(rKardex.data || []);
      setInventario(rInv.data || []);
      setProductos(rProd.data || []);
      setProveedores(rProv.data || []);
      setDetalleCompra(rDet.data || []);
    } catch (e) {
      console.error("Error cargando datos de inventario:", e);
      // Guardamos información útil para mostrar en la UI
      const info = {
        message: e.message,
        status: e.response?.status,
        data: e.response?.data,
        url: e.config?.url,
      };
      setError(info);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargarTodo(); }, []);
  // Escuchar eventos globales para refrescar datos cuando otras pantallas hagan cambios
  useEffect(() => {
    const handler = () => { cargarTodo(); };
    window.addEventListener('dataChanged', handler);
    return () => window.removeEventListener('dataChanged', handler);
  }, []);

  // Construir vista combinada
  const construyeFilas = () =>
    (kardex || []).map(k => {
      const prod = productos.find(p => p.id_producto === k.id_producto) || {};
      const inv = inventario.find(i => i.id_producto === k.id_producto) || {};
      const det = detalleCompra.find(d => d.id_kardex === k.id_kardex) || null;
      const prov = det ? (proveedores.find(pv => pv.id_proveedor === det.id_proveedor) || {}) : null;
      return {
        id: k.id_kardex,
        fecha: k.fecha_hora || k.fecha || null,
        producto: prod.nombre_producto || `#${k.id_producto}`,
        proveedor: prov ? prov.nombre : (det ? "Proveedor desconocido" : "-"),
        tipo: k.tipo_movimiento,
        cantidad: k.cantidad,
        estado: k.estado,
        descripcion: k.descripcion,
        stock_actual: inv.cantidad ?? "-"
      };
    }).sort((a,b)=> new Date(b.fecha) - new Date(a.fecha));

  const filas = construyeFilas();

  // ref para capturar la sección que irá al PDF
  const reportRef = useRef(null);
  const tipoChartRef = useRef(null);
  const estadoChartRef = useRef(null);

  // construir datos para gráficos (tipo movimiento y estado)
  const buildCounts = (items, key) => {
    const map = {};
    (items || []).forEach((it) => {
      const v = it[key] ?? "-";
      map[v] = (map[v] || 0) + 1;
    });
    return map;
  };

  const tipoCounts = buildCounts(filas, "tipo");
  const estadoCounts = buildCounts(filas, "estado");

  const palette = ["#0b3540", "#1b90b8", "#ffd166", "#ef476f", "#8ecae6", "#6b705c"];

  const chartFromCounts = (counts) => {
    const labels = Object.keys(counts);
    const data = labels.map((l) => counts[l]);
    const colors = labels.map((_, i) => palette[i % palette.length]);
    return { labels, datasets: [{ data, backgroundColor: colors, hoverOffset: 6 }] };
  };

  const tipoData = chartFromCounts(tipoCounts);
  const estadoData = chartFromCounts(estadoCounts);

  const generatePDF = async () => {
  try {
    const pdf = new jsPDF('landscape', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    let y = 40;

    // === ENCABEZADO ===
    pdf.setFontSize(18);
    pdf.text('Reporte de Inventario', pageWidth / 2, y, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - margin, y, { align: 'right' });
    y += 20;

    // === GRÁFICOS ===
    const charts = [tipoChartRef, estadoChartRef];
    const chartWidth = (pageWidth - margin * 2) / 2 - 10;
    const chartHeight = 140;
    let chartX = margin;

    for (const ref of charts) {
      if (ref.current) {
        const canvas = ref.current.canvas || ref.current.ctx?.canvas;
        if (canvas) {
          const imgData = await html2canvas(canvas).then(c => c.toDataURL('image/png'));
          pdf.addImage(imgData, 'PNG', chartX, y, chartWidth, chartHeight);
          chartX += chartWidth + 20;
        }
      }
    }
    y += chartHeight + 30;

    // === TABLA ===
    const rows = filas.filter(aplicarFiltro).map(r => ([
      r.fecha ? new Date(r.fecha).toLocaleString() : '-',
      String(r.producto || '-'),
      String(r.proveedor || '-'),
      String(r.tipo || '-'),
      String(r.cantidad ?? '-'),
      String(r.estado || '-'),
      String(r.stock_actual ?? '-'),
      String(r.descripcion || '')
    ]));

    const head = [['Fecha', 'Producto', 'Proveedor', 'Tipo', 'Cantidad', 'Estado', 'Stock', 'Descripción']];

    if (rows.length > 0) {
      pdf.autoTable({
        startY: y,
        head,
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [27, 144, 184], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4, lineColor: [200, 200, 200], lineWidth: 0.1 },
        columnStyles: {
          0: { cellWidth: 75 },
          1: { cellWidth: 90 },
          2: { cellWidth: 80 },
          7: { cellWidth: 160 }
        },
        showHead: 'everyPage',
        margin: { left: margin, right: margin },
      });
    } else {
      pdf.setFontSize(11);
      pdf.text('No hay registros para los filtros actuales.', margin, y + 12);
    }

    // === PIE DE PÁGINA ===
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
    }

    pdf.save('inventario-report.pdf');
  } catch (e) {
    console.error('Error generando PDF:', e);
    alert('Error al generar PDF. Revisa la consola.');
  }
};


  const aplicarFiltro = f => {
    const { producto, proveedor, tipo, estado, fecha } = filtros;
    return (!producto || f.producto?.toLowerCase().includes(producto.toLowerCase())) &&
           (!proveedor || (f.proveedor || "").toLowerCase().includes(proveedor.toLowerCase())) &&
           (!tipo || f.tipo === tipo) &&
           (!estado || (f.estado || "").toLowerCase() === estado.toLowerCase()) &&
           (!fecha || (f.fecha && new Date(f.fecha).toDateString() === new Date(fecha).toDateString()));
  };

  return (
    <div className="inventario-page">
      <div className="inventario-logo-wrap"><img src={logoDGMM} alt="DGMM" /></div>

      <div className="inventario-topbar">
        <span className="topbar-title">Dashboard de Inventario</span>
        <div className="topbar-actions">
          <button className="btn btn-topbar-outline" onClick={()=>navigate('/')}>← Menú</button>
          <button className="btn btn-topbar-outline" onClick={cargarTodo} style={{marginLeft:8}}><FaSyncAlt/> Refrescar</button>
          <button className="btn btn-topbar-outline" onClick={generatePDF} style={{marginLeft:8}}>📄 Generar PDF</button>
        </div>
      </div>

      <div className="inventario-card">
        {/* sección que se captura en PDF */}
        <div ref={reportRef}>
        {error && (
          <div className="inventario-error" style={{marginBottom:12, padding:12, borderRadius:6, background:'#fdecea', color:'#611a15'}}>
            <strong>Error cargando datos:</strong>
            <div>Mensaje: {String(error.message)}</div>
            <div>URL: {error.url || "-"}</div>
            <div>Estado: {error.status || "-"}</div>
            <div style={{marginTop:6}}>Respuesta: <pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(error.data,null,2)}</pre></div>
          </div>
        )}
        <div className="inventario-filtros">
          <input placeholder="Filtrar por producto" value={filtros.producto}
                 onChange={e=>setFiltros({...filtros, producto: e.target.value})}/>
          <input placeholder="Filtrar por proveedor" value={filtros.proveedor}
                 onChange={e=>setFiltros({...filtros, proveedor: e.target.value})}/>
          <select value={filtros.tipo} onChange={e=>setFiltros({...filtros, tipo: e.target.value})}>
            <option value="">Tipo movimiento (Todos)</option>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
          <select value={filtros.estado} onChange={e=>setFiltros({...filtros, estado: e.target.value})}>
            <option value="">Estado (Todos)</option>
            <option value="Pendiente">Pendiente</option>
            <option value="En proceso">En proceso</option>
            <option value="Completado">Completado</option>
            <option value="Cancelado">Cancelado</option>
          </select>
          <input type="date" value={filtros.fecha} onChange={e=>setFiltros({...filtros, fecha: e.target.value})}/>
        </div>

        {loading ? (
          <p className="loading">Cargando dashboard...</p>
        ) : (
          <>
          <table className="inventario-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Producto</th>
                <th>Proveedor</th>
                <th>Tipo</th>
                <th>Cant.</th>
                <th>Estado</th>
                <th>Stock actual</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              {filas.filter(aplicarFiltro).map(f => (
                <tr key={f.id}>
                  <td>{f.fecha ? new Date(f.fecha).toLocaleString() : "-"}</td>
                  <td>{f.producto}</td>
                  <td>{f.proveedor}</td>
                  <td className={`mov-${f.tipo}`}>{f.tipo}</td>
                  <td>{f.cantidad}</td>
                  <td className={`status status-${String(f.estado).toLowerCase().replace(/\s/g,"-")}`}>{f.estado}</td>
                  <td>{f.stock_actual}</td>
                  <td>{f.descripcion}</td>
                </tr>
              ))}
              {filas.filter(aplicarFiltro).length === 0 && (
                <tr><td colSpan={8} className="no-data">No hay registros que coincidan</td></tr>
              )}
            </tbody>
          </table>
          <div className="inventario-charts">
            <div className="chart-card">
              <h4>Por tipo de movimiento</h4>
              <Pie data={tipoData} ref={tipoChartRef} />
            </div>
            <div className="chart-card">
              <h4>Por estado</h4>
              <Pie data={estadoData} ref={estadoChartRef} />
            </div>
          </div>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
