import { useEffect, useState } from "react";
import { storage, apiFetch } from "./api";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Mapa from "./components/Mapa";
import Agenda from "./components/Calendario";
import Aulas from "./components/Aulas";
import Examenes from "./components/Examenes";
import Perfil from "./components/Perfil";
import Sidebar from "./components/Sidebar";
import ToggleTema from "./components/ToggleTema";
import MenuPerfil from "./components/MenuPerfil";
import Footer from "./components/Footer";
import Notificaciones from "./components/Notificaciones";
import TareasIntegral from "./components/TareasIntegral";

export default function App() {
  const [session, setSession] = useState(() => storage.get("session"));
  const [vista, setVista] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [avisoNotif, setAvisoNotif] = useState(false);
  const [avisoNotifCerrado, setAvisoNotifCerrado] = useState(() => {
    try {
      return localStorage.getItem("notif_aviso_cerrado") === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!session?.token || vista === "notificaciones") {
      setAvisoNotif(false);
      return;
    }
    if (avisoNotifCerrado) {
      setAvisoNotif(false);
      return;
    }
    let cancel = false;
    apiFetch("/notificaciones/estado", { token: session.token, cache: false })
      .then((estado) => {
        if (cancel) return;
        const subs = estado?.suscripciones || [];
        const pref = estado?.preferencias || null;
        const suscrito = subs.length > 0 && pref && pref.habilitado;
        setAvisoNotif(!suscrito);
      })
      .catch(() => {});
    return () => {
      cancel = true;
    };
  }, [session?.token, vista, avisoNotifCerrado]);

  const cerrarAvisoNotif = () => {
    try {
      localStorage.setItem("notif_aviso_cerrado", "1");
    } catch {}
    setAvisoNotifCerrado(true);
    setAvisoNotif(false);
  };

	// para notificaciones en el panel cuando se agregar nuevas tareas
  const [avisoTarea, setAvisoTarea] = useState(null);

  useEffect(() => {
    if (!session?.token) { setAvisoTarea(null); return; }
    if (vista === "tareas") {
      (async () => {
        try {
          const tablero = await apiFetch("/materias", { token: session.token, cache: true });
          const ids = (Array.isArray(tablero) ? tablero : []).map(m=>m.id).filter(Boolean);
          if (!ids.length) return;
          const porMat = await apiFetch("/tareas", { method:"POST", token: session.token, body:{ materiasPeriodoIds: ids }, cache: false });
          const idsActual = [];
          for (const k of Object.keys(porMat||{})) {
            for (const t of (porMat[k]||[])) if (t?.id != null) idsActual.push(String(t.id));
          }
          try { localStorage.setItem("tareas_vistos_ids", JSON.stringify(idsActual.sort())); } catch {}
          try { localStorage.removeItem("tareas_aviso_cerrado_ids"); } catch {}
          setAvisoTarea(null);
        } catch {}
      })();
      return;
    }
    let cancel = false;
    (async () => {
      try {
        const tablero = await apiFetch("/materias", { token: session.token, cache: true });
        const lista = Array.isArray(tablero) ? tablero : [];
        const ids = lista.map(m=>m.id).filter(Boolean);
        if (!ids.length) return;
        const porMat = await apiFetch("/tareas", { method:"POST", token: session.token, body:{ materiasPeriodoIds: ids }, cache: false });
        const planas = [];
        for (const m of lista) {
          const arr = Array.isArray(porMat[String(m.id)]) ? porMat[String(m.id)] : [];
          for (const t of arr) planas.push({ t, m });
        }
        const idsActual = planas.map(({t})=> String(t.id)).filter(Boolean).sort();
        if (!idsActual.length) return;
        let previos = [];
        try { previos = JSON.parse(localStorage.getItem("tareas_vistos_ids") || "[]"); } catch { previos = []; }
        if (previos.length === 0) {
          try { localStorage.setItem("tareas_vistos_ids", JSON.stringify(idsActual)); } catch {}
          return;
        }
        let cerrados = [];
        try { cerrados = JSON.parse(localStorage.getItem("tareas_aviso_cerrado_ids") || "[]"); } catch { cerrados = []; }
        const nuevos = idsActual.filter(id => !previos.includes(id) && !cerrados.includes(id));
        if (nuevos.length===0 || cancel) return;
        const primera = planas.find(({t})=> String(t.id)===nuevos[0]);
        if (!primera) return;
        const tit = primera.t.tarea || primera.t.nombre || primera.t.titulo || "Nueva tarea";
        setAvisoTarea({ count: nuevos.length, materia: primera.m.materia || "", titulo: String(tit).slice(0,48), idsNuevos: nuevos });
      } catch {}
    })();
    return () => { cancel = true; };
  }, [session?.token, vista]);

  const cerrarAvisoTarea = () => {
    if (avisoTarea?.idsNuevos?.length) {
      try {
        const prev = JSON.parse(localStorage.getItem("tareas_aviso_cerrado_ids") || "[]");
        const merged = Array.from(new Set([...(Array.isArray(prev)?prev:[]), ...avisoTarea.idsNuevos]));
        localStorage.setItem("tareas_aviso_cerrado_ids", JSON.stringify(merged));
      } catch {}
    }
    setAvisoTarea(null);
  };
  const verAvisoTarea = () => {
    if (avisoTarea?.idsNuevos?.length) {
      try {
        const prev = JSON.parse(localStorage.getItem("tareas_vistos_ids") || "[]");
        const merged = Array.from(new Set([...(Array.isArray(prev)?prev:[]), ...avisoTarea.idsNuevos]));
        localStorage.setItem("tareas_vistos_ids", JSON.stringify(merged.sort()));
      } catch {}
    }
    setAvisoTarea(null);
    setVista("tareas");
  };

  function handleLogin(data) {
    setSession(data);
  }
  function handleLogout() {
    storage.del("session");
    setSession(null);
  }

  if (!session) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-wrap">
      <header className="header">
        <div className="header-inner">
          <div className="header-izq">
            <button
              className="btn-hamburguesa"
              onClick={() => setSidebarAbierto(true)}
              aria-label="Abrir menú"
            >
              ☰
            </button>
          </div>
          <nav className="header-nav">
            {[
              ["dashboard", "Mis Materias"],
              ["mapa", "Correlativas"],
              ["agenda", "Agenda"],
              ["tareas", "Tareas"],
            ].map(([v, label]) => (
              <button
                key={v}
                className={`header-nav-btn${vista === v ? " activo" : ""}`}
                onClick={() => setVista(v)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div className="header-user">
            <ToggleTema />
            <span className="header-nombre"> {session.nombre}</span>
            <MenuPerfil
              session={session}
              onLogout={handleLogout}
              onNavegar={setVista}
            />
          </div>
        </div>
      </header>

      {avisoNotif && (
        <div className="aviso-notif">
          <span className="aviso-notif-text">
            {" "}
            Aún no estás suscripto a las notificaciones, ¿querés activarlas?
          </span>
          <div className="aviso-notif-actions">
            <button
              className="aviso-notif-btn"
              onClick={() => setVista("notificaciones")}
            >
              Activar
            </button>
            <button
              className="aviso-notif-x"
              onClick={cerrarAvisoNotif}
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {avisoTarea && (
        <div className="aviso-notif" style={{borderLeftColor:"var(--cursando)"}}>
          <span className="aviso-notif-text">
            {avisoTarea.count === 1
              ? `Nueva tarea en ${avisoTarea.materia} — ${avisoTarea.titulo}`
              : `${avisoTarea.count} nuevas tareas — ${avisoTarea.materia} y más`}
          </span>
          <div className="aviso-notif-actions">
            <button className="aviso-notif-btn" onClick={verAvisoTarea} style={{background:"var(--cursando)"}}>
              Ver
            </button>
            <button className="aviso-notif-x" onClick={cerrarAvisoTarea} aria-label="Cerrar">
              ✕
            </button>
          </div>
        </div>
      )}
      <div className="main">
        {vista === "dashboard" ? (
          <Dashboard session={session} />
        ) : vista === "agenda" ? (
          <Agenda session={session} />
        ) : vista === "aulas" ? (
          <Aulas />
        ) : vista === "examenes" ? (
          <Examenes session={session} />
        ) : vista === "perfil" ? (
          <Perfil session={session} />
        ) : vista === "notificaciones" ? (
          <Notificaciones session={session} onNavegar={setVista} />
        ) : vista === "tareas" ? (
          <TareasIntegral session={session} />
        ) : (
          <Mapa session={session} />
        )}
        <Sidebar
          abierto={sidebarAbierto}
          onClose={() => setSidebarAbierto(false)}
          vista={vista}
          onNavegar={setVista}
        />
      </div>
      <Footer />
    </div>
  );
}
