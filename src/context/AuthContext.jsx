import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
      localStorage.removeItem("token");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const register = async (formData) => {
    // Let the browser/axios set Content-Type (incl. the multipart boundary)
    // automatically for FormData - setting it manually here would strip the
    // boundary parameter and break upload parsing on the server.
    const { data } = await api.post("/auth/register", formData);
    localStorage.setItem("token", data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // ignore network errors on logout, still clear local state
    }
    localStorage.removeItem("token");
    setUser(null);
  };

  const updateUser = (partial) => setUser((prev) => ({ ...prev, ...partial }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, refresh: loadMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
