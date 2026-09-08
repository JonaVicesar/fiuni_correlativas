import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBell, faCalendar, faEnvelope, faClock, faLayerGroup, faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { apiFetch, parseJwt } from "../api";
import { limpiarNombre } from "../utils/limpiarNombre";

const ESTADOS_NO_INSCRIPTOS = new Set(["aprobada","bloqueada","disponible","habilitada","retirada","cancelada"]);
function esMateriaCursando(materia, anho=new Date().getFullYear()){
  if(materia?.anho!==anho || materia.inscripto===false) return false;
  return !ESTADOS_NO_INSCRIPTOS.has(String(materia.estado||"").trim().toLowerCase());
}

export default function Notificaciones({session, onNavegar}){
  const [materias,setMaterias]=useState([]);
  const [seleccion,setSeleccion]=useState(new Set());
  const [todas,setTodas]=useState(false);
  const [habilitado,setHabilitado]=useState(false);
  const [diasAnticipacion,setDiasAnticipacion]=useState(3);
  const [horaNotificacion,setHoraNotificacion]=useState("13:30");
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");
  const [tienePref,setTienePref]=useState(false);

  const nombre = session.nombre || parseJwt(session.token)?.unique_name || "";
  const email = session.email || parseJwt(session.token)?.email || parseJwt(session.token)?.unique_name || "";

  useEffect(()=>{
    let cancel=false;
    async function load(){
      try{
        const data=await apiFetch("/materias",{token:session.token});
        if(cancel) return;
        const cur=data.filter(m=>esMateriaCursando(m)).map(m=>({codigo:m.codigoMateria, nombre:limpiarNombre(m.materia)}));
        setMaterias(cur);
        try{
          const estado=await apiFetch("/notificaciones/estado",{token:session.token});
          const subs = estado?.suscripciones || [];
          const pref = estado?.preferencias || null;
          if(subs.length>0) setSeleccion(new Set(subs.map(s=>s.materia_codigo)));
          else setSeleccion(new Set());
          if(pref){
            setTienePref(true);
            setHabilitado(pref.habilitado);
            if(typeof pref.todas === "boolean") setTodas(pref.todas);
            else setTodas(subs.length>0 && subs.length===cur.length);
            setDiasAnticipacion(pref.dias_anticipacion ?? 3);
            setHoraNotificacion(pref.hora_notificacion ?? "13:30");
          } else {
            // si no hay preferencias en DB no esta suscripto
            setTienePref(false);
            setHabilitado(false);
            setTodas(false);
          }
        }catch{
          setTienePref(false);
          setHabilitado(false);
          setTodas(false);
          setSeleccion(new Set());
        }
      }catch(e){ setMsg(e.message);} finally{ if(!cancel) setLoading(false); }
    }
    load(); return()=>{cancel=true;};
  },[session.token]);

  const toggle=(codigo)=>{
    const n=new Set(seleccion);
    if(n.has(codigo)) n.delete(codigo); else n.add(codigo);
    setSeleccion(n); setTodas(n.size===materias.length);
  };
  const toggleTodas=()=>{
    if(todas){ setSeleccion(new Set()); setTodas(false); } else { setSeleccion(new Set(materias.map(m=>m.codigo))); setTodas(true); }
  };

  const guardar=async()=>{
    setSaving(true); setMsg("");
    try{
      const payload = todas ? materias : materias.filter(m=>seleccion.has(m.codigo));
      await apiFetch("/notificaciones/suscripciones",{method:"POST", token:session.token, body:{materias: payload.map(m=>({codigo:m.codigo, nombre:m.nombre}))}});
      await apiFetch("/notificaciones/preferencias",{method:"PUT", token:session.token, body:{habilitado, todas, diasAnticipacion, horaNotificacion}});
      setTienePref(true);
      setMsg("Guardado ✓");
    }catch(e){ setMsg(e.message); } finally{ setSaving(false); }
  };

  if(loading) return <div className="main"><div className="loading"><div className="spinner" /><span className="loading-text">Cargando notificaciones…</span></div></div>;
  return <div className="main" style={{maxWidth:720}}>
    <div className="notif-header">
      <h2 className="notif-titulo"><FontAwesomeIcon icon={faBell} style={{color:"var(--accent)", marginRight:8}}/>Notificaciones</h2>
      <p className="notif-sub">Elegí de qué materias querés recibir avisos.</p>
    </div>

    <div className="notif-banner">
      <div className="notif-banner-icon"><FontAwesomeIcon icon={faCalendar} /></div>
      <div className="notif-banner-text">
        <strong>Recordá</strong> que para recibir notificaciones deben estar en la agenda, podés agregar eventos y tus compañeros lo verán también.
        {onNavegar && <button className="notif-banner-link" onClick={()=>onNavegar("agenda")}>Ir a Agenda <FontAwesomeIcon icon={faArrowRight} style={{marginLeft:4,fontSize:".7rem"}}/></button>}
      </div>
    </div>

    <div className="notif-card">
      <div className="notif-card-head">
        <FontAwesomeIcon icon={faEnvelope} className="notif-card-icon" />
        <div>
          <div className="notif-card-label">Tu correo</div>
          <div className="notif-card-value">{email || "—"} <span className="notif-card-dim">· {nombre}</span></div>
          <div className="notif-card-hint">Autocompletado desde tu sesión.</div>
        </div>
      </div>
    </div>

    <div className="notif-card">
      <div className="notif-card-title"><FontAwesomeIcon icon={faClock} style={{marginRight:6}}/>Preferencias {!tienePref && seleccion.size===0 ? <span className="notif-badge" style={{background:"var(--text-dim)"}}>No suscripto</span> : habilitado ? <span className="notif-badge" style={{background:"var(--aprobada)"}}>Activo</span> : <span className="notif-badge" style={{background:"var(--bloqueada-t)"}}>Pausado</span>}</div>
      {!tienePref && seleccion.size===0 && <div className="notif-empty" style={{marginBottom:12, border:"1px dashed var(--border)", borderRadius:8}}>Aún no estás suscripto. Elegí materias y guardá para empezar a recibir correos.</div>}

      <label className="notif-switch">
        <input type="checkbox" checked={habilitado} onChange={e=>setHabilitado(e.target.checked)} />
        <span className="notif-switch-slider" />
        <span className="notif-switch-label">Notificaciones <b>{habilitado ? "habilitadas" : "pausadas"}</b></span>
      </label>
      {!habilitado && tienePref && <div className="notif-hint">No recibirás correos hasta volver a habilitarlas.</div>}
      {!habilitado && !tienePref && seleccion.size===0 && <div className="notif-hint">Guardá con notificaciones habilitadas para suscribirte.</div>}

      <div className="notif-grid">
        <label className="notif-field">
          <span className="notif-field-label">Avisarme con</span>
          <div className="notif-field-row">
            <input
              type="number"
              min={0}
              max={30}
              value={diasAnticipacion}
              onChange={e=>setDiasAnticipacion(Math.max(0, Math.min(30, Number(e.target.value))))}
              className="notif-input"
            />
            <span className="notif-field-suffix">día(s) de anticipación</span>
          </div>
        </label>
        <label className="notif-field">
          <span className="notif-field-label">A las</span>
          <select value={horaNotificacion} onChange={e=>setHoraNotificacion(e.target.value)} className="notif-select">
            {Array.from({length:96},(_,i)=>{
              const h=String(Math.floor(i/4)).padStart(2,"0");
              const m=String((i%4)*15).padStart(2,"0");
              const v=`${h}:${m}`;
              return <option key={v} value={v}>{v}</option>;
            })}
          </select>
        </label>
      </div>
    </div>

    <div className="notif-card">
      <div className="notif-card-title"><FontAwesomeIcon icon={faLayerGroup} style={{marginRight:6}}/>Materias que cursás <span className="notif-badge">{materias.length}</span></div>
      {materias.length===0 ? (
        <div className="notif-empty">No cursás materias este año, no hay materias para suscribir.</div>
      ) : (
        <>
          <label className="notif-chip notif-chip-todas">
            <input type="checkbox" checked={todas} onChange={toggleTodas} />
            <span>{todas ? "Todas seleccionadas" : "Seleccionar todas"}</span>
          </label>
          <div className="notif-materias-grid">
            {materias.map(m=>{
              const activo = todas || seleccion.has(m.codigo);
              return (
                <label key={m.codigo} className={`notif-materia ${activo ? "activo" : ""}`}>
                  <input type="checkbox" checked={activo} onChange={()=>{ if(todas){ setTodas(false); const n=new Set(materias.map(x=>x.codigo)); n.delete(m.codigo); setSeleccion(n);} else toggle(m.codigo);}} />
                  <div className="notif-materia-info">
                    <span className="notif-materia-nombre">{m.nombre}</span>
                    <span className="notif-materia-codigo">{m.codigo}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </>
      )}
    </div>

    <div className="notif-actions">
      <button onClick={guardar} disabled={saving} className="btn-primary notif-guardar">{saving?"Guardando…":"Guardar cambios"}</button>
      {msg && <span className={`notif-msg ${msg.includes("Guardado") ? "ok" : "err"}`}>{msg}</span>}
    </div>
  </div>;
}
