import { createContext, useContext, useState } from "react";
import { storage } from "../api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => storage.get("session"));

  const login = (data) => {
    storage.set("session", data);
    setSession(data);
  };

  const logout = () => {
    storage.del("session");
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
};
