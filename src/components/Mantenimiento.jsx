export default function Mantenimiento() {
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
        </div>
      </main>
    </div>
  );
}
