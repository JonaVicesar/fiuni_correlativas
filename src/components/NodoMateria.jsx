import { ESTADO_LABELS } from "../constants";
import { limpiarNombre } from "../utils/limpiarNombre";

export default function NodoMateria({ materia, onClick }) {
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