import { useState, useEffect } from "react";
import { apiFetch } from "../api";
import Spinner from "./Spinner";
import "../styles/components/tareas-integral.css";

function aTexto(v) {
  if (v == null) return "";
  if (typeof v === "object") {
    if (v.label != null) return String(v.label);
    if (v.nombre != null) return String(v.nombre);
    if (v.value != null) return String(v.value);
    try { return JSON.stringify(v); } catch { return ""; }
  }
  return String(v);
}

function formatearFecha(iso) {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return aTexto(iso);
  return d.toLocaleDateString("es-PY", {
    day: "2-digit", month: "short", year: "numeric"
  });
}
function formatearFechaHora(iso) {
  if (!iso) return "";
  const d = new Date(String(iso));
  if (isNaN(d.getTime())) return aTexto(iso);
  return d.toLocaleString("es-PY", {
    day:"2-digit", month:"short", year:"numeric", hour:"2-digit", minute:"2-digit"
  });
}

function estadoTarea(t){
  const nota = t.calificacion ?? t.nota ?? t.puntaje ?? t.score ?? t.puntajeObtenido;
  if(nota!=null && String(nota).trim()!=="") return {label:`${nota}${t.puntajeTotal ? ` / ${t.puntajeTotal}` : ""}`, color:"var(--aprobada)", dot:"var(--aprobada)", isNota:true};
  return {label:"Publicada", color:"var(--text-dim)", dot:"var(--cursando)"};
}

function tituloTarea(t, fallbackMateria=""){
  let tit = aTexto(t.tarea ?? t.nombre ?? t.titulo ?? t.nombreTarea);
  if(tit && tit.trim().length>=3) return tit.trim();
  const desc = aTexto(t.descripcion ?? t.observacion ?? t.contenido ?? t.detalle);
  if(desc){
    const first = desc.split("\n")[0].trim();
    if(first.length>=8) return first.slice(0,72) + (first.length>72?"…":"");
  }
  if(fallbackMateria) return `Tarea · ${fallbackMateria}`;
  return `Tarea #${t.id ?? ""}`.trim();
}

