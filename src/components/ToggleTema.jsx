import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSun, faMoon } from "@fortawesome/free-solid-svg-icons";

export default function ToggleTema() {
  const [tema, setTema] = useState(() => {
    // verificar tema guardado en el local storage, light por defecto
    const temaGuardado = localStorage.getItem("theme");
    return temaGuardado || "light";
  });

  useEffect(() => {
    // aplicar tema
    document.documentElement.setAttribute("data-theme", tema);
    localStorage.setItem("theme", tema);
  }, [tema]);

  const toggleTema = () => {
    setTema((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <button
      className="theme-toggle"
      onClick={toggleTema}
      title={`Switch to ${tema === "light" ? "dark" : "light"} mode`}
    >
      {tema === "light" ? (
        <FontAwesomeIcon icon={faMoon} />
      ) : (
        <FontAwesomeIcon icon={faSun} />
      )}
    </button>
  );
}
