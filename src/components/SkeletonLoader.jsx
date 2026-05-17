/**
 * Componente de skeleton loading para mostrar placeholders mientras cargan los datos
 * Mejora la percepción de velocidad y UX
 */
export default function SkeletonLoader() {
  return (
    <div className="skeleton-container">
      {/* Skeleton Hero Section */}
      <div className="skeleton-hero">
        <div className="skeleton-hero-item"></div>
        <div className="skeleton-hero-item"></div>
        <div className="skeleton-hero-item"></div>
      </div>

      {/* Skeleton Semestre Block */}
      <div style={{ marginBottom: "2rem" }}>
        <div className="skeleton-title"></div>
        <div className="skeleton-materias-row">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="skeleton-nodo"></div>
          ))}
        </div>
      </div>

      {/* Skeleton Semestre Block 2 */}
      <div>
        <div className="skeleton-title"></div>
        <div className="skeleton-materias-row">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="skeleton-nodo"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
