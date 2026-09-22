import { useState } from "react";
import { apiFetch, storage } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState(""); //estado para la contrasena
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/auth/login", {
        method: "POST",
        body: { email, password: pass },
    		skipAuthRedirect: true //configuracion para evitar la redireccion automatica, quieremos recibir el codigo http antes de que vuelva a cargar
      });
      storage.set("session", data);
      onLogin(data);

	
    } catch (err) {
		if(err.status === 401) {
			setError("Ejavy la nde contraseña o la nde correo");
		}
		else if(err.message){
			setError(err.message);//verificar algun error especifico
		}
		else {
			setError("Error al iniciar sesión. Verifica tus credenciales")
		}
    } finally {
      setLoading(false);
    }
  }

return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-mark" />
        <div className="login-logo"><span>FIUNI</span> Integral 2.0</div>
        <p className="login-sub">Ingresa con tu cuenta institucional</p>

        <form onSubmit={handleLogin}>

          <div className="field">
            <label>Correo institucional</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre.apellido@fiuni.edu.py"
              required
            />
          </div>

          <div className="field field-pass">
            <label>Contraseña</label>
            <div className="field-pass-wrap">
              <input
                type={showPass ? "text" : "password"}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                placeholder="Ingresa tu contraseña"
                required
              />
              <button
                type="button"
                className="btn-ver-pass"
                onClick={() => setShowPass((v) => !v)}
                tabIndex={-1}
                aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                <img src={showPass ? "/src/assets/ojo-off.svg" : "/src/assets/ojo.svg"} alt="" width="20" height="20" />
              </button>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>

          {error && <div className="error-msg">{error}</div>}
        </form>
      </div>
    </div>
  );
}
