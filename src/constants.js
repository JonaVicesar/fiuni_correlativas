export const API = import.meta.env.VITE_API_URL; //enlace del servidor

export const ESTADO_LABELS = {
  aprobada: "✓ Aprobada",
  cursando: "◉ Cursando",
  disponible: "▶ Habilitada",
  bloqueada: "✕ No Habilitada",
};

export const ESTADO_COLORES = {
  aprobada: "var(--aprobada)",
  cursando: "var(--cursando)",
  disponible: "var(--disponible)",
  bloqueada: "var(--bloqueada-t)",
};
