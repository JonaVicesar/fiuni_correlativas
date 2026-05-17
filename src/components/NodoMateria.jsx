import React from "react";
import { ESTADO_LABELS } from "../constants";
import { limpiarNombre } from "../utils/limpiarNombre";

function NodoMateria({ materia, onClick }) {
  const { estado, nombre, id } = materia;

  return (
    <div className={`nodo nodo-${estado}`} onClick={() => onClick(materia)}>
      <span className={`nodo-badge badge-${estado}`}>
        {ESTADO_LABELS[estado]}
      </span>
      <div className="nodo-nombre">{limpiarNombre(nombre)}</div>
      <div className="nodo-id">{id}</div>
    </div>
  );
}

// Memoizar para evitar re-renders innecesarios cuando no cambia la materia
export default React.memo(NodoMateria, (prevProps, nextProps) => {
  return (
    prevProps.materia.id === nextProps.materia.id &&
    prevProps.materia.estado === nextProps.materia.estado &&
    prevProps.onClick === nextProps.onClick
  );
});
