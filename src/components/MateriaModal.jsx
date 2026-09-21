import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import { ESTADO_LABELS } from "../constants";
import "../styles/components/materia-modal.css";

//constantes de notas
const NOTAS = [
  { nota: 5, pcMin: 90 },
  { nota: 4, pcMin: 80 },
  { nota: 3, pcMin: 70 },
  { nota: 2, pcMin: 60 },
];

/**
 * calcula un porcentaje minimo en el examen final para alcanzar una nota
 *
 * Formula
 * Si PF >= PP -> PC = PF
 * Si PP > PF -> PC = PPx0.4 + PFx0.6
 * Es requerido minino un 60 en el final
 */
function pfNecesario(pp, pcObjetivo) {
  const pfObjetivo = (pcObjetivo - pp * 0.4) / 0.6;

  //si el pfObjetivo es menor a 60 (nota 2), retorna 60
  if (pfObjetivo <= 60) return pcObjetivo;

  if (pfObjetivo >= pp) return pcObjetivo; // si pfObjetivo ya es mayor o igual al pp el minimo es pcObjetivo (no tiene sentido que si pfObjetivo es <= 99  el minimo requerido sea ese)
  return Math.round(pfObjetivo);
}

function colorPP(pp) {
  if (pp >= 50) return "var(--aprobada)";
  if (pp >= 20) return "var(--disponible)";
  return "var(--bloqueada-t)";
}

function colorAsistencia(pct) {
  if (pct >= 75) return "var(--aprobada)";
  if (pct >= 60) return "var(--disponible)";
  return "var(--bloqueada-t)";
}

/**
 * formatea la fecha a "Vie 14 de mar 2025"
 */
