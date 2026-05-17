import { useEffect, useState } from "react";
import { storage } from "./api";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Mapa from "./components/Mapa";
import Calendario from "./components/Calendario";
import ToggleTema from "./components/ToggleTema";

export default function App() {
  const [session, setSession] = useState(() => storage.get("session"));
  const [vista, setVista] = useState("dashboard");

  function handleLogin(data) {
    setSession(data);
  }
  function handleLogout() {
    storage.del("session");
    setSession(null);
  }

  if (!session) return <Login onLogin={handleLogin} />;

  return (
    <>
      <header className="header">
        <div className="header-logo">
          <img src="/Fiuni-Logo.svg" alt="FIUNI" height={36} />
        </div>
        <nav className="header-nav">
          {[
            ["dashboard", "Mis Materias"],
            ["mapa", "Mapa"],
            ["calendario", "Calendario"],
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`nav-btn ${vista === v ? "active" : "inactive"}`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="header-user">
          <span className="header-nombre">{session?.nombre || "Usuario"}</span>
          <ToggleTema />
          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      <div className="vista-container" key={vista}>
        {vista === "dashboard" ? (
          <Dashboard session={session} />
        ) : vista === "calendario" ? (
          <Calendario session={session} />
        ) : (
          <Mapa session={session} />
        )}
      </div>
    </>
  );
}
