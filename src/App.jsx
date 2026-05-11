import { useState } from "react";
import { storage } from "./api";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Mapa from "./components/Mapa";
import Calendario from "./components/Calendario"; // antes Agenda
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
            ["calendario", "Calendario"],   // antes "agenda"
          ].map(([v, label]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              style={{
                background: vista === v ? "var(--accent)" : "transparent",
                color: vista === v ? "#000" : "var(--text-dim)",
                padding: ".4rem .9rem",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontFamily: "Syne, sans-serif",
                fontSize: ".85rem",
                fontWeight: "600",
                transition: "all .2s",
              }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="header-user">
          <ToggleTema />
          <span className="header-nombre">{session.nombre}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {vista === "dashboard" ? (
        <Dashboard session={session} />
      ) : vista === "calendario" ? (   // antes "agenda"
        <Calendario session={session} />
      ) : (
        <Mapa session={session} />
      )}
    </>
  );
}