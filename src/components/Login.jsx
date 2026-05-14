import { useState } from "react";
import { apiFetch, storage } from "../api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState(""); //estado para la contrasena
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
        <div className="login-logo">FIUNI Correlativas</div>
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

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="********"
              required
            />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
          {error && <div className="error-msg"> {error}</div>}
        </form>
      </div>
    </div>
  );
}
