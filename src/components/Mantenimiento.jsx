import { useState } from "react";

export default function Mantenimiento() {
  const [porqueAbierto, setPorqueAbierto] = useState(false);

  return (
    <div className="mantenimiento-wrap">
      <div className="mantenimiento-noise" aria-hidden="true" />

      <main className="mantenimiento-card">
        <div className="mantenimiento-icono">
          <img src="/img/maintenance2.gif" alt="Jona trabajando" />
        </div>

        <h1 className="mantenimiento-titulo">System Update</h1>

        <p className="mantenimiento-texto">
          El servidor oficial de Integral no está funcionando en este momento.
          Estamos trabajando para restablecer el servicio. Volvé a intentar en
          unos minutos.
        </p>
        <p className="mantenimiento-subtexto">
          A full romba&apos;apo hina, tranqui nomas.
        </p>

        <div className="mantenimiento-barra">
          <div className="mantenimiento-barra-fill" />
        </div>

        <div className="mantenimiento-footer">
          <button
            type="button"
            className={`mantenimiento-porque-btn${porqueAbierto ? " abierto" : ""}`}
            onClick={() => setPorqueAbierto((v) => !v)}
            aria-expanded={porqueAbierto}
            aria-controls="mantenimiento-porque"
          >
            ¿Por qué?
            <span className="mantenimiento-porque-flecha" aria-hidden="true">
              ▾
            </span>
          </button>

          <div
            id="mantenimiento-porque"
            className={`mantenimiento-slide${porqueAbierto ? " abierto" : ""}`}
          >
            <div className="mantenimiento-slide-inner">
              <p className="mantenimiento-slide-texto">
								No se lgm kp.
                El servidor oficial de Integral no está respondiendo. 
								Probablemente estan trabajando en actualizaciones o mantenimiento.

								Integral 2.0 necesita conectarse a ese servidor. Mientras no vuelva, la app
                queda en mantenimiento para no mostrarte datos incompletos ni
                errores. No es un problema de tu cuenta ni de tu contraseña. No anda luego Integral, eso.
								
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
