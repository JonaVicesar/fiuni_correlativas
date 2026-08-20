import { useEffect, useState } from "react";
import { storage } from "./api";
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

export default function App() {
  const [session, setSession] = useState(() => storage.get("session"));
  const [vista, setVista] = useState("dashboard");
  const [sidebarAbierto, setSidebarAbierto] = useState(false);

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

      <div className="app-main">
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
