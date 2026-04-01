/**
 *componente loader
 */
export default function Spinner({ texto = "Cargando..." }) {
  return (
    <div className="loading">
      <div className="spinner" />
      <span className="loading-text">{texto}</span>
    </div>
  );
}
