import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const MESES_CAL = [...MESES];
const DIAS_SEMANA_CAL = ["L", "M", "M", "J", "V", "S", "D"];

const ICONOS_TIPO = {
  parcial: "📝",
  final: "📚",
  tarea: "📋",
  otro: "📌",
  feriado: "🏖️",
  inicio_clases: "🎓",
  fin_clases: "🏁",
  receso: "⏸️",
  inscripcion: "📝",
  regularizacion: "🔄",
  complementario: "🔁",
  cierre_periodo: "🔒",
  administrativo: "📋",
  proyecto: "📁",
  tfg: "🎯",
};

const COLORES_TIPO = {
  parcial: "var(--cursando)",
  final: "var(--bloqueada-t)",
  tarea: "var(--disponible)",
  otro: "var(--accent)",
  feriado: "#9b59b6",
  inicio_clases: "#2ecc71",
  fin_clases: "#e74c3c",
  inscripcion: "#3498db",
  regularizacion: "#f39c12",
  complementario: "#e67e22",
  cierre_periodo: "#95a5a6",
  administrativo: "#7f8c8d",
  proyecto: "#8e44ad",
  tfg: "#c0392b",
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
export default function Agenda({ session }) {
  const [eventos, setEventos] = useState([]);
  const [eventosOficiales, setEventosOficiales] = useState([]);
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [fechaActual, setFechaActual] = useState(new Date());
  const [vista, setVista] = useState("mensual");

  const [mostrarModal, setMostrarModal] = useState(false);
  const [eventoEditando, setEventoEditando] = useState(null);

  const [filtroMateria, setFiltroMateria] = useState("todas");
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [notificaciones, setNotificaciones] = useState([]);
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false);

  // Nuevo estado para el popover del día
  const [diaSeleccionado, setDiaSeleccionado] = useState(null);

  // ─── CARGA DE MATERIAS ──────────────────────────────────────────────────
  const cargarMaterias = useCallback(async () => {
    try {
      const { apiFetch } = await import("../api");
      const data = await apiFetch("/materias", { token: session.token });
      const cursando = data.filter((m) => m.anho === new Date().getFullYear());
      setMaterias(cursando);
    } catch {
      setMaterias([]);
    }
  }, [session.token]);

  // ─── CARGA DE EVENTOS DESDE SUPABASE (TIEMPO REAL) ──────────────────────
  useEffect(() => {
    if (!session?.carreraId) return;
    setLoading(true);

    const cargarInicial = async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("carrera_id", session.carreraId)
        .order("fecha", { ascending: true });

      if (error) setError(error.message);
      else setEventos(data || []);
      setLoading(false);
    };

    cargarInicial();

    const subscription = supabase
      .channel("eventos-cambios")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "eventos",
          filter: `carrera_id=eq.${session.carreraId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") setEventos((prev) => [...prev, payload.new]);
          else if (payload.eventType === "UPDATE") setEventos((prev) => prev.map((e) => (e.id === payload.new.id ? payload.new : e)));
          else if (payload.eventType === "DELETE") setEventos((prev) => prev.filter((e) => e.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session.carreraId]);

  // ─── CARGA DE CALENDARIO ACADÉMICO OFICIAL ─────────────────────────────
  useEffect(() => {
    if (!session?.carreraId) return;
    const cargarOficiales = async () => {
      const { data } = await supabase
        .from("calendario_academico")
        .select("*")
        .or(`carrera_id.is.null,carrera_id.eq.${session.carreraId}`);
      if (data) setEventosOficiales(data);
    };
    cargarOficiales();
  }, [session.carreraId]);

  useEffect(() => { cargarMaterias(); }, [cargarMaterias]);

  // ─── NOTIFICACIONES ─────────────────────────────────────────────────────
  useEffect(() => {
    const ahora = new Date();
    const limite = new Date(ahora);
    limite.setDate(limite.getDate() + 3);

    const todosLosEventos = [
      ...eventos.map((e) => ({ ...e, es_oficial: false })),
      ...eventosOficiales.map((e) => ({
        ...e,
        es_oficial: true,
        materia_id: null,
        materia_nombre: "Institucional",
        tipo: e.tipo || "feriado",
        fecha: new Date(e.fecha + "T00:00:00").toISOString(),
      })),
    ];

    const proximos = todosLosEventos
      .filter((e) => {
        const f = new Date(e.fecha);
        return f >= ahora && f <= limite;
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    setNotificaciones(proximos);
  }, [eventos, eventosOficiales]);

  // ─── NAVEGACIÓN DEL CALENDARIO ──────────────────────────────────────────
  const irMesAnterior = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
  const irMesSiguiente = () => setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));
  const irHoy = () => setFechaActual(new Date());
  const irSemanaAnterior = () => { const n = new Date(fechaActual); n.setDate(n.getDate() - 7); setFechaActual(n); };
  const irSemanaSiguiente = () => { const n = new Date(fechaActual); n.setDate(n.getDate() + 7); setFechaActual(n); };

  // ─── CÁLCULO DE DÍAS ────────────────────────────────────────────────────
  const obtenerDiasSemana = (fecha) => {
    const dias = [];
    const lunes = new Date(fecha);
    const diaActual = lunes.getDay() || 7;
    lunes.setDate(lunes.getDate() - (diaActual - 1));
    for (let i = 0; i < 7; i++) {
      const dia = new Date(lunes);
      dia.setDate(dia.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  const obtenerDiasMes = (fecha) => {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    const primerDia = new Date(año, mes, 1);
    const ultimoDia = new Date(año, mes + 1, 0);
    const dias = [];
    const diaInicio = primerDia.getDay() || 7;
    for (let i = 1; i < diaInicio; i++) {
      dias.push({ fecha: new Date(año, mes, 1 - (diaInicio - i)), esOtroMes: true });
    }
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ fecha: new Date(año, mes, i), esOtroMes: false });
    }
    return dias;
  };

  // ─── COMBINAR EVENTOS ──────────────────────────────────────────────────
  const todosLosEventos = [
    ...eventos.map((e) => ({ ...e, es_oficial: false })),
    ...eventosOficiales.map((e) => ({
      ...e,
      es_oficial: true,
      materia_id: null,
      materia_nombre: "Institucional",
      tipo: e.tipo || "feriado",
      fecha: new Date(e.fecha + "T00:00:00").toISOString(),
    })),
  ];

  // ─── FILTROS ────────────────────────────────────────────────────────────
  const eventosFiltrados = todosLosEventos.filter((evento) => {
    if (filtroMateria !== "todas" && evento.materia_id !== filtroMateria) return false;
    if (filtroTipo !== "todos" && evento.tipo !== filtroTipo) return false;
    return true;
  });

  const eventosDelDia = (fecha) => {
    return eventosFiltrados.filter((evento) => {
      const fechaEvento = new Date(evento.fecha);
      return (
        fechaEvento.getDate() === fecha.getDate() &&
        fechaEvento.getMonth() === fecha.getMonth() &&
        fechaEvento.getFullYear() === fecha.getFullYear()
      );
    });
  };

  // ─── CRUD DE EVENTOS ────────────────────────────────────────────────────
  const handleGuardarEvento = async (datosEvento) => {
    try {
      if (eventoEditando) {
        const { error } = await supabase
          .from("eventos")
          .update({
            titulo: datosEvento.titulo,
            descripcion: datosEvento.descripcion,
            materia_id: datosEvento.materiaId,
            materia_nombre: datosEvento.materiaNombre,
            tipo: datosEvento.tipo,
            fecha: datosEvento.fecha,
          })
          .eq("id", eventoEditando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("eventos").insert([
          {
            titulo: datosEvento.titulo,
            descripcion: datosEvento.descripcion,
            materia_id: datosEvento.materiaId,
            materia_nombre: datosEvento.materiaNombre,
            tipo: datosEvento.tipo,
            fecha: datosEvento.fecha,
            carrera_id: session.carreraId,
          },
        ]);
        if (error) throw error;
      }
      setMostrarModal(false);
      setEventoEditando(null);
    } catch (err) {
      throw err;
    }
  };

  const handleEliminarEvento = async (eventoId) => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;
    try {
      const { error } = await supabase.from("eventos").delete().eq("id", eventoId);
      if (error) throw error;
      setMostrarModal(false);
      setEventoEditando(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── FORMATEO ───────────────────────────────────────────────────────────
  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "long",
    });
  };

  // ─── RENDERIZADO ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div className="spinner" />
        <span style={{ color: "var(--text-dim)" }}>Cargando agenda...</span>
      </div>
    );
  }

  const hoy = new Date();
  const dias = vista === "mensual" ? obtenerDiasMes(fechaActual) : [];
  const diasSemana = vista === "semanal" ? obtenerDiasSemana(fechaActual) : [];

  return (
    <div className="main">
      {/* ─── ENCABEZADO ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div style={{ fontSize: ".75rem", textTransform: "uppercase", letterSpacing: "3px", color: "var(--text-dim)", fontFamily: "Space Mono, monospace", marginBottom: ".5rem" }}>
          Calendario Académico
        </div>
        <h1 style={{ fontSize: "1.0rem", fontWeight: "500", margin: 0 }}>Agenda</h1>
      </div>

      {/* ─── BARRA DE CONTROLES ────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button onClick={vista === "mensual" ? irMesAnterior : irSemanaAnterior} className="btn-logout">←</button>
          <span style={{ fontSize: "clamp(0.8rem, 2.5vw, 1rem)", fontWeight: "600", minWidth: "150px", textAlign: "center" }}>
            {vista === "mensual"
              ? `${MESES[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`
              : `Sem. del ${diasSemana[0]?.getDate() || ""} al ${diasSemana[6]?.getDate() || ""}`}
          </span>
          <button onClick={vista === "mensual" ? irMesSiguiente : irSemanaSiguiente} className="btn-logout">→</button>
          <button onClick={irHoy} style={{ marginLeft: "0.5rem", padding: "0.4rem 0.8rem", border: "1px solid var(--border2)", borderRadius: "6px", background: "transparent", color: "var(--text-dim)", cursor: "pointer", fontFamily: "Space Mono, monospace", fontSize: "0.7rem" }}>Hoy</button>
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {notificaciones.length > 0 && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)} style={{ padding: "0.5rem", borderRadius: "50%", border: "1px solid var(--border2)", background: "transparent", color: "var(--accent)", cursor: "pointer", fontSize: "1.2rem", position: "relative" }}>
                🔔
                <span style={{ position: "absolute", top: "-4px", right: "-4px", background: "var(--bloqueada-t)", color: "#fff", borderRadius: "50%", width: "18px", height: "18px", fontSize: "0.6rem", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                  {notificaciones.length}
                </span>
              </button>
              {mostrarNotificaciones && (
                <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "8px", background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: "12px", padding: "0.75rem", minWidth: "280px", maxWidth: "90vw", maxHeight: "300px", overflowY: "auto", zIndex: 300, boxShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                  <div style={{ fontSize: "0.65rem", color: "var(--accent)", marginBottom: "0.5rem", fontFamily: "Space Mono, monospace", fontWeight: "600" }}>PRÓXIMOS EVENTOS</div>
                  {notificaciones.map((evento) => (
                    <div key={evento.id} style={{ padding: "0.5rem", borderBottom: "1px solid var(--border)", fontSize: "0.7rem" }}>
                      <div style={{ fontWeight: "600", color: evento.es_oficial ? "var(--accent)" : COLORES_TIPO[evento.tipo] }}>
                        {ICONOS_TIPO[evento.tipo] || "📅"} {evento.titulo}
                      </div>
                      <div style={{ color: "var(--text-dim)", fontSize: "0.65rem" }}>
                        {evento.materia_nombre} · {formatearFecha(evento.fecha)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", borderRadius: "8px", overflow: "hidden", border: "1px solid var(--border2)" }}>
            <button onClick={() => setVista("mensual")} style={{ padding: "0.4rem 0.8rem", border: "none", background: vista === "mensual" ? "var(--accent)" : "transparent", color: vista === "mensual" ? "#000" : "var(--text-dim)", cursor: "pointer", fontFamily: "Space Mono, monospace", fontSize: "0.7rem" }}>Mes</button>
            <button onClick={() => setVista("semanal")} style={{ padding: "0.4rem 0.8rem", border: "none", background: vista === "semanal" ? "var(--accent)" : "transparent", color: vista === "semanal" ? "#000" : "var(--text-dim)", cursor: "pointer", fontFamily: "Space Mono, monospace", fontSize: "0.7rem" }}>Semana</button>
          </div>

          <button onClick={() => { setEventoEditando(null); setMostrarModal(true); }} style={{ padding: "0.5rem 1rem", borderRadius: "8px", border: "none", background: "var(--accent)", color: "#000", fontWeight: "600", cursor: "pointer", fontFamily: "Space Mono, monospace", fontSize: "0.75rem" }}>
            + Nuevo
          </button>
        </div>
      </div>

      {/* ─── FILTROS ───────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <select value={filtroMateria} onChange={(e) => setFiltroMateria(e.target.value)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "clamp(0.65rem, 2vw, 0.7rem)", flex: "1 1 auto" }}>
          <option value="todas">Todas las materias</option>
          {materias.map((m) => (
            <option key={m.codigoMateria} value={m.codigoMateria}>{m.materia}</option>
          ))}
        </select>

        <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} style={{ padding: "0.4rem 0.8rem", borderRadius: "6px", border: "1px solid var(--border2)", background: "var(--bg3)", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "clamp(0.65rem, 2vw, 0.7rem)", flex: "1 1 auto" }}>
          <option value="todos">Todos los tipos</option>
          <option value="parcial">📝 Parcial</option>
          <option value="final">📚 Examen Final</option>
          <option value="tarea">📋 Tarea</option>
          <option value="otro">📌 Otro</option>
          <option value="feriado">🏖️ Feriado</option>
          <option value="inicio_clases">🎓 Inicio de clases</option>
          <option value="fin_clases">🏁 Fin de clases</option>
          <option value="inscripcion">📝 Inscripción</option>
          <option value="regularizacion">🔄 Regularización</option>
          <option value="complementario">🔁 Complementario</option>
          <option value="cierre_periodo">🔒 Cierre de periodo</option>
          <option value="proyecto">📁 Proyecto</option>
          <option value="tfg">🎯 TFG</option>
        </select>
      </div>

      {/* ─── VISTA MENSUAL ──────────────────────────────────────────────── */}
      {vista === "mensual" && (
        <div style={{ background: "var(--bg3)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
            {DIAS_SEMANA.map((dia) => (
              <div key={dia} style={{ padding: "0.75rem 0.25rem", textAlign: "center", fontSize: "clamp(0.55rem, 2vw, 0.7rem)", fontWeight: "600", color: "var(--text-dim)", fontFamily: "Space Mono, monospace" }}>
                {dia.slice(0, 3)}
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {dias.map(({ fecha, esOtroMes }, index) => {
              const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
              const eventosHoy = eventosDelDia(fecha);

              return (
                <div key={index} style={{ minHeight: "clamp(60px, 15vw, 100px)", padding: "0.25rem", border: "1px solid var(--border)", background: esHoy ? "rgba(29,185,84,0.05)" : esOtroMes ? "var(--bg2)" : "transparent", opacity: esOtroMes ? 0.5 : 1, overflow: "hidden" }}>
                  <button
                    onClick={() => setDiaSeleccionado(fecha)}
                    style={{
                      fontSize: "clamp(0.6rem, 2vw, 0.75rem)",
                      fontWeight: esHoy ? "700" : "400",
                      marginBottom: "2px",
                      fontFamily: "Space Mono, monospace",
                      textAlign: "center",
                      width: esHoy ? "clamp(20px, 5vw, 24px)" : "auto",
                      height: esHoy ? "clamp(20px, 5vw, 24px)" : "auto",
                      lineHeight: esHoy ? "clamp(20px, 5vw, 24px)" : "normal",
                      borderRadius: esHoy ? "50%" : "4px",
                      background: esHoy ? "var(--accent)" : "transparent",
                      color: esHoy ? "#000" : "var(--text-dim)",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px 4px",
                      margin: esHoy ? "0 auto 2px" : "0 0 2px 0",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {fecha.getDate()}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
                    {eventosHoy.slice(0, 3).map((evento) => (
                      <div
                        key={evento.id}
                        title={`${evento.titulo} - ${evento.materia_nombre || ""}`}
                        onClick={() => {
                          if (evento.es_oficial) return;
                          setEventoEditando(evento);
                          setMostrarModal(true);
                        }}
                        style={{
                          fontSize: "clamp(0.4rem, 1.8vw, 0.6rem)",
                          padding: "clamp(2px, 0.5vw, 3px) clamp(2px, 0.5vw, 6px)",
                          borderRadius: "3px",
                          background: evento.es_oficial ? "var(--bg3)" : COLORES_TIPO[evento.tipo] || "var(--accent)",
                          border: evento.es_oficial ? "1px dashed var(--accent)" : "none",
                          color: evento.es_oficial ? "var(--accent)" : "#000",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: evento.es_oficial ? "default" : "pointer",
                          fontFamily: "Space Mono, monospace",
                          maxWidth: "100%",
                          display: "inline-block",
                          boxSizing: "border-box",
                          touchAction: "manipulation",
                        }}
                      >
                        {ICONOS_TIPO[evento.tipo] || "📅"} {evento.titulo}
                      </div>
                    ))}
                    {eventosHoy.length > 3 && (
                      <div style={{ fontSize: "clamp(0.4rem, 1.5vw, 0.55rem)", color: "var(--text-dim)", fontFamily: "Space Mono, monospace" }}>
                        +{eventosHoy.length - 3}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── VISTA SEMANAL ──────────────────────────────────────────────── */}
      {vista === "semanal" && (
        <div style={{ background: "var(--bg3)", borderRadius: "12px", border: "1px solid var(--border)", overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(80px, 1fr))", borderBottom: "1px solid var(--border)", background: "var(--bg2)" }}>
            {diasSemana.map((fecha, index) => {
              const esHoy = fecha.getDate() === hoy.getDate() && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear();
              return (
                <div key={index} style={{ padding: "0.5rem 0.25rem", textAlign: "center", background: esHoy ? "rgba(29,185,84,0.1)" : "transparent" }}>
                  <button
                    onClick={() => setDiaSeleccionado(fecha)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-dim)",
                      cursor: "pointer",
                      fontSize: "clamp(0.55rem, 2vw, 0.65rem)",
                      fontFamily: "Space Mono, monospace",
                      padding: 0,
                    }}
                  >
                    {DIAS_SEMANA[index].slice(0, 3)}
                  </button>
                  <div style={{ fontSize: "clamp(0.75rem, 2.5vw, 0.9rem)", fontWeight: esHoy ? "700" : "400", color: esHoy ? "var(--accent)" : "var(--text)" }}>{fecha.getDate()}</div>
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(80px, 1fr))", minHeight: "300px" }}>
            {diasSemana.map((fecha, index) => {
              const eventosHoy = eventosDelDia(fecha);
              return (
                <div key={index} style={{ padding: "0.25rem", border: "1px solid var(--border)", minHeight: "100%", overflow: "hidden" }}>
                  {eventosHoy.map((evento) => (
                    <div
                      key={evento.id}
                      onClick={() => {
                        if (evento.es_oficial) return;
                        setEventoEditando(evento);
                        setMostrarModal(true);
                      }}
                      style={{
                        fontSize: "clamp(0.45rem, 1.8vw, 0.6rem)",
                        padding: "clamp(2px, 0.4vw, 4px) clamp(3px, 0.6vw, 6px)",
                        borderRadius: "4px",
                        background: evento.es_oficial ? "var(--bg3)" : COLORES_TIPO[evento.tipo] || "var(--accent)",
                        border: evento.es_oficial ? "1px dashed var(--accent)" : "none",
                        color: evento.es_oficial ? "var(--accent)" : "#000",
                        marginBottom: "2px",
                        cursor: evento.es_oficial ? "default" : "pointer",
                        fontFamily: "Space Mono, monospace",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                        boxSizing: "border-box",
                        touchAction: "manipulation",
                      }}
                    >
                      <div style={{ fontWeight: "600" }}>
                        {ICONOS_TIPO[evento.tipo] || "📅"} {evento.titulo}
                      </div>
                      <div style={{ fontSize: "clamp(0.4rem, 1.5vw, 0.55rem)", opacity: 0.8 }}>
                        {evento.materia_nombre}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── LISTA DE PRÓXIMOS EVENTOS ──────────────────────────────────── */}
      <div style={{ marginTop: "2rem" }}>
        <div style={{ fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "2px", color: "var(--accent)", marginBottom: "1rem", fontFamily: "Space Mono, monospace" }}>
          Próximos eventos
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notificaciones.length === 0 && (
            <div style={{ padding: "1rem", color: "var(--text-dim)", fontSize: "0.8rem", fontFamily: "Space Mono, monospace", textAlign: "center", background: "var(--bg3)", borderRadius: "8px" }}>
              No hay eventos próximos en los siguientes 3 días
            </div>
          )}
          {notificaciones.map((evento) => {
            const materia = materias.find((m) => m.codigoMateria === evento.materia_id);
            return (
              <div
                key={evento.id}
                onClick={() => {
                  if (evento.es_oficial) return;
                  setEventoEditando(evento);
                  setMostrarModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "clamp(0.5rem, 2vw, 1rem)",
                  padding: "clamp(0.5rem, 2vw, 0.75rem)",
                  background: "var(--bg3)",
                  border: evento.es_oficial ? "1px dashed var(--accent)" : "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: evento.es_oficial ? "default" : "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  if (!evento.es_oficial) e.currentTarget.style.borderColor = COLORES_TIPO[evento.tipo] || "var(--accent)";
                }}
                onMouseLeave={(e) => {
                  if (!evento.es_oficial) e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{
                  width: "clamp(32px, 8vw, 40px)",
                  height: "clamp(32px, 8vw, 40px)",
                  borderRadius: "8px",
                  background: evento.es_oficial ? "var(--bg3)" : COLORES_TIPO[evento.tipo] || "var(--accent)",
                  border: evento.es_oficial ? "1px dashed var(--accent)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(1rem, 3vw, 1.2rem)",
                }}>
                  {ICONOS_TIPO[evento.tipo] || "📅"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: "600", fontSize: "clamp(0.75rem, 2.5vw, 0.85rem)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{evento.titulo}</div>
                  <div style={{ fontSize: "clamp(0.65rem, 2vw, 0.7rem)", color: "var(--text-dim)" }}>
                    {materia?.materia || evento.materia_nombre} · {formatearFecha(evento.fecha)}
                  </div>
                </div>
                <div style={{
                  fontSize: "clamp(0.5rem, 1.8vw, 0.6rem)",
                  padding: "0.25rem 0.5rem",
                  borderRadius: "20px",
                  background: evento.es_oficial ? "var(--bg3)" : COLORES_TIPO[evento.tipo] || "var(--accent)",
                  border: evento.es_oficial ? "1px dashed var(--accent)" : "none",
                  color: evento.es_oficial ? "var(--accent)" : "#000",
                  fontFamily: "Space Mono, monospace",
                  fontWeight: "600",
                }}>
                  {evento.tipo.toUpperCase()}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── MODAL ──────────────────────────────────────────────────────── */}
      {mostrarModal && (
        <ModalEvento
          evento={eventoEditando}
          materias={materias}
          onSave={handleGuardarEvento}
          onDelete={eventoEditando ? handleEliminarEvento : undefined}
          onClose={() => {
            setMostrarModal(false);
            setEventoEditando(null);
          }}
        />
      )}

      {/* ─── MODAL DE DÍA (LISTA DE EVENTOS) ────────────────────────────────── */}
      {diaSeleccionado && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            zIndex: 450,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => setDiaSeleccionado(null)}
        >
          <div
            style={{
              background: "var(--bg3)",
              border: "1px solid var(--border2)",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "400px",
              maxHeight: "80vh",
              overflowY: "auto",
              padding: "1.25rem",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "600", margin: 0 }}>
                {diaSeleccionado.toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })}
              </h3>
              <button
                onClick={() => setDiaSeleccionado(null)}
                style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem" }}
              >
                ✕
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {eventosDelDia(diaSeleccionado).length === 0 ? (
                <div style={{ color: "var(--text-dim)", fontSize: "0.8rem", textAlign: "center", padding: "1rem" }}>
                  No hay eventos para este día
                </div>
              ) : (
                eventosDelDia(diaSeleccionado).map((evento) => (
                  <div
                    key={evento.id}
                    onClick={() => {
                      if (evento.es_oficial) return;
                      setDiaSeleccionado(null);
                      setEventoEditando(evento);
                      setMostrarModal(true);
                    }}
                    style={{
                      padding: "0.75rem",
                      borderRadius: "8px",
                      background: evento.es_oficial ? "var(--bg3)" : COLORES_TIPO[evento.tipo] || "var(--accent)",
                      border: evento.es_oficial ? "1px dashed var(--accent)" : "none",
                      cursor: evento.es_oficial ? "default" : "pointer",
                      color: evento.es_oficial ? "var(--accent)" : "#000",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    <div style={{ fontWeight: "600", fontSize: "0.85rem", marginBottom: "4px", wordBreak: "break-word" }}>
                      {ICONOS_TIPO[evento.tipo] || "📅"} {evento.titulo}
                    </div>
                    <div style={{ fontSize: "0.7rem", opacity: 0.9 }}>
                      {evento.materia_nombre}
                      {evento.descripcion && ` · ${evento.descripcion}`}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE MODAL ──────────────────────────────────────────────────────
function ModalEvento({ evento, materias, onSave, onDelete, onClose }) {
  const [form, setForm] = useState({
    titulo: evento?.titulo || "",
    descripcion: evento?.descripcion || "",
    materiaId: evento?.materia_id || "",
    materiaNombre: evento?.materia_nombre || "",
    tipo: evento?.tipo || "parcial",
    fecha: evento?.fecha
      ? new Date(evento.fecha).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [mostrarCalendario, setMostrarCalendario] = useState(false);

  const fechaSeleccionada = new Date(form.fecha + "T00:00:00");
  const [calendarioMes, setCalendarioMes] = useState(fechaSeleccionada.getMonth());
  const [calendarioAnio, setCalendarioAnio] = useState(fechaSeleccionada.getFullYear());

  const obtenerDiasCalendario = (mes, anio) => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const dias = [];
    const diaInicio = primerDia.getDay() || 7;
    for (let i = 1; i < diaInicio; i++) dias.push(null);
    for (let i = 1; i <= ultimoDia.getDate(); i++) dias.push(i);
    return dias;
  };

  const cambiarMes = (delta) => {
    let nuevoMes = calendarioMes + delta;
    let nuevoAnio = calendarioAnio;
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio--; }
    else if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++; }
    setCalendarioMes(nuevoMes);
    setCalendarioAnio(nuevoAnio);
  };

  const seleccionarFecha = (dia) => {
    const fechaStr = `${calendarioAnio}-${String(calendarioMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    setForm({ ...form, fecha: fechaStr });
    setMostrarCalendario(false);
  };

  const formatearFechaVisual = (fechaStr) => {
    if (!fechaStr) return "Seleccionar fecha";
    const [anio, mes, dia] = fechaStr.split("-");
    return `${parseInt(dia)} de ${MESES_CAL[parseInt(mes) - 1]} de ${anio}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.titulo.trim()) { setError("El título es obligatorio"); return; }
    if (!form.materiaId) { setError("Debe seleccionar una materia"); return; }
    if (!form.fecha) { setError("Debe seleccionar una fecha"); return; }

    setSaving(true);
    const materia = materias.find((m) => m.codigoMateria === form.materiaId);
    try {
      await onSave({
        titulo: form.titulo.trim(),
        descripcion: form.descripcion.trim(),
        materiaId: form.materiaId,
        materiaNombre: materia?.materia || form.materiaId,
        tipo: form.tipo,
        fecha: new Date(form.fecha + "T00:00:00").toISOString(),
      });
    } catch (err) {
      setError(err.message || "Error al guardar el evento");
    } finally {
      setSaving(false);
    }
  };

  const hoy = new Date();
  const esHoy = (dia) => dia === hoy.getDate() && calendarioMes === hoy.getMonth() && calendarioAnio === hoy.getFullYear();
  const esSeleccionado = (dia) => {
    const fc = `${calendarioAnio}-${String(calendarioMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return fc === form.fecha;
  };

  const dias = obtenerDiasCalendario(calendarioMes, calendarioAnio);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg3)", border: "1px solid var(--border2)", borderRadius: "16px", width: "100%", maxWidth: "480px", padding: "1.75rem", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>{evento ? "Editar Evento" : "Nuevo Evento"}</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Título</label>
            <input type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Ej: Parcial de Física II" required />
          </div>

          <div className="field">
            <label>Descripción</label>
            <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Temas, aula, detalles..." rows={3} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: "0.8rem 1rem", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "0.85rem", resize: "vertical" }} />
          </div>

          <div className="field">
            <label>Materia</label>
            <select value={form.materiaId} onChange={(e) => setForm({ ...form, materiaId: e.target.value })} required style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: "0.8rem 1rem", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "0.85rem" }}>
              <option value="">Seleccionar materia</option>
              {materias.map((m) => (
                <option key={m.codigoMateria} value={m.codigoMateria}>{m.materia}</option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Tipo de evento</label>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} style={{ width: "100%", background: "var(--bg)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", padding: "0.8rem 1rem", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "0.85rem" }}>
              <option value="parcial">📝 Parcial</option>
              <option value="final">📚 Examen Final</option>
              <option value="tarea">📋 Tarea</option>
              <option value="otro">📌 Otro</option>
            </select>
          </div>

          <div className="field">
            <label>Fecha del examen</label>
            <div style={{ position: "relative" }}>
              <button type="button" onClick={() => { setMostrarCalendario(!mostrarCalendario); if (!mostrarCalendario) { setCalendarioMes(fechaSeleccionada.getMonth()); setCalendarioAnio(fechaSeleccionada.getFullYear()); } }}
                style={{ width: "100%", padding: "0.8rem 1rem", background: "var(--bg)", border: mostrarCalendario ? "1px solid var(--accent)" : "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--text)", fontFamily: "Space Mono, monospace", fontSize: "0.85rem", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📅 {formatearFechaVisual(form.fecha)}</span>
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>{mostrarCalendario ? "▼" : "▲"}</span>
              </button>
              {mostrarCalendario && (
                <div style={{ position: "absolute", bottom: "100%", left: 0, right: 0, marginBottom: "4px", background: "var(--bg2)", border: "1px solid var(--accent)", borderRadius: "12px", padding: "1rem", zIndex: 500, boxShadow: "0 -8px 30px rgba(0,0,0,0.6)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <button type="button" onClick={() => cambiarMes(-1)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "1.1rem", padding: "0.25rem 0.5rem" }}>←</button>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "var(--text)" }}>{MESES_CAL[calendarioMes]} {calendarioAnio}</span>
                    <button type="button" onClick={() => cambiarMes(1)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: "1.1rem", padding: "0.25rem 0.5rem" }}>→</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "4px" }}>
                    {DIAS_SEMANA_CAL.map((dia, i) => (
                      <div key={i} style={{ textAlign: "center", fontSize: "0.65rem", fontWeight: "600", color: "var(--text-dim)", padding: "4px 0", fontFamily: "Space Mono, monospace" }}>{dia}</div>
                    ))}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px" }}>
                    {dias.map((dia, index) => {
                      if (dia === null) return <div key={`empty-${index}`} />;
                      const isHoy = esHoy(dia);
                      const isSelected = esSeleccionado(dia);
                      return (
                        <button key={index} type="button" onClick={() => seleccionarFecha(dia)}
                          style={{
                            padding: "8px 0", textAlign: "center", fontSize: "0.75rem", fontWeight: isSelected ? "700" : "400",
                            fontFamily: "Space Mono, monospace", borderRadius: "8px",
                            border: isSelected ? "2px solid var(--accent)" : "1px solid transparent",
                            background: isSelected ? "rgba(29,185,84,0.2)" : isHoy ? "rgba(29,185,84,0.08)" : "transparent",
                            color: isSelected ? "var(--accent)" : isHoy ? "var(--accent)" : "var(--text)",
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "rgba(29,185,84,0.1)"; }}
                          onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.background = isHoy ? "rgba(29,185,84,0.08)" : "transparent"; }}
                        >
                          {dia}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-msg">{error}</div>}

          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? "Guardando..." : evento ? "Actualizar" : "Crear Evento"}
            </button>
            {onDelete && (
              <button type="button" onClick={() => onDelete(evento.id)}
                style={{ padding: "0.9rem", borderRadius: "500px", border: "1px solid var(--bloqueada-t)", background: "transparent", color: "var(--bloqueada-t)", fontFamily: "Space Mono, monospace", fontSize: "0.75rem", cursor: "pointer", fontWeight: "600" }}>
                Eliminar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}