function ModalDetalle({ tarea, materiaNombre, onClose }){
  if(!tarea) return null;
  const tit = tituloTarea(tarea, materiaNombre);
  const desc = aTexto(tarea.descripcion ?? tarea.observacion ?? tarea.contenido ?? tarea.detalle);
  const fecha = tarea.fechaEntrega ?? tarea.fechaVencimiento ?? tarea.fechaLimite ?? tarea.vence ?? tarea.fecha ?? tarea.modifiedAt;
  const creacion = tarea.fechaCreacion ?? tarea.createdAt ?? tarea.created_at ?? tarea.fechaAlta;
  const nota = tarea.calificacion ?? tarea.nota ?? tarea.puntaje ?? tarea.score ?? tarea.puntajeObtenido;
  const peso = tarea.peso ?? tarea.maxPuntos ?? tarea.puntajeMaximo ?? tarea.puntajeTotal;
  const est = estadoTarea(tarea);
  const adj = tarea.adjuntos ?? tarea.archivos ?? tarea.material ?? tarea.anexos;
  const tipoLabel = aTexto(tarea.tipoTarea?.label ?? tarea.tipo);
  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget && onClose()}>
      <div className="modal-contenido ti-modal">
        <div className="modal-header ti-modal-head">
          <div className="ti-modal-head-left">
            <span className="ti-dot" style={{background: est.dot}}/>
            {est.label} {materiaNombre && <>· {materiaNombre}</>}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <h3 className="ti-modal-title">{tit}</h3>
        {fecha && <div className="ti-modal-fecha"> {formatearFechaHora(fecha)}</div>}
        {nota!=null && nota!=="" && (
          <div className="ti-modal-nota">
            Nota: {nota}{peso ? ` / ${peso}`: ""}
          </div>
        )}
        {desc ? (
          <div className="ti-modal-desc">{desc}</div>
        ) : (
          <div className="ti-modal-empty">Sin descripción</div>
        )}
        <div className="ti-modal-grid">
          {creacion && <><span>Publicada</span><span>{formatearFechaHora(creacion)}</span></>}
          {aTexto(tarea.estado) && <><span>Estado</span><span>{aTexto(tarea.estado)}</span></>}
          {tipoLabel && <><span>Tipo</span><span>{tipoLabel}</span></>}
          {tarea.porcentajePesoMateria!=null && <><span>Peso</span><span>{tarea.porcentajePesoMateria}%</span></>}
        </div>
        {Array.isArray(adj) && adj.length>0 && (
          <div className="ti-adjuntos">
            <div className="ti-adjuntos-title">Adjuntos</div>
            <div style={{display:"flex", flexDirection:"column", gap:6}}>
              {adj.map((a,i)=><a key={i} href={a.url||a.link||"#"} target="_blank" rel="noopener noreferrer" className="ti-adjunto">📎 {aTexto(a.titulo||a.nombre)||`Archivo ${i+1}`}</a>)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TareasIntegral({ session }){
  const [materias,setMaterias]=useState([]);
  const [porMateria,setPorMateria]=useState({});
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [filtro,setFiltro]=useState("");
  const [detalle,setDetalle]=useState(null); // {t, materiaNombre}

  useEffect(()=>{
    if(!session?.token) return;
    (async()=>{
      try{
        const tablero = await apiFetch("/materias", { token: session.token });
        const lista = Array.isArray(tablero) ? tablero : [];
        setMaterias(lista);
        const ids = lista.map(m=>m.id).filter(Boolean);
        if(ids.length){
          const res = await apiFetch("/tareas", { method:"POST", token: session.token, body:{ materiasPeriodoIds: ids }, cacheTtl: 5*60*1000 });
          setPorMateria(res||{});
        }
      }catch(e){ setError(e.message); }
      finally{ setLoading(false); }
    })();
  },[session.token]);

  if(loading) return <Spinner texto="Cargando tareas" />;
  if(error) return <div className="tareas-error">Error: {error}</div>;

  const total = Object.values(porMateria).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0);
  const tareasPlanas = materias.flatMap(m=>{
    const mid = String(m.id);
    const arr = Array.isArray(porMateria[mid]) ? porMateria[mid] : [];
    return arr.map(t=>({ _t: t, _m: m }));
  });
  const tareasFiltradas = (()=> {
    if(!filtro.trim()) return tareasPlanas;
    const q=filtro.toLowerCase();
    return tareasPlanas.filter(({_m})=> String(_m.materia||"").toLowerCase().includes(q) || String(_m.codigoMateria||"").toLowerCase().includes(q));
  })();
  const tareasOrdenadas = [...tareasFiltradas].sort((a,b)=>{
    const fa = a._t.fechaEntrega ?? a._t.fecha ?? a._t.fechaCreacion ?? "";
    const fb = b._t.fechaEntrega ?? b._t.fecha ?? b._t.fechaCreacion ?? "";
    return String(fb).localeCompare(String(fa));
  });

  return (
    <div className="ti-wrap">
      <div className="ti-header">
        <h2 className="ti-title">Tareas </h2>
      </div>

      <div className="ti-search">
        <span style={{color:"var(--text-dim)"}}>⌕</span>
        <input
          placeholder="Buscar materia"
          value={filtro}
          onChange={e=>setFiltro(e.target.value)}
        />
        {filtro && <button onClick={()=>setFiltro("")} style={{background:"none", border:"none", color:"var(--text-dim)", cursor:"pointer"}}>✕</button>}
      </div>

      {tareasOrdenadas.length===0 ? (
        <div className="ti-empty">
          {total===0 ? "Aún no hay tareas publicadas" : "Ninguna tarea coincide con la búsqueda"}
        </div>
      ) : (
        <div className="ti-list">
          {tareasOrdenadas.map(({_t: t, _m: m}, i)=>{
            const materiaNombre = aTexto(m.materia) || "Materia";
            const tit = tituloTarea(t, materiaNombre);
            const desc = aTexto(t.descripcion ?? t.observacion ?? t.contenido ?? t.detalle);
            const fecha = t.fechaEntrega ?? t.fechaVencimiento ?? t.fechaLimite ?? t.vence ?? t.fecha ?? t.fechaCreacion;
            const nota = t.calificacion ?? t.nota ?? t.puntaje ?? t.score ?? t.puntajeObtenido;
            const peso = t.peso ?? t.maxPuntos ?? t.puntajeTotal;
            const est = estadoTarea(t);
            const tipoLbl = aTexto(t.tipoTarea?.label ?? t.tipo);
            const horario0 = Array.isArray(m.horarios) && m.horarios[0];
            const profLabel = aTexto(horario0?.profesor?.label ?? m.profesores?.[0]?.profesor);
            const diaLabel = aTexto(horario0?.dia?.label);
            const horaTxt = horario0 ? `${horario0.horaInicio || ""}${horario0.horaFin ? `-${horario0.horaFin}` : ""}` : "";
            return (
              <button
                key={`${m.id}-${t.id ?? i}`}
                onClick={()=>setDetalle({t, materiaNombre})}
                className="ti-card"
                style={{borderLeft:`4px solid ${est.dot}`}}
              >
                <div className="ti-card-head">
                  <span className="ti-pill">
                    {materiaNombre} 
                  </span>
                  {(tipoLbl && tipoLbl.toLowerCase()!=="normal") && (
                    <span className="ti-pill" style={{color:"var(--text-dim)"}}>{tipoLbl}</span>
                  )}
                  <span className="ti-pill ti-pill-estado" style={{color: est.color}}>{est.label}</span>
                </div>
                <div className="ti-titulo">{tit}</div>
                {desc ? (
                  <div className="ti-desc">{desc}</div>
                ) : (
                  <div className="ti-desc-empty">Sin descripción</div>
                )}
                {(profLabel || diaLabel) && (
                  <div style={{fontSize:".72rem", color:"var(--text-dim)", display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
                    {profLabel && <span>{profLabel}</span>}
                    {t.porcentajePesoMateria ? <span>· Peso {t.porcentajePesoMateria}%</span> : null}
                  </div>
                )}
                <div className="ti-meta">
                  <span>{fecha ? formatearFecha(fecha) : "sin fecha"}</span>
                  {nota!=null && nota!=="" && <span className="ti-nota">Nota: {nota}{peso?` / ${peso}`:""}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {detalle && <ModalDetalle tarea={detalle.t} materiaNombre={detalle.materiaNombre} onClose={()=>setDetalle(null)} />}
    </div>
  );
}
