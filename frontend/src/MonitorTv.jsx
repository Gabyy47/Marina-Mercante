import { useEffect, useRef, useState } from "react";
import api from "./api";
import "./monitortv.css";
import logoDGMM from "./imagenes/DGMM-Gobierno.png";

/* ================== RELOJ (Día y hora en vivo) ================== */
function RelojCorner() {
  const [fecha, setFecha] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setFecha(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const fechaLarga = fecha.toLocaleDateString("es-HN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hora = fecha.toLocaleTimeString("es-HN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="corner-clock">
      <div className="hora">{hora}</div>
      <div className="fecha">{fechaLarga}</div>
    </div>
  );
}
/* ================================================================ */

const LIMITE = 5;
const HERO_MS = 4200;

/* ===== UTILIDADES DE FECHA (filtrar solo HOY) ===== */
function esMismoDiaLocal(d, base = new Date()) {
  if (!(d instanceof Date) || isNaN(d)) return false;
  return (
    d.getFullYear() === base.getFullYear() &&
    d.getMonth() === base.getMonth() &&
    d.getDate() === base.getDate()
  );
}
function parseFecha(v) {
  // Maneja strings ISO/SQL y Date
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d) ? null : d;
}
function filtrarSoloHoy(arr) {
  const hoy = new Date();
  return (Array.isArray(arr) ? arr : [])
    .map((it) => ({ ...it, _dt: parseFecha(it.llamado_en) }))
    .filter((it) => it._dt && esMismoDiaLocal(it._dt, hoy))
    .map(({ _dt, ...rest }) => rest);
}
/* ================================================== */

/* ===== AUDIO ===== */
function playBeep(duration = 140, freq = 880, volume = 0.16) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.value = volume;
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, duration);
  } catch {}
}
function speakTicket(noTicket, ventanilla) {
  try {
    if (!("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance(
      ventanilla
        ? `Ticket ${noTicket}. Diríjase a la ventanilla ${ventanilla}.`
        : `Ticket ${noTicket}.`
    );
    const voices = synth.getVoices();
    const v =
      voices.find((x) => /es-|Spanish/i.test(x.lang)) ||
      voices.find((x) => /es/i.test(x.lang)) ||
      voices[0];
    if (v) u.voice = v;
    u.rate = 0.95;
    u.pitch = 1.0;
    synth.cancel();
    synth.speak(u);
  } catch {}
}
/* ================================= */

export default function MonitorTV() {
  const [filas, setFilas] = useState([]); // [{no_ticket, ventanilla, llamado_en}]
  const [hero, setHero] = useState(null); // {no_ticket, ventanilla, llamado_en}

  const lastKeyRef = useRef(null);
  const heroTimerRef = useRef(null);
  const dailyTimerRef = useRef(null);

  // milisegundos hasta la próxima medianoche
  const msHastaMedianoche = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    return next.getTime() - now.getTime();
  };

  useEffect(() => {
    const programarReset = () => {
      if (dailyTimerRef.current) clearTimeout(dailyTimerRef.current);
      const ms = msHastaMedianoche();
      dailyTimerRef.current = setTimeout(() => {
        window.location.reload();
        // Alternativa sin recargar:
        // lastKeyRef.current = null;
        // setHero(null);
        // setFilas([]);
        // programarReset();
      }, ms);
    };
    programarReset();
    return () => {
      if (dailyTimerRef.current) clearTimeout(dailyTimerRef.current);
    };
  }, []);

  // Inserta/actualiza por ticket (evita duplicados)
  const upsertFila = (item) => {
    setFilas((prev) => {
      const filtered = prev.filter((r) => r.no_ticket !== item.no_ticket);
      const lista = [item, ...filtered];
      return lista.slice(0, LIMITE);
    });
  };

  const showHero = (item) => {
    setHero(item);
    if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    heroTimerRef.current = setTimeout(() => setHero(null), HERO_MS);
    playBeep();
    setTimeout(() => speakTicket(item.no_ticket, item.ventanilla), 120);
  };

  const cargar = async () => {
    try {
      const { data } = await api.get("/monitor/estado");

      // Filtrar por HOY
      const actualBruto = data?.actual || null;
      const historialBruto = Array.isArray(data?.historial) ? data.historial : [];

      const historial = filtrarSoloHoy(historialBruto);

      let actual = null;
      if (actualBruto?.llamado_en && filtrarSoloHoy([actualBruto]).length === 1) {
        actual = actualBruto;
      }

      // Detectar nuevo llamado/repetición (clave incluye fecha del día)
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, "0");
      const dd = String(hoy.getDate()).padStart(2, "0");
      const diaKey = `${yyyy}-${mm}-${dd}`;

      const key =
        actual && actual.llamado_en
          ? `${actual.no_ticket}|${diaKey}|${actual.llamado_en}`
          : null;

      if (actual && key && key !== lastKeyRef.current) {
        lastKeyRef.current = key;
        const item = {
          no_ticket: actual.no_ticket,
          ventanilla: actual.ventanilla,
          llamado_en: actual.llamado_en,
        };
        showHero(item);
        upsertFila(item);
      }

      // Consolidar con historial (última versión por ticket) SOLO HOY
      setFilas((prev) => {
        const prevHoy = filtrarSoloHoy(prev); // purgar cualquier rezago de ayer
        const merged = [...historial, ...prevHoy];
        const byTicket = new Map(); // no_ticket -> más reciente
        for (const it of merged) {
          const old = byTicket.get(it.no_ticket);
          const tNew = new Date(it.llamado_en || 0).getTime();
          const tOld = new Date(old?.llamado_en || 0).getTime();
          if (!old || tNew >= tOld) byTicket.set(it.no_ticket, it);
        }
        return Array.from(byTicket.values())
          .sort((a, b) => new Date(b.llamado_en || 0) - new Date(a.llamado_en || 0))
          .slice(0, LIMITE);
      });
    } catch {
      // opcional: manejar error de red
    }
  };

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 900);
    return () => {
      clearInterval(id);
      if (heroTimerRef.current) clearTimeout(heroTimerRef.current);
    };
  }, []);

  return (
    <div className="screen">
      {/* Reloj institucional */}
      <RelojCorner />

      {/* Columna izquierda */}
      <section className="left">
        {/* Hero overlay si hay llamado */}
        {hero ? (
          <div className="hero is-active">
            <div className="hero-ticket">{hero.no_ticket}</div>
            <div className="hero-vent">Ventanilla {hero.ventanilla || "—"}</div>
          </div>
        ) : (
          <div className="hero idle">
            <img src={logoDGMM} alt="DGMM" className="logo-idle" />
          </div>
        )}
      </section>

      {/* Columna derecha: lista tipo “scoreboard” */}
      <section className="right">
        <header className="list-head">
          <span>Ticket</span>
          <span>Ventanilla</span>
        </header>

        <div className="cards">
          {filas.length === 0 && <div className="empty">Sin llamados aún</div>}

          {filas.map((r) => (
            <article key={r.no_ticket} className="card">
              <div className="ticket">{r.no_ticket}</div>
              <div className="vent">{r.ventanilla || "—"}</div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
