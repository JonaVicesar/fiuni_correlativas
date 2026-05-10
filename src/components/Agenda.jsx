import { useState, useEffect, useCallback } from "react";
import { supabase } from "../supabaseClient";

// ─── CONSTANTES ────────────────────────────────────────────────────────────
// Días de la semana para las vistas del calendario
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

// Nombres de los meses en español
const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// Colores de fondo para cada tipo de evento (usando variables CSS del tema)
const COLORES_TIPO = {
  parcial: "var(--cursando)", // Azul
  final: "var(--bloqueada-t)", // Rojo
  tarea: "var(--disponible)", // Amarillo
  otro: "var(--accent)", // Verde
};

// Emojis representativos para cada tipo de evento
const ICONOS_TIPO = {
  parcial: "📝",
  final: "📚",
  tarea: "📋",
  otro: "📌",
};

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────
/**
 * Agenda - Calendario académico colaborativo
 *
 * Permite a los estudiantes crear, editar y eliminar eventos académicos
 * (parciales, finales, tareas) que son visibles para todos los compañeros
 * de la misma carrera en tiempo real.
 *
 * @param {Object} session - Datos de sesión del usuario (token, carreraId, nombre)
 */
export default function Agenda({ session }) {
  // ─── ESTADOS ────────────────────────────────────────────────────────────
  const [eventos, setEventos] = useState([]); // Lista de eventos desde Supabase
  const [materias, setMaterias] = useState([]); // Materias que cursa el alumno
  const [loading, setLoading] = useState(true); // Estado de carga inicial
  const [error, setError] = useState(""); // Mensaje de error

  const [fechaActual, setFechaActual] = useState(new Date()); // Fecha de referencia del calendario
  const [vista, setVista] = useState("mensual"); // "mensual" o "semanal"

  const [mostrarModal, setMostrarModal] = useState(false); // Controla el modal crear/editar
  const [eventoEditando, setEventoEditando] = useState(null); // Evento que se está editando (null = nuevo)

  const [filtroMateria, setFiltroMateria] = useState("todas"); // Filtro por materia
  const [filtroTipo, setFiltroTipo] = useState("todos"); // Filtro por tipo de evento

  const [notificaciones, setNotificaciones] = useState([]); // Eventos próximos (3 días)
  const [mostrarNotificaciones, setMostrarNotificaciones] = useState(false); // Dropdown de notificaciones

  // ─── CARGA DE MATERIAS ──────────────────────────────────────────────────
  /**
   * Carga las materias que el estudiante está cursando en el año actual
   * desde la API del backend (no desde Supabase)
   */
  const cargarMaterias = useCallback(async () => {
    try {
      // Importación dinámica para evitar dependencia circular
      const { apiFetch } = await import("../api");
      const data = await apiFetch("/materias", { token: session.token });
      // Filtra solo las materias del año en curso
      const cursando = data.filter((m) => m.anho === new Date().getFullYear());
      setMaterias(cursando);
    } catch {
      // Si falla la API, se sigue sin materias (no bloquea la agenda)
      setMaterias([]);
    }
  }, [session.token]);

  // ─── CARGA DE EVENTOS DESDE SUPABASE (TIEMPO REAL) ──────────────────────
  /**
   * Efecto principal: carga los eventos iniciales y se suscribe a cambios
   * en tiempo real usando el canal "eventos-cambios" de Supabase.
   *
   * Se ejecuta cada vez que cambia el carreraId del usuario.
   */
  useEffect(() => {
    if (!session?.carreraId) return; // Si no hay carrera, no carga nada

    setLoading(true);

    // Carga inicial de todos los eventos de la carrera
    const cargarInicial = async () => {
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("carrera_id", session.carreraId) // Solo eventos de su carrera
        .order("fecha", { ascending: true }); // Ordenados por fecha

      if (error) {
        setError(error.message);
      } else {
        setEventos(data || []);
      }
      setLoading(false);
    };

    cargarInicial();

    // Suscripción a cambios en tiempo real (INSERT, UPDATE, DELETE)
    const subscription = supabase
      .channel("eventos-cambios")
      .on(
        "postgres_changes",
        {
          event: "*", // Escucha todos los eventos
          schema: "public",
          table: "eventos",
          filter: `carrera_id=eq.${session.carreraId}`, // Solo de su carrera
        },
        (payload) => {
          // Según el tipo de cambio, actualiza el estado local
          if (payload.eventType === "INSERT") {
            setEventos((prev) => [...prev, payload.new]);
          } else if (payload.eventType === "UPDATE") {
            setEventos((prev) =>
              prev.map((e) => (e.id === payload.new.id ? payload.new : e)),
            );
          } else if (payload.eventType === "DELETE") {
            setEventos((prev) => prev.filter((e) => e.id !== payload.old.id));
          }
        },
      )
      .subscribe();

    // Limpieza: cancela la suscripción al desmontar el componente
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [session.carreraId]);

  // Carga las materias al iniciar
  useEffect(() => {
    cargarMaterias();
  }, [cargarMaterias]);

  // ─── NOTIFICACIONES ─────────────────────────────────────────────────────
  /**
   * Calcula los eventos que ocurren en los próximos 3 días
   * para mostrarlos como notificaciones
   */
  useEffect(() => {
    const ahora = new Date();
    const limite = new Date(ahora);
    limite.setDate(limite.getDate() + 3); // Ventana de 3 días

    const proximos = eventos
      .filter((evento) => {
        const fechaEvento = new Date(evento.fecha);
        return fechaEvento >= ahora && fechaEvento <= limite;
      })
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha)); // Más próximos primero

    setNotificaciones(proximos);
  }, [eventos]);

  // ─── NAVEGACIÓN DEL CALENDARIO ──────────────────────────────────────────
  /** Retrocede un mes en la vista mensual */
  const irMesAnterior = () => {
    setFechaActual(
      new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1),
    );
  };

  /** Avanza un mes en la vista mensual */
  const irMesSiguiente = () => {
    setFechaActual(
      new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1),
    );
  };

  /** Vuelve al mes actual (hoy) */
  const irHoy = () => setFechaActual(new Date());

  /** Retrocede una semana en la vista semanal */
  const irSemanaAnterior = () => {
    const nueva = new Date(fechaActual);
    nueva.setDate(nueva.getDate() - 7);
    setFechaActual(nueva);
  };

  /** Avanza una semana en la vista semanal */
  const irSemanaSiguiente = () => {
    const nueva = new Date(fechaActual);
    nueva.setDate(nueva.getDate() + 7);
    setFechaActual(nueva);
  };

  // ─── CÁLCULO DE DÍAS ────────────────────────────────────────────────────
  /**
   * Calcula los 7 días de la semana actual (lunes a domingo)
   * @param {Date} fecha - Fecha de referencia
   * @returns {Date[]} Array con los 7 días de la semana
   */
  const obtenerDiasSemana = (fecha) => {
    const dias = [];
    const lunes = new Date(fecha);
    const diaActual = lunes.getDay() || 7; // Convertir domingo (0) a 7
    lunes.setDate(lunes.getDate() - (diaActual - 1)); // Ir al lunes

    for (let i = 0; i < 7; i++) {
      const dia = new Date(lunes);
      dia.setDate(dia.getDate() + i);
      dias.push(dia);
    }
    return dias;
  };

  /**
   * Calcula todos los días visibles en el calendario mensual
   * (incluye días del mes anterior y siguiente para rellenar la cuadrícula)
   * @param {Date} fecha - Fecha de referencia (cualquier día del mes)
   * @returns {Array<{fecha: Date, esOtroMes: boolean}>}
   */
  const obtenerDiasMes = (fecha) => {
    const año = fecha.getFullYear();
    const mes = fecha.getMonth();
    const primerDia = new Date(año, mes, 1); // Día 1 del mes
    const ultimoDia = new Date(año, mes + 1, 0); // Último día del mes
    const dias = [];

    // Días del mes anterior para rellenar la primera semana
    const diaInicio = primerDia.getDay() || 7; // 1=Lun, 7=Dom
    for (let i = 1; i < diaInicio; i++) {
      dias.push({
        fecha: new Date(año, mes, 1 - (diaInicio - i)),
        esOtroMes: true, // Se muestra atenuado
      });
    }

    // Días del mes actual
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push({ fecha: new Date(año, mes, i), esOtroMes: false });
    }

    return dias;
  };

  // ─── FILTROS ────────────────────────────────────────────────────────────
  /**
   * Filtra los eventos según los criterios seleccionados (materia y tipo)
   */
  const eventosFiltrados = eventos.filter((evento) => {
    if (filtroMateria !== "todas" && evento.materia_id !== filtroMateria) {
      return false;
    }
    if (filtroTipo !== "todos" && evento.tipo !== filtroTipo) {
      return false;
    }
    return true;
  });

  /**
   * Obtiene los eventos que ocurren en una fecha específica
   * @param {Date} fecha - Día a consultar
   * @returns {Array} Eventos de ese día
   */
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
  /**
   * Crea o actualiza un evento en Supabase
   * Si hay eventoEditando, hace UPDATE; si no, hace INSERT
   * @param {Object} datosEvento - Datos del formulario
   */
  const handleGuardarEvento = async (datosEvento) => {
    try {
      if (eventoEditando) {
        // Actualizar evento existente
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
        // Insertar nuevo evento
        const { error } = await supabase.from("eventos").insert([
          {
            titulo: datosEvento.titulo,
            descripcion: datosEvento.descripcion,
            materia_id: datosEvento.materiaId,
            materia_nombre: datosEvento.materiaNombre,
            tipo: datosEvento.tipo,
            fecha: datosEvento.fecha,
            carrera_id: session.carreraId, // Se asocia a la carrera del usuario
          },
        ]);

        if (error) throw error;
      }

      // Cierra el modal y limpia el estado de edición
      setMostrarModal(false);
      setEventoEditando(null);
    } catch (err) {
      throw err; // El error lo maneja el modal
    }
  };

  /**
   * Elimina un evento de Supabase (con confirmación)
   * @param {string} eventoId - UUID del evento a eliminar
   */
  const handleEliminarEvento = async (eventoId) => {
    if (!confirm("¿Estás seguro de eliminar este evento?")) return;

    try {
      const { error } = await supabase
        .from("eventos")
        .delete()
        .eq("id", eventoId);

      if (error) throw error;

      setMostrarModal(false);
      setEventoEditando(null);
    } catch (err) {
      setError(err.message);
    }
  };

  // ─── FORMATEO ───────────────────────────────────────────────────────────
  /**
   * Formatea una fecha ISO a texto legible en español sin hora
   * Ej: "dom, 10 de mayo"
   * @param {string} fecha - Fecha en formato ISO
   * @returns {string} Fecha formateada
   */
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
        <div
          style={{
            fontSize: ".75rem",
            textTransform: "uppercase",
            letterSpacing: "3px",
            color: "var(--text-dim)",
            fontFamily: "Space Mono, monospace",
            marginBottom: ".5rem",
          }}
        >
          Calendario Académico
        </div>
        <h1 style={{ fontSize: "1.0rem", fontWeight: "500", margin: 0 }}>
          Agenda
        </h1>
      </div>

      {/* ─── BARRA DE CONTROLES ────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        {/* Navegación: flechas + título del mes/semana + botón Hoy */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={vista === "mensual" ? irMesAnterior : irSemanaAnterior}
            className="btn-logout"
          >
            ←
          </button>
          <span
            style={{
              fontSize: "1rem",
              fontWeight: "600",
              minWidth: "200px",
              textAlign: "center",
            }}
          >
            {vista === "mensual"
              ? `${MESES[fechaActual.getMonth()]} ${fechaActual.getFullYear()}`
              : `Semana del ${diasSemana[0]?.getDate() || ""} al ${diasSemana[6]?.getDate() || ""} de ${MESES[diasSemana[0]?.getMonth() || fechaActual.getMonth()]}`}
          </span>
          <button
            onClick={vista === "mensual" ? irMesSiguiente : irSemanaSiguiente}
            className="btn-logout"
          >
            →
          </button>
          <button
            onClick={irHoy}
            style={{
              marginLeft: "0.5rem",
              padding: "0.4rem 0.8rem",
              border: "1px solid var(--border2)",
              borderRadius: "6px",
              background: "transparent",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontFamily: "Space Mono, monospace",
              fontSize: "0.7rem",
            }}
          >
            Hoy
          </button>
        </div>

        {/* Botones derecha: notificaciones + toggle vista + nuevo evento */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* Campana de notificaciones con badge de cantidad */}
          {notificaciones.length > 0 && (
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setMostrarNotificaciones(!mostrarNotificaciones)}
                style={{
                  padding: "0.5rem",
                  borderRadius: "50%",
                  border: "1px solid var(--border2)",
                  background: "transparent",
                  color: "var(--accent)",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  position: "relative",
                }}
              >
                🔔
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--bloqueada-t)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    fontSize: "0.6rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "bold",
                  }}
                >
                  {notificaciones.length}
                </span>
              </button>
              {/* Dropdown de notificaciones */}
              {mostrarNotificaciones && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "8px",
                    background: "var(--bg3)",
                    border: "1px solid var(--border2)",
                    borderRadius: "12px",
                    padding: "0.75rem",
                    minWidth: "300px",
                    maxHeight: "300px",
                    overflowY: "auto",
                    zIndex: 300,
                    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--accent)",
                      marginBottom: "0.5rem",
                      fontFamily: "Space Mono, monospace",
                      fontWeight: "600",
                    }}
                  >
                    PRÓXIMOS EVENTOS
                  </div>
                  {notificaciones.map((evento) => (
                    <div
                      key={evento.id}
                      style={{
                        padding: "0.5rem",
                        borderBottom: "1px solid var(--border)",
                        fontSize: "0.7rem",
                      }}
                    >
                      <div
                        style={{
                          fontWeight: "600",
                          color: COLORES_TIPO[evento.tipo],
                        }}
                      >
                        {ICONOS_TIPO[evento.tipo]} {evento.titulo}
                      </div>
                      <div
                        style={{
                          color: "var(--text-dim)",
                          fontSize: "0.65rem",
                        }}
                      >
                        {evento.materia_nombre} · {formatearFecha(evento.fecha)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Toggle vista mensual / semanal */}
          <div
            style={{
              display: "flex",
              borderRadius: "8px",
              overflow: "hidden",
              border: "1px solid var(--border2)",
            }}
          >
            <button
              onClick={() => setVista("mensual")}
              style={{
                padding: "0.4rem 0.8rem",
                border: "none",
                background:
                  vista === "mensual" ? "var(--accent)" : "transparent",
                color: vista === "mensual" ? "#000" : "var(--text-dim)",
                cursor: "pointer",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.7rem",
              }}
            >
              Mes
            </button>
            <button
              onClick={() => setVista("semanal")}
              style={{
                padding: "0.4rem 0.8rem",
                border: "none",
                background:
                  vista === "semanal" ? "var(--accent)" : "transparent",
                color: vista === "semanal" ? "#000" : "var(--text-dim)",
                cursor: "pointer",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.7rem",
              }}
            >
              Semana
            </button>
          </div>

          {/* Botón para crear nuevo evento */}
          <button
            onClick={() => {
              setEventoEditando(null); // null = modo creación
              setMostrarModal(true);
            }}
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent)",
              color: "#000",
              fontWeight: "600",
              cursor: "pointer",
              fontFamily: "Space Mono, monospace",
              fontSize: "0.75rem",
            }}
          >
            + Nuevo
          </button>
        </div>
      </div>

      {/* ─── FILTROS ───────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* Selector de materia */}
        <select
          value={filtroMateria}
          onChange={(e) => setFiltroMateria(e.target.value)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid var(--border2)",
            background: "var(--bg3)",
            color: "var(--text)",
            fontFamily: "Space Mono, monospace",
            fontSize: "0.7rem",
          }}
        >
          <option value="todas">Todas las materias</option>
          {materias.map((m) => (
            <option key={m.codigoMateria} value={m.codigoMateria}>
              {m.materia}
            </option>
          ))}
        </select>

        {/* Selector de tipo de evento */}
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          style={{
            padding: "0.4rem 0.8rem",
            borderRadius: "6px",
            border: "1px solid var(--border2)",
            background: "var(--bg3)",
            color: "var(--text)",
            fontFamily: "Space Mono, monospace",
            fontSize: "0.7rem",
          }}
        >
          <option value="todos">Todos los tipos</option>
          <option value="parcial">📝 Parcial</option>
          <option value="final">📚 Examen Final</option>
          <option value="tarea">📋 Tarea</option>
          <option value="otro">📌 Otro</option>
        </select>
      </div>

      {/* ─── VISTA MENSUAL ──────────────────────────────────────────────── */}
      {vista === "mensual" && (
        <div
          style={{
            background: "var(--bg3)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Fila con los nombres de los días */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg2)",
            }}
          >
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                style={{
                  padding: "0.75rem",
                  textAlign: "center",
                  fontSize: "0.7rem",
                  fontWeight: "600",
                  color: "var(--text-dim)",
                  fontFamily: "Space Mono, monospace",
                }}
              >
                {dia}
              </div>
            ))}
          </div>

          {/* Cuadrícula de días del mes */}
          <div
            style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}
          >
            {dias.map(({ fecha, esOtroMes }, index) => {
              // Verifica si este día es hoy
              const esHoy =
                fecha.getDate() === hoy.getDate() &&
                fecha.getMonth() === hoy.getMonth() &&
                fecha.getFullYear() === hoy.getFullYear();

              const eventosHoy = eventosDelDia(fecha);

              return (
                <div
                  key={index}
                  style={{
                    minHeight: "100px",
                    padding: "0.5rem",
                    border: "1px solid var(--border)",
                    background: esHoy
                      ? "rgba(29,185,84,0.05)" // Resalta el día actual
                      : esOtroMes
                        ? "var(--bg2)" // Días de otros meses atenuados
                        : "transparent",
                    opacity: esOtroMes ? 0.5 : 1,
                  }}
                >
                  {/* Número del día */}
                  <div
                    style={{
                      fontSize: "0.75rem",
                      fontWeight: esHoy ? "700" : "400",
                      marginBottom: "4px",
                      fontFamily: "Space Mono, monospace",
                      textAlign: "center",
                      width: esHoy ? "24px" : "auto",
                      height: esHoy ? "24px" : "auto",
                      lineHeight: esHoy ? "24px" : "normal",
                      borderRadius: esHoy ? "50%" : "0",
                      background: esHoy ? "var(--accent)" : "transparent",
                      color: esHoy ? "#000" : "var(--text-dim)",
                      margin: esHoy ? "0 auto 4px" : "0 0 4px 0",
                    }}
                  >
                    {fecha.getDate()}
                  </div>

                  {/* Eventos del día (máximo 3 visibles) */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                    }}
                  >
                    {eventosHoy.slice(0, 3).map((evento) => (
                      <div
                        key={evento.id}
                        title={`${evento.titulo} - ${evento.materia_nombre || ""}`}
                        onClick={() => {
                          setEventoEditando(evento);
                          setMostrarModal(true);
                        }}
                        style={{
                          fontSize: "0.6rem",
                          padding: "2px 4px",
                          borderRadius: "3px",
                          background:
                            COLORES_TIPO[evento.tipo] || "var(--accent)",
                          color: "#000",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          cursor: "pointer",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {ICONOS_TIPO[evento.tipo]} {evento.titulo}
                      </div>
                    ))}
                    {eventosHoy.length > 3 && (
                      <div
                        style={{
                          fontSize: "0.55rem",
                          color: "var(--text-dim)",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        +{eventosHoy.length - 3} más
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
        <div
          style={{
            background: "var(--bg3)",
            borderRadius: "12px",
            border: "1px solid var(--border)",
            overflow: "hidden",
          }}
        >
          {/* Encabezados de los días de la semana */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              borderBottom: "1px solid var(--border)",
              background: "var(--bg2)",
            }}
          >
            {diasSemana.map((fecha, index) => {
              const esHoy =
                fecha.getDate() === hoy.getDate() &&
                fecha.getMonth() === hoy.getMonth() &&
                fecha.getFullYear() === hoy.getFullYear();

              return (
                <div
                  key={index}
                  style={{
                    padding: "0.5rem",
                    textAlign: "center",
                    background: esHoy ? "rgba(29,185,84,0.1)" : "transparent",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--text-dim)",
                      fontFamily: "Space Mono, monospace",
                    }}
                  >
                    {DIAS_SEMANA[index]}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: esHoy ? "700" : "400",
                      color: esHoy ? "var(--accent)" : "var(--text)",
                    }}
                  >
                    {fecha.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Columnas con eventos de cada día */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              minHeight: "300px",
            }}
          >
            {diasSemana.map((fecha, index) => {
              const eventosHoy = eventosDelDia(fecha);

              return (
                <div
                  key={index}
                  style={{
                    padding: "0.5rem",
                    border: "1px solid var(--border)",
                    minHeight: "100%",
                  }}
                >
                  {eventosHoy.map((evento) => (
                    <div
                      key={evento.id}
                      onClick={() => {
                        setEventoEditando(evento);
                        setMostrarModal(true);
                      }}
                      style={{
                        fontSize: "0.65rem",
                        padding: "6px 8px",
                        borderRadius: "6px",
                        background:
                          COLORES_TIPO[evento.tipo] || "var(--accent)",
                        color: "#000",
                        marginBottom: "4px",
                        cursor: "pointer",
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      <div style={{ fontWeight: "600" }}>
                        {ICONOS_TIPO[evento.tipo]} {evento.titulo}
                      </div>
                      <div style={{ fontSize: "0.55rem", opacity: 0.8 }}>
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
        <div
          style={{
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "2px",
            color: "var(--accent)",
            marginBottom: "1rem",
            fontFamily: "Space Mono, monospace",
          }}
        >
          Próximos eventos
        </div>
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
        >
          {notificaciones.length === 0 && (
            <div
              style={{
                padding: "1rem",
                color: "var(--text-dim)",
                fontSize: "0.8rem",
                fontFamily: "Space Mono, monospace",
                textAlign: "center",
                background: "var(--bg3)",
                borderRadius: "8px",
              }}
            >
              No hay eventos próximos en los siguientes 3 días
            </div>
          )}
          {notificaciones.map((evento) => {
            const materia = materias.find(
              (m) => m.codigoMateria === evento.materia_id,
            );
            return (
              <div
                key={evento.id}
                onClick={() => {
                  setEventoEditando(evento);
                  setMostrarModal(true);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.75rem 1rem",
                  background: "var(--bg3)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = COLORES_TIPO[evento.tipo];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                {/* Círculo de color según tipo */}
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "8px",
                    background: COLORES_TIPO[evento.tipo],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  {ICONOS_TIPO[evento.tipo]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "600", fontSize: "0.85rem" }}>
                    {evento.titulo}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>
                    {materia?.materia || evento.materia_nombre} ·{" "}
                    {formatearFecha(evento.fecha)}
                  </div>
                </div>
                {/* Etiqueta del tipo */}
                <div
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "20px",
                    background: COLORES_TIPO[evento.tipo],
                    color: "#000",
                    fontFamily: "Space Mono, monospace",
                    fontWeight: "600",
                  }}
                >
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
    </div>
  );
}

// ─── COMPONENTE MODAL ──────────────────────────────────────────────────────
/**
 * ModalEvento - Formulario para crear o editar un evento académico
 *
 * Incluye un minicalendario personalizado que se despliega hacia arriba
 * para seleccionar la fecha sin necesidad de escribir manualmente.
 *
 * @param {Object}   evento    - Evento a editar (null si es nuevo)
 * @param {Array}    materias  - Lista de materias disponibles
 * @param {Function} onSave    - Callback al guardar
 * @param {Function} onDelete  - Callback al eliminar (solo en edición)
 * @param {Function} onClose   - Callback al cerrar
 */
function ModalEvento({ evento, materias, onSave, onDelete, onClose }) {
  // Estado del formulario
  const [form, setForm] = useState({
    titulo: evento?.titulo || "",
    descripcion: evento?.descripcion || "",
    materiaId: evento?.materia_id || "",
    materiaNombre: evento?.materia_nombre || "",
    tipo: evento?.tipo || "parcial",
    // Solo fecha (YYYY-MM-DD), sin hora
    fecha: evento?.fecha
      ? new Date(evento.fecha).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  });
  const [error, setError] = useState(""); // Error de validación
  const [saving, setSaving] = useState(false); // Estado de guardado
  const [mostrarCalendario, setMostrarCalendario] = useState(false); // Toggle del minicalendario

  // Fecha seleccionada como objeto Date para el calendario
  const fechaSeleccionada = new Date(form.fecha + "T00:00:00");

  // Mes y año que muestra el calendario (puede diferir de la fecha seleccionada)
  const [calendarioMes, setCalendarioMes] = useState(
    fechaSeleccionada.getMonth(),
  );
  const [calendarioAnio, setCalendarioAnio] = useState(
    fechaSeleccionada.getFullYear(),
  );

  // Constantes para el calendario
  const MESES_CAL = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  const DIAS_SEMANA_CAL = ["L", "M", "M", "J", "V", "S", "D"];

  /**
   * Genera la cuadrícula de días para el minicalendario
   * @param {number} mes  - 0-11
   * @param {number} anio - Año completo
   * @returns {Array<number|null>} Días del mes (null = vacío)
   */
  const obtenerDiasCalendario = (mes, anio) => {
    const primerDia = new Date(anio, mes, 1);
    const ultimoDia = new Date(anio, mes + 1, 0);
    const dias = [];

    // Rellenar con null los días antes del primer día del mes
    const diaInicio = primerDia.getDay() || 7; // Lunes = 1, Domingo = 7
    for (let i = 1; i < diaInicio; i++) {
      dias.push(null);
    }

    // Agregar los días del mes
    for (let i = 1; i <= ultimoDia.getDate(); i++) {
      dias.push(i);
    }

    return dias;
  };

  /**
   * Cambia el mes mostrado en el calendario
   * @param {number} delta - -1 para anterior, +1 para siguiente
   */
  const cambiarMes = (delta) => {
    let nuevoMes = calendarioMes + delta;
    let nuevoAnio = calendarioAnio;
    if (nuevoMes < 0) {
      nuevoMes = 11;
      nuevoAnio--;
    } else if (nuevoMes > 11) {
      nuevoMes = 0;
      nuevoAnio++;
    }
    setCalendarioMes(nuevoMes);
    setCalendarioAnio(nuevoAnio);
  };

  /**
   * Selecciona una fecha del calendario y lo cierra
   * @param {number} dia - Día del mes seleccionado
   */
  const seleccionarFecha = (dia) => {
    // Formato YYYY-MM-DD
    const fechaStr = `${calendarioAnio}-${String(calendarioMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    setForm({ ...form, fecha: fechaStr });
    setMostrarCalendario(false);
  };

  /**
   * Convierte una fecha YYYY-MM-DD a texto legible
   * Ej: "2026-06-15" → "15 de Junio de 2026"
   */
  const formatearFechaVisual = (fechaStr) => {
    if (!fechaStr) return "Seleccionar fecha";
    const [anio, mes, dia] = fechaStr.split("-");
    return `${parseInt(dia)} de ${MESES_CAL[parseInt(mes) - 1]} de ${anio}`;
  };

  /**
   * Valida y envía el formulario
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validaciones
    if (!form.titulo.trim()) {
      setError("El título es obligatorio");
      return;
    }
    if (!form.materiaId) {
      setError("Debe seleccionar una materia");
      return;
    }
    if (!form.fecha) {
      setError("Debe seleccionar una fecha");
      return;
    }

    setSaving(true);

    // Busca el nombre de la materia por si no viene en el form
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

  // Referencia para comparar "hoy"
  const hoy = new Date();

  /** Verifica si un día del calendario es hoy */
  const esHoy = (dia) => {
    return (
      dia === hoy.getDate() &&
      calendarioMes === hoy.getMonth() &&
      calendarioAnio === hoy.getFullYear()
    );
  };

  /** Verifica si un día del calendario es el seleccionado */
  const esSeleccionado = (dia) => {
    const fechaComparar = `${calendarioAnio}-${String(calendarioMes + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    return fechaComparar === form.fecha;
  };

  const dias = obtenerDiasCalendario(calendarioMes, calendarioAnio);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()} // Cierra al clickear fuera
    >
      <div
        style={{
          background: "var(--bg3)",
          border: "1px solid var(--border2)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "480px",
          padding: "1.75rem",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Encabezado del modal */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h3 style={{ fontSize: "1rem", fontWeight: "600" }}>
            {evento ? "Editar Evento" : "Nuevo Evento"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-dim)",
              cursor: "pointer",
              fontSize: "1.2rem",
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Campo: Título */}
          <div className="field">
            <label>Título</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej: Parcial de Física II"
              required
            />
          </div>

          {/* Campo: Descripción */}
          <div className="field">
            <label>Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) =>
                setForm({ ...form, descripcion: e.target.value })
              }
              placeholder="Temas, aula, detalles..."
              rows={3}
              style={{
                width: "100%",
                background: "var(--bg)",
                border: "1px solid var(--border2)",
                borderRadius: "var(--radius)",
                padding: "0.8rem 1rem",
                color: "var(--text)",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
                resize: "vertical",
              }}
            />
          </div>

          {/* Campo: Materia (select con las materias que cursa) */}
          <div className="field">
            <label>Materia</label>
            <select
              value={form.materiaId}
              onChange={(e) => setForm({ ...form, materiaId: e.target.value })}
              required
              style={{
                width: "100%",
                background: "var(--bg)",
                border: "1px solid var(--border2)",
                borderRadius: "var(--radius)",
                padding: "0.8rem 1rem",
                color: "var(--text)",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
              }}
            >
              <option value="">Seleccionar materia</option>
              {materias.map((m) => (
                <option key={m.codigoMateria} value={m.codigoMateria}>
                  {m.materia}
                </option>
              ))}
            </select>
          </div>

          {/* Campo: Tipo de evento */}
          <div className="field">
            <label>Tipo de evento</label>
            <select
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              style={{
                width: "100%",
                background: "var(--bg)",
                border: "1px solid var(--border2)",
                borderRadius: "var(--radius)",
                padding: "0.8rem 1rem",
                color: "var(--text)",
                fontFamily: "Space Mono, monospace",
                fontSize: "0.85rem",
              }}
            >
              <option value="parcial">📝 Parcial</option>
              <option value="final">📚 Examen Final</option>
              <option value="tarea">📋 Tarea</option>
              <option value="otro">📌 Otro</option>
            </select>
          </div>

          {/* ─── SELECTOR DE FECHA CON MINICALENDARIO ──────────────────── */}
          <div className="field">
            <label>Fecha del examen</label>
            <div style={{ position: "relative" }}>
              {/* Botón que muestra la fecha seleccionada */}
              <button
                type="button"
                onClick={() => {
                  setMostrarCalendario(!mostrarCalendario);
                  // Al abrir, sincroniza el calendario con la fecha seleccionada
                  if (!mostrarCalendario) {
                    setCalendarioMes(fechaSeleccionada.getMonth());
                    setCalendarioAnio(fechaSeleccionada.getFullYear());
                  }
                }}
                style={{
                  width: "100%",
                  padding: "0.8rem 1rem",
                  background: "var(--bg)",
                  border: mostrarCalendario
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border2)",
                  borderRadius: "var(--radius)",
                  color: "var(--text)",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>📅 {formatearFechaVisual(form.fecha)}</span>
                {/* Flecha que indica dirección de apertura (hacia arriba) */}
                <span style={{ color: "var(--text-dim)", fontSize: "0.7rem" }}>
                  {mostrarCalendario ? "▼" : "▲"}
                </span>
              </button>

              {/* Minicalendario desplegable hacia ARRIBA */}
              {mostrarCalendario && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%", // Se despliega hacia arriba
                    left: 0,
                    right: 0,
                    marginBottom: "4px",
                    background: "var(--bg2)",
                    border: "1px solid var(--accent)",
                    borderRadius: "12px",
                    padding: "1rem",
                    zIndex: 500,
                    boxShadow: "0 -8px 30px rgba(0,0,0,0.6)", // Sombra hacia arriba
                  }}
                >
                  {/* Navegación del mes: ← Mes Año → */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1rem",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => cambiarMes(-1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      ←
                    </button>
                    <span
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: "600",
                        color: "var(--text)",
                      }}
                    >
                      {MESES_CAL[calendarioMes]} {calendarioAnio}
                    </span>
                    <button
                      type="button"
                      onClick={() => cambiarMes(1)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--accent)",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        padding: "0.25rem 0.5rem",
                      }}
                    >
                      →
                    </button>
                  </div>

                  {/* Nombres de los días de la semana */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: "4px",
                      marginBottom: "4px",
                    }}
                  >
                    {DIAS_SEMANA_CAL.map((dia, i) => (
                      <div
                        key={i}
                        style={{
                          textAlign: "center",
                          fontSize: "0.65rem",
                          fontWeight: "600",
                          color: "var(--text-dim)",
                          padding: "4px 0",
                          fontFamily: "Space Mono, monospace",
                        }}
                      >
                        {dia}
                      </div>
                    ))}
                  </div>

                  {/* Cuadrícula de días */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: "4px",
                    }}
                  >
                    {dias.map((dia, index) => {
                      if (dia === null) {
                        return <div key={`empty-${index}`} />; // Espacio vacío
                      }

                      const isHoy = esHoy(dia);
                      const isSelected = esSeleccionado(dia);

                      return (
                        <button
                          key={index}
                          type="button"
                          onClick={() => seleccionarFecha(dia)}
                          style={{
                            padding: "8px 0",
                            textAlign: "center",
                            fontSize: "0.75rem",
                            fontWeight: isSelected ? "700" : "400",
                            fontFamily: "Space Mono, monospace",
                            borderRadius: "8px",
                            border: isSelected
                              ? "2px solid var(--accent)"
                              : "1px solid transparent",
                            background: isSelected
                              ? "rgba(29,185,84,0.2)" // Día seleccionado
                              : isHoy
                                ? "rgba(29,185,84,0.08)" // Día actual
                                : "transparent",
                            color: isSelected
                              ? "var(--accent)"
                              : isHoy
                                ? "var(--accent)"
                                : "var(--text)",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background =
                                "rgba(29,185,84,0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = isHoy
                                ? "rgba(29,185,84,0.08)"
                                : "transparent";
                            }
                          }}
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

          {/* Mensaje de error */}
          {error && <div className="error-msg">{error}</div>}

          {/* Botones de acción */}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
              style={{ flex: 1 }}
            >
              {saving ? "Guardando..." : evento ? "Actualizar" : "Crear Evento"}
            </button>
            {/* Botón de eliminar (solo visible en edición) */}
            {onDelete && (
              <button
                type="button"
                onClick={() => onDelete(evento.id)}
                style={{
                  padding: "0.9rem",
                  borderRadius: "500px",
                  border: "1px solid var(--bloqueada-t)",
                  background: "transparent",
                  color: "var(--bloqueada-t)",
                  fontFamily: "Space Mono, monospace",
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Eliminar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}