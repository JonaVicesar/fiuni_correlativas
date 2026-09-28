import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import Spinner from "./Spinner";
import MateriaModal from "./MateriaModal";
import Libreta from "./Libreta";

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
  const [seccion, setSeccion] = useState("materias"); // materias | libreta

  // carga las materias actuales
  useEffect(() => {
    apiFetch("/materias", { token: session.token })
      .then((data) =>
        setMaterias(data.filter((m) => m.anho === new Date().getFullYear())),
      )
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
  if (error) return <div className="error-msg dash-error">⚠ {error}</div>;

  return (
    <div className="main">
      <div className="dash-wrap">
        <div className="dash-header">
          <div>
            <div className="dash-carrera">
              {session.carrera || "Informática"} · {new Date().getFullYear()}
            </div>
            <h1 className="dash-titulo">
              {seccion === "libreta" ? "Libreta" : "Mis materias"}
            </h1>
          </div>
          <div className="dash-tabs">
            {[
              ["materias", "Mis materias"],
              ["libreta", "Libreta"],
            ].map(([v, label]) => (
              <button key={v} onClick={() => setSeccion(v)} className={`dash-tab ${seccion === v ? "activo" : ""}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {seccion === "materias" ? (
        <div className="dash-grid">
          {materias.map((m) => {
            const pp = m?.porcentajePP ?? 0;
            const pAsistencia = m?.porcentajeAsistencia ?? 0;
            return (
              <div
                key={m.id}
                className="card-materia dash-card-clickable"
                onClick={() => setModalMateria({ id: m.codigoMateria, nombre: m.materia, semestre: m.semestre, estado: "cursando" })}
              >
                <div>
                  <div className="dash-card-nombre">{m.materia}</div>
                  <div className="dash-card-codigo">Cód. {m.codigoMateria} · {m.semestre}° Semestre</div>
                </div>
                <div>
                  <div className="dash-card-meta-row">
                    <span className="dash-card-meta-label">Asistencia</span>
                    <span className="dash-card-meta-valor" style={{color: colorAsistencia(pAsistencia)}}>{pAsistencia}%</span>
                  </div>
                  <div className="dash-bar"><div className="dash-bar-fill" style={{width: `${pAsistencia}%`, background: colorAsistencia(pAsistencia)}} /></div>
                </div>
                <div>
                  <div className="dash-card-meta-row">
                    <span className="dash-card-meta-label">Promedio PP</span>
                    <span className="dash-card-meta-valor" style={{color: colorPP(pp)}}>{pp}%</span>
                  </div>
                  <div className="dash-bar"><div className="dash-bar-fill" style={{width: `${pp}%`, background: colorPP(pp)}} /></div>
                </div>
                <div className="dash-card-foot"></div>
              </div>
            );
          })}
        </div>
      ) : (
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
          onNavigate={(m) => setModalMateria(m)} // nuevo prop, abre la materia clickeada en un nuevo modal
        />
      )}
    </div>
  );
}
