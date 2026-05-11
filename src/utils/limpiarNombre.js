// src/utils/limpiarNombre.js

/**
 * Elimina los asteriscos al final del nombre de una materia.
 * La API de la FIUNI agrega "*" a las materias que son correlativas.
 * Esta función los quita para que la interfaz se vea más limpia.
 *
 * @param {string} nombre - El nombre original de la materia
 * @returns {string} El nombre sin asteriscos al final
 */
export function limpiarNombre(nombre) {
  return (nombre || "").replace(/\*+$/, "").trim();
}