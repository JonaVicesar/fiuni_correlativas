import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Mapa from "./components/Mapa";
import Calendario from "./components/Calendario";
import ToggleTema from "./components/ToggleTema";

export default function App() {
  const { session, login, logout } = useAuth();
  const [vista, setVista] = useState("dashboard");

  if (!session) return <Login onLogin={login} />;

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
          <button className="btn-logout" onClick={logout}>
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
