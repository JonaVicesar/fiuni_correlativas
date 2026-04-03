import { ESTADO_LABELS } from "../constants";

export default function NodoMateria({ materia, onClick }) {
  const { estado, nombre, id } = materia;

  return (
    <div className={`nodo nodo-${estado}`} onClick={() => onClick(materia)}>
      <span className={`nodo-badge badge-${estado}`}>
        {ESTADO_LABELS[estado]}
      </span>
      <div className="nodo-nombre">{nombre}</div>
      <div className="nodo-id">{id}</div>
    </div>
  );
}
