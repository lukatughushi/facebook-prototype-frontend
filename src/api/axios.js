import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Central axios instance:
// - `withCredentials` sends the HttpOnly auth cookie set by the backend.
// - We also attach a Bearer token from localStorage as a fallback, so auth
//   keeps working even in setups where third-party cookies are blocked.
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const API_BASE = API_URL;

export default api;
