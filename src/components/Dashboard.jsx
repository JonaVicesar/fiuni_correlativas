import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import Spinner from "./Spinner";
import MateriaModal from "./MateriaModal";
import Libreta from "./Libreta";

// ─── Utilidad para limpiar asteriscos ──────────────────────────────────
function limpiarNombre(nombre) {
  return (nombre || "").replace(/\*+$/, "").trim();
}

function colorAsistencia(porcentaje) {
  if (porcentaje >= 75) return "var(--aprobada)";
  if (porcentaje >= 60) return "var(--disponible)";
  return "var(--bloqueada-t)";
}

function colorPP(porcentaje) {
  if (porcentaje >= 50) return "var(--aprobada)";
  if (porcentaje >= 20) return "var(--disponible)";
  return "var(--bloqueada-t)";
}

export default function Dashboard({ session }) {
  const [materias, setMaterias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalMateria, setModalMateria] = useState(null);
  const [historialMaterias, setHistorialMaterias] = useState(null);
  const [mapaMaterias, setMapaMaterias] = useState(null);
  const [mostrarLibreta, setMostrarLibreta] = useState(false);

  // carga las materias actuales
  useEffect(() => {
    apiFetch("/materias", { token: session.token })
      .then((data) => {
        const materiasLimpias = data
          .filter((m) => m.anho === new Date().getFullYear())
          .map((m) => ({ ...m, materia: limpiarNombre(m.materia) }));
        setMaterias(materiasLimpias);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [session.token]);

  // carga todas las materias de todo el tiempo
  useEffect(() => {
    if (!session?.token) return;
    apiFetch("/mis-materias", { token: session.token })
      .then(setHistorialMaterias)
      .catch(() => setHistorialMaterias([]));
  }, [session.token]);

  // carga el mapa de correlativas
  useEffect(() => {
    if (!session?.token) return;
    const query = session.carreraId ? `?carrera_id=${session.carreraId}` : "";
    apiFetch(`/mapa${query}`, { token: session.token })
      .then((data) => setMapaMaterias(data?.materias || []))
      .catch(() => setMapaMaterias([]));
  }, [session.token, session.carreraId]);

  if (loading) return <Spinner texto="Cargando tus materias..." />;
  if (error)
    return (
      <div className="error-msg" style={{ padding: "2rem" }}>
        ⚠ {error}
      </div>
    );

  return (
    <div className="main">
      <div style={{ marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
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
              {session.carrera || "Informática"} - {new Date().getFullYear()}
            </div>
            <h1 style={{ fontSize: "1.0rem", fontWeight: "500", margin: 0 }}>
              {mostrarLibreta ? "Libreta de notas" : "Mis materias"}
            </h1>
          </div>

          {/* boton para cambiar entre secciones*/}
          <button
            onClick={() => setMostrarLibreta(!mostrarLibreta)}
            style={{
              background: mostrarLibreta ? "var(--accent)" : "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "Space Mono, monospace",
              fontSize: ".75rem",
              fontWeight: "600",
              color: mostrarLibreta ? "white" : "var(--text-dim)",
              transition: "all 0.2s",
            }}
          >
            {mostrarLibreta ? "Mis materias" : "Libreta"}
          </button>
        </div>

        {!mostrarLibreta && (
          <span
            style={{
              fontSize: ".7rem",
              color: "var(--text-dim)",
              fontFamily: "Space Mono, monospace",
              display: "block",
              marginTop: ".5rem",
            }}
          >
            Click en cualquier materia para ver su detalle
          </span>
        )}
      </div>

      {!mostrarLibreta ? (
        // vista de materias
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: "1rem",
          }}
        >
          {materias.map((m) => {
            const registro = m;
            const pp = registro?.porcentajePP ?? 0;
            const pAsistencia = registro?.porcentajeAsistencia ?? 0;

            return (
              <div
                key={m.id}
                className="card-materia"
                onClick={() => {
                  setModalMateria({
                    id: m.codigoMateria,
                    nombre: m.materia, // Ya viene limpio
                    semestre: m.semestre,
                    estado: "cursando",
                  });
                }}
                style={{ cursor: "pointer" }}
              >
                <div>
                  <div style={{ fontWeight: "700", fontSize: ".95rem" }}>
                    {m.materia} {/* Nombre limpio */}
                  </div>
                  <div
                    style={{
                      fontFamily: "Space Mono, monospace",
                      fontSize: ".7rem",
                      color: "var(--text-dim)",
                    }}
                  >
                    Cód. {m.codigoMateria} | {m.semestre} Semestre
                  </div>
                </div>

                {/*Asistencia */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: ".75rem",
                      marginBottom: ".3rem",
                    }}
                  >
                    <span style={{ color: "var(--text-dim)" }}>Asistencia</span>
                    <span
                      style={{
                        color: colorAsistencia(pAsistencia),
                        fontWeight: "700",
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      {pAsistencia}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "3px",
                      background: "var(--border)",
                      borderRadius: "2px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pAsistencia}%`,
                        background: colorAsistencia(pAsistencia),
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>

                {/*Promedio PP */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: ".75rem",
                      marginBottom: ".3rem",
                    }}
                  >
                    <span style={{ color: "var(--text-dim)" }}>
                      Promedio PP
                    </span>
                    <span
                      style={{
                        color: colorPP(pp),
                        fontWeight: "700",
                        fontFamily: "Space Mono, monospace",
                      }}
                    >
                      {pp}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: "3px",
                      background: "var(--border)",
                      borderRadius: "2px",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pp}%`,
                        background: colorPP(pp),
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    fontSize: ".65rem",
                    color: "var(--text-dim)",
                    fontFamily: "Space Mono, monospace",
                    borderTop: "1px solid var(--border)",
                    paddingTop: ".5rem",
                  }}
                ></div>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista de libreta
        <Libreta session={session} />
      )}

      {/*Modal de detalle*/}
      {modalMateria && (
        <MateriaModal
          materia={modalMateria}
          historialMaterias={historialMaterias}
          session={session}
          mapaMaterias={mapaMaterias}
          onClose={() => setModalMateria(null)}
        />
      )}
    </div>
  );
}