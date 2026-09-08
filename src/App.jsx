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

export default function App() {
				const [session, setSession] = useState(() => storage.get("session"));
				const [vista, setVista] = useState("dashboard");
				const [sidebarAbierto, setSidebarAbierto] = useState(false);
				const [avisoNotif, setAvisoNotif] = useState(false);
				const [avisoNotifCerrado, setAvisoNotifCerrado] = useState(() => {
					try { return localStorage.getItem("notif_aviso_cerrado")==="1"; } catch { return false; }
				});

				useEffect(()=>{
					if(!session?.token || vista==="notificaciones") { setAvisoNotif(false); return; }
					if(avisoNotifCerrado) { setAvisoNotif(false); return; }
					let cancel=false;
					apiFetch("/notificaciones/estado", {token: session.token, cache:false}).then(estado=>{
						if(cancel) return;
						const subs = estado?.suscripciones || [];
						const pref = estado?.preferencias || null;
						const suscrito = subs.length>0 && pref && pref.habilitado;
						setAvisoNotif(!suscrito);
					}).catch(()=>{});
					return()=>{cancel=true;};
				}, [session?.token, vista, avisoNotifCerrado]);

				const cerrarAvisoNotif = ()=>{
					try{ localStorage.setItem("notif_aviso_cerrado","1"); }catch{}
					setAvisoNotifCerrado(true);
					setAvisoNotif(false);
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
          <span className="aviso-notif-text"> Aún no estás suscripto a las notificaciones, ¿querés activarlas?</span>
          <div className="aviso-notif-actions">
            <button className="aviso-notif-btn" onClick={()=>setVista("notificaciones")}>Activar</button>
            <button className="aviso-notif-x" onClick={cerrarAvisoNotif} aria-label="Cerrar">✕</button>
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
          ) : vista === "tareas" ? (
           <Perfil session={session} />
          ) : vista === "notificaciones" ? (
            <Notificaciones session={session} onNavegar={setVista} />
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