function formatFecha(isoStr) {
  const d = new Date(isoStr);
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const meses = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Seccion colapsable, se usa dentro del modal
 */
function Seccion({ titulo, children, defaultAbierta = false }) {
  const [abierta, setAbierta] = useState(defaultAbierta);
  return (
    <div className="mm-seccion">
      <button onClick={() => setAbierta(!abierta)} className="mm-seccion-btn">
        <span className="mm-seccion-titulo">{titulo}</span>
        <span className="mm-seccion-icon">{abierta ? "▲" : "▼"}</span>
      </button>
      {abierta && <div className="mm-seccion-body">{children}</div>}
    </div>
  );
}

//Componente principal
export default function MateriaModal({
  materia,
  historialMaterias,
  session,
  mapaMaterias, // para obtener correlativas
  onClose,
  onNavigate, // agrego nuevo prop para navegar entre modales al clickear una materia  en la parte de "necesita aprobadas" y "habilita"
}) {
  const [asistencia, setAsistencia] = useState(null);
  const [cargandoAsist, setCargandoAsist] = useState(false);
  const [faltasCargadas, setFaltasCargadas] = useState(false);
  const [filtroAsist, setFiltroAsist] = useState("ausentes"); // todas | ausentes | presentes | sincargar

  if (!materia) return null;  

  const { nombre, id, semestre, creditos, estado } = materia;

  // busca el registro de la materia clickeada, el pp y asistencia
  const registro = (historialMaterias || []).find((h) => {
    const hn = h.nombreMateria?.toLowerCase().replace(/\*/g, "").trim();
    //console.log("hn", hn);
    const mn = nombre?.toLowerCase().replace(/\*/g, "").trim();
    return h.codigoMateria?.trim() === id || hn === mn;
  });
  //console.log("registro", registro);

  const pp = registro?.porcentajePP ?? 0;
  const asistPct = registro?.porcentajeAsistencia ?? 0;
  const periodo = registro?.periodo?.label ?? "";
  const materiaPeriodoId = registro?.materiaPeriodoId; // para cargar las faltas

  const tienePP = pp > 0 || asistPct > 0;

  const estadoPp = pp >= 50 ? "final" : pp >= 20 ? "recuperatorio" : "recursa";

  //busca la materia en el mapa por ID o por nombre
  const materiaEnMapa = mapaMaterias?.find(
    (m) =>
      m.id === id ||
      m.nombre?.toLowerCase().replace(/\*/g, "").trim() ===
        nombre?.toLowerCase().replace(/\*/g, "").trim(),
  );

  const correlativas = materiaEnMapa?.correlativas || [];
  const correlativasRegular = materiaEnMapa?.correlativas_regular || [];

  // materias que se habilita esta materia
  const desbloquea =
    mapaMaterias?.filter(
      (m) =>
        m.correlativas?.includes(materiaEnMapa?.id) ||
        m.correlativas_regular?.includes(materiaEnMapa?.id),
    ) || [];

  //para buscar los nombres
  const mapaIds = Object.fromEntries(
    (mapaMaterias || []).map((m) => [m.id, m]),
  );

  function cargarFaltas() {
    if (faltasCargadas || !materiaPeriodoId || !session?.token) return;
    setFaltasCargadas(true);
    setCargandoAsist(true);
    apiFetch(`/asistencia/${materiaPeriodoId}`, {
      token: session.token,
      method: "POST",
    })
      .then(setAsistencia)
      .catch(() => setAsistencia({ error: true }))
      .finally(() => setCargandoAsist(false));
  }

  const faltas =
    asistencia && !asistencia.error
      ? (() => {
          const mapa = Object.fromEntries(
            (asistencia.studentAssists || []).map((sa) => [
              sa.assistanceId,
              sa.present,
            ]),
          );
          return (asistencia.assists || [])
            .filter((c) => mapa[c.id] === false)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        })()
      : [];

  const presentes =
    asistencia && !asistencia.error
      ? (() => {
          const mapa = Object.fromEntries(
            (asistencia.studentAssists || []).map((sa) => [
              sa.assistanceId,
              sa.present,
            ]),
          );
          return (asistencia.assists || []).filter((c) => mapa[c.id] === true)
            .length;
        })()
      : 0;

  const sinCargar =
    asistencia && !asistencia.error
      ? (() => {
          const mapa = Object.fromEntries(
            (asistencia.studentAssists || []).map((sa) => [
              sa.assistanceId,
              sa.present,
            ]),
          );
          return (asistencia.assists || []).filter((c) => mapa[c.id] == null)
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        })()
      : [];

  const totalClases = asistencia?.assists?.length ?? 0;

  useEffect(() => {
    setAsistencia(null);
    setFaltasCargadas(false);
    setCargandoAsist(false);
    setFiltroAsist("ausentes");
  }, [materia?.id, materiaPeriodoId]);

  useEffect(() => {
    if (tienePP && materiaPeriodoId && !faltasCargadas && !cargandoAsist && session?.token) {
      cargarFaltas();
    }
  }, [tienePP, materiaPeriodoId, faltasCargadas, cargandoAsist, session?.token]);

  return (
    <div className="mm-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mm-modal">
        <button onClick={onClose} className="mm-close">✕</button>

        <span className={`panel-estado-badge badge-${estado} mm-badge`}>{ESTADO_LABELS[estado]}</span>
        <div className="mm-titulo">{nombre}</div>
        <div className="mm-sub">
          {id} · Semestre {semestre}
          {creditos ? ` · ${creditos} créditos` : ""}
          {periodo ? ` · ${periodo}` : ""}
        </div>

        {tienePP ? (
          <div className="mm-pp-grid">
            <div className="mm-pp-card" style={{borderLeftColor: colorPP(pp)}}>
              <div className="mm-pp-label">PROMEDIO PP</div>
              <div className="mm-pp-valor" style={{color: colorPP(pp)}}>{pp}%</div>
              <div className="mm-pp-sub" style={{color: colorPP(pp)}}>
                {{final: "puede rendir final", recuperatorio: "solo recuperatorio", recursa: "recursa"}[estadoPp]}
              </div>
            </div>
            <div className="mm-pp-card" style={{borderLeftColor: colorAsistencia(asistPct)}}>
              <div className="mm-pp-label">ASISTENCIA</div>
              <div className="mm-pp-valor" style={{color: colorAsistencia(asistPct)}}>{asistPct}%</div>
              <div className="mm-pp-sub" style={{color: colorAsistencia(asistPct)}}>
                {asistPct >= 75 ? "regularidad ok" : asistPct >= 60 ? "en riesgo" : "sin regularidad"}
              </div>
            </div>
          </div>
        ) : (
          <div className="mm-sin-historial">Sin historial de cursado</div>
        )}

        {tienePP && estadoPp === "final" && (
          <Seccion titulo="Calculador de notas" defaultAbierta={true}>
            <div className="mm-calc-sub">Con PP {pp}% — mínimo necesario en el final:</div>
            {NOTAS.map(({ nota, pcMin }) => {
              const pf = pfNecesario(pp, pcMin);
              const imposible = pf > 100;
              return (
                <div key={nota} className="mm-nota-fila">
                  <span className="mm-nota-label">Nota {nota}</span>
                  <span className={`mm-nota-valor ${imposible ? "imposible" : ""}`}>
                    {imposible ? "imposible con este PP" : `${pf}% mínimo`}
                  </span>
                </div>
              );
            })}
          </Seccion>
        )}

        {(correlativas.length > 0 ||
          correlativasRegular.length > 0 ||
          desbloquea.length > 0) && (
          <Seccion titulo="Correlativas" defaultAbierta={true}>
            {correlativas.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div className="mm-corr-label">Necesita aprobadas:</div>
                <div className="mm-corr-list">
                  {correlativas.map((cid) => {
                    const m = mapaIds[cid];
                    const ok = m?.estado === "aprobada";
                    const clickable = m && onNavigate;
                    return (
                      <span
                        key={cid}
                        onClick={() => {
                          if (!clickable) return;
                          onClose();
                          onNavigate(m);
                        }}
                        className={`mm-chip ${ok ? "mm-chip-ok" : "mm-chip-no"}`}
                        style={{cursor: clickable ? "pointer" : "default"}}
                      >
                        {ok ? "✓" : "✕"} {m ? m.nombre : cid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {correlativasRegular.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div className="mm-corr-label">Necesita regularidad (aprobada o cursando):</div>
                <div className="mm-corr-list">
                  {correlativasRegular.map((cid) => {
                    const m = mapaIds[cid];
                    const ok = m?.estado === "aprobada" || m?.estado === "cursando";
                    const clickable = m && onNavigate;
                    return (
                      <span
                        key={cid}
                        onClick={() => {
                          if (!clickable) return;
                          onClose();
                          onNavigate(m);
                        }}
                        className={`mm-chip ${ok ? "mm-chip-ok" : "mm-chip-no"}`}
                        style={{cursor: clickable ? "pointer" : "default"}}
                      >
                        {ok ? "✓" : "✕"} {m ? m.nombre : cid}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {desbloquea.length > 0 && (
              <div style={{ marginBottom: "12px" }}>
                <div className="mm-corr-label">Habilita (materias que podés cursar después):</div>
                <div className="mm-corr-list">
                  {desbloquea.map((m) => (
                    <span
                      key={m.id}
                      onClick={() => {
                        if (!onNavigate) return;
                        onClose();
                        onNavigate(m);
                      }}
                      className="mm-chip mm-chip-habilita"
                      style={{cursor: onNavigate ? "pointer" : "default"}}
                    >
                      {m.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Seccion>
        )}

        {/* Asistencias — antes "Mis faltas" */}
        {tienePP && materiaPeriodoId && (
          <Seccion titulo="Asistencias" defaultAbierta={asistPct < 75}>
            {!faltasCargadas ? (
              <button onClick={cargarFaltas} className="mm-btn-cargar">
                Ver asistencias
              </button>
            ) : cargandoAsist ? (
              <div className="mm-cargando">Cargando asistencias…</div>
            ) : asistencia?.error ? (
              <div className="mm-error">
                No se pudo cargar la asistencia{" "}
                <button
                  onClick={() => {
                    setFaltasCargadas(false);
                    setAsistencia(null);
                  }}
                  className="mm-link"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <>

                {/* tabs */}
                <div className="mm-tabs">
                  {[
                    ["todas", `Todas (${totalClases})`],
                    ["ausentes", `Ausentes (${faltas.length})`],
                    ["presentes", `Presentes (${presentes})`],
                    ...(sinCargar.length ? [["sincargar", `Sin cargar (${sinCargar.length})`]] : []),
                  ].map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => setFiltroAsist(k)}
                      className={`mm-tab ${filtroAsist === k ? "activo" : ""}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* lista filtrada */}
                {(() => {
                  const mapa = Object.fromEntries((asistencia.studentAssists || []).map(sa => [sa.assistanceId, sa.present]));
                  const todas = (asistencia.assists || []).slice().sort((a,b)=> new Date(b.date) - new Date(a.date));
                  const filtradas = todas.filter(c => {
                    const present = mapa[c.id];
                    if (filtroAsist === "ausentes") return present === false;
                    if (filtroAsist === "presentes") return present === true;
                    if (filtroAsist === "sincargar") return present == null;
                    return true;
                  });
                  if (filtradas.length === 0) {
                    return <div className="mm-vacio">{
                      filtroAsist === "ausentes" ? "Sin ausencias, oiko" :
                      filtroAsist === "presentes" ? "Sin presencias registradas, hendy hina" :
                      filtroAsist === "sincargar" ? "Sin clases sin cargar" : "Sin clases registradas"
                    }</div>;
                  }
                  return (
                    <div className="mm-lista">
                      {filtradas.map(c => {
                        const present = mapa[c.id];
                        const isSinCargar = present == null;
                        const isPresente = present === true;
                        return (
                          <div key={c.id} className={`mm-fila ${isSinCargar ? "mm-fila-sincargar" : isPresente ? "mm-fila-presente" : "mm-fila-ausente"}`}>
                            <span className="mm-fila-icon">{isSinCargar ? "–" : isPresente ? "✓" : "✕"}</span>
                            <span className="mm-fila-fecha">{formatFecha(c.date)}</span>
                            {c.reference && <span className="mm-fila-ref">{c.reference}</span>}
                            <span className="mm-fila-estado">{isSinCargar ? "Sin cargar" : isPresente ? "Presente" : "Ausente"}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </>
            )}
          </Seccion>
        )}
      </div>
    </div>
  );
}
