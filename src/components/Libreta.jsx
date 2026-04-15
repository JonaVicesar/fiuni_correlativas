import { useState, useEffect } from "react";
import { apiFetch } from "../api";

// convierte numeros a letras
function numeroALetras(num) {
  if (num === null || num === undefined) return "";
  const letras = {
    1: "Uno",
    2: "Dos",
    3: "Tres",
    4: "Cuatro",
    5: "Cinco",
  };
  return letras[num] || num;
}

// formatea la fecha
function formatFecha(fechaStr) {
  if (!fechaStr) return "";
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return fechaStr;
  return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getFullYear()}`;
}

// calcula promedio del semestre
function calcularPromedio(materias) {
  console.log("COMO LLEGAN MATERIAS A calcular promedio", materias);

  //console.log("CALIFICACIONES POR SEMESTRE", calificaciones);
  let suma = 0;
  let intentos = 0;

  materias.forEach((materia, index) => {
    suma += materia.nota;
    intentos += materia.intentos;
  });

  return (suma / intentos).toFixed(2);
}

export default function Libreta({ session }) {
  const [libreta, setLibreta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.token) return;

    const query = session.carreraId ? `?carrera_id=${session.carreraId}` : "";
    apiFetch(`/libreta${query}`, { token: session.token })
      .then((data) => {
        console.log("Libreta data:", data);
        setLibreta(data);
      })
      .catch((err) => {
        console.error("Error libreta:", err);
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [session.token, session.carreraId]);

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <div className="spinner" />
        <span style={{ color: "var(--text-dim)" }}>Cargando libreta...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          color: "var(--bloqueada-t)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        ⚠ Error: {error}
      </div>
    );
  }

  if (!libreta?.calificacionesSemestres?.length) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--text-dim)",
        }}
      >
        No hay datos de libreta disponibles
      </div>
    );
  }

  // obtener cada semestre
  const semestresProcesados = libreta.calificacionesSemestres.map(
    (semestre) => {
      // console.log("CALIFICACIONES SEMESTRES", libreta.calificacionesSemestres);
      const materias = semestre.calificacionesMaterias.map((materia) => {
        let intentos = 0;
        let calificaciones = "";

        if (materia.calificaciones.length > 1) {
          console.log("Entro en el if con", materia.materia);
          materia.calificaciones.forEach((calificacion, index) => {
            console.log("tiene que entrar en el if", materia.materia);
            if (
              calificacion.calificacion != null &&
              calificacion.calificacion > 0
            ) {
              console.log("Entro en el segundo if con", materia.materia);
              console.log("SE VA A SUMAR");
              intentos += 1;

              // console.log("VECES RENDIDAS", intentos);
            }
          });
        }

        intentos += 1;

        let mejorCalificacion = null;
        let mejorActa = "";
        let mejorFecha = "";
        let mejorPeriodo = "";

        if (materia.calificaciones && materia.calificaciones.length > 0) {
          const ordenadas = [...materia.calificaciones];

          const mejor = ordenadas[0];

          mejorCalificacion = mejor.calificacion;
          mejorActa = mejor.nroActa || "";
          mejorFecha = mejor.fechaExamen || "";
          mejorPeriodo = mejor.periodo || "";
        }

        return {
          codigo: materia.materiaCodigo,
          nombre: materia.materia,
          nota: mejorCalificacion,
          notaLetras: numeroALetras(mejorCalificacion),
          acta: mejorActa,
          fecha: mejorFecha,
          periodo: mejorPeriodo,
          intentos: intentos,
        };
      });

      return {
        id: semestre.semestreId,
        nombre: semestre.semestre,
        materias: materias,
        promedio: calcularPromedio(materias),
      };
    },
  );

  // informacion del alumno
  const alumno = {
    nombre: `${libreta.nombre || ""} ${libreta.apellido || ""}`.trim(),
    documento: libreta.numeroDocumento,
    domicilio: libreta.direccion,
    ingreso: libreta.fechaIngreso
      ? new Date(libreta.fechaIngreso).getFullYear()
      : "",
  };

  return (
    <div
      style={{
        background: "var(--bg3)",
        borderRadius: "16px",
        padding: "1.5rem",
        border: "1px solid var(--border)",
        color: "var(--text)",
        overflowX: "auto",
      }}
    >
      <div
        style={{
          textAlign: "center",
          marginBottom: "1.5rem",
          borderBottom: "2px solid var(--accent)",
          paddingBottom: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "1.2rem",
            fontWeight: "bold",
            letterSpacing: "2px",
            color: "var(--accent)",
          }}
        >
          UNIVERSIDAD NACIONAL DE ITAPÚA
        </div>
        <div
          style={{
            fontSize: "0.9rem",
            fontWeight: "500",
            color: "var(--text-dim)",
          }}
        >
          Facultad de Ingeniería
        </div>
        <div style={{ fontSize: "0.9rem", color: "var(--text-dim)" }}>
          Carrera: {libreta.carrera || "Ingeniería Informática"}
        </div>
      </div>

      {/* datos personales */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "0.75rem",
          background: "var(--bg2)",
          borderRadius: "8px",
          border: "1px solid var(--border)",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--accent)",
            marginBottom: "0.5rem",
            letterSpacing: "1px",
          }}
        >
          DATOS PERSONALES
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "0.5rem",
            fontSize: "0.8rem",
          }}
        >
          <div>
            <strong>Nombres y Apellidos:</strong> {alumno.nombre || "-"}
          </div>
          <div>
            <strong>Documento Tipo nº:</strong> {alumno.documento || "-"}
          </div>
          <div>
            <strong>Domicilio:</strong> {alumno.domicilio || "-"}
          </div>
          <div>
            <strong>Fecha de Examen de Ingreso:</strong> {alumno.ingreso || "-"}
          </div>
        </div>
      </div>

      {/* Datos academicos */}
      <div>
        <div
          style={{
            fontSize: "0.7rem",
            color: "var(--accent)",
            marginBottom: "1rem",
            letterSpacing: "1px",
          }}
        >
          DATOS ACADEMICOS
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(480px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {semestresProcesados.map((semestre) => (
            <div
              key={semestre.id}
              style={{
                background: "var(--bg2)",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: "0.9rem",
                  padding: "0.75rem",
                  textAlign: "center",
                  background: "var(--bg3)",
                  borderBottom: "2px solid var(--accent)",
                  color: "var(--accent)",
                }}
              >
                {semestre.nombre}
              </div>

              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "0.7rem",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "var(--bg3)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Cód.
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "left",
                          color: "var(--text-dim)",
                        }}
                      >
                        Asignatura
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Nº
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Letras
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Acta Nº
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Fecha
                      </th>
                      <th
                        style={{
                          padding: "0.5rem 0.25rem",
                          textAlign: "center",
                          color: "var(--text-dim)",
                        }}
                      >
                        Obs.
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {semestre.materias.map((materia) => {
                      const notaColor =
                        materia.nota >= 4
                          ? "var(--aprobada)"
                          : materia.nota >= 2
                            ? "var(--disponible)"
                            : "var(--bloqueada-t)";
                      return (
                        <tr
                          key={materia.codigo}
                          style={{ borderBottom: "1px solid var(--border)" }}
                        >
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontFamily: "monospace",
                            }}
                          >
                            {materia.codigo}
                          </td>
                          <td style={{ padding: "0.5rem 0.25rem" }}>
                            {materia.nombre}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontWeight: "bold",
                              color: notaColor,
                            }}
                          >
                            {materia.nota > 0
                              ? materia.nota
                              : materia.nota === 0
                                ? "0"
                                : "-"}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontSize: "0.65rem",
                            }}
                          >
                            {materia.nota > 0
                              ? materia.notaLetras
                              : materia.nota === 0
                                ? "Cero"
                                : "-"}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontSize: "0.65rem",
                            }}
                          >
                            {materia.acta || "-"}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontSize: "0.65rem",
                            }}
                          >
                            {formatFecha(materia.fecha) || "-"}
                          </td>
                          <td
                            style={{
                              padding: "0.5rem 0.25rem",
                              textAlign: "center",
                              fontSize: "0.65rem",
                            }}
                          >
                            {materia.periodo || "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: "var(--bg3)",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      <td
                        colSpan="6"
                        style={{
                          padding: "0.5rem",
                          textAlign: "right",
                          fontWeight: "bold",
                        }}
                      >
                        PROMEDIO DEL SEMESTRE:
                      </td>
                      <td
                        style={{
                          padding: "0.5rem",
                          textAlign: "center",
                          fontWeight: "bold",
                          color: "var(--accent)",
                        }}
                      >
                        {semestre.promedio || "-"}
                        {console.log(
                          "promedio del semestre",
                          semestre.promedio,
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
