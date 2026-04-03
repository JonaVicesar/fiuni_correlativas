import { useState } from "react";
import { storage } from "./api";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import Mapa from "./components/Mapa";

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
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <div className="header-logo">
            FIUNI<span>Correlativas</span>
          </div>
          <nav style={{ display: "flex", gap: ".25rem" }}>
            {[
              ["dashboard", "Mis materias"],
              ["mapa", "Mapa de correlativas"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                style={{
                  padding: ".4rem .9rem",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "Syne, sans-serif",
                  fontSize: ".85rem",
                  fontWeight: "600",
                  background: vista === v ? "var(--accent)" : "transparent",
                  color: vista === v ? "#000" : "var(--text-dim)",
                  transition: "all .2s",
                }}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="header-user">
          <span className="header-nombre">{session.nombre}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      </header>

      {vista === "dashboard" ? (
        <Dashboard session={session} />
      ) : (
        <Mapa session={session} />
      )}
    </>
  );
}
