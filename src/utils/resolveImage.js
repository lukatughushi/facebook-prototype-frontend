import { API_BASE } from "../api/axios";

// Post/user images are stored as relative paths like "/uploads/xyz.png".
// Prefix them with the backend's origin so <img> tags resolve correctly
// regardless of which port the Vite dev server runs on.
export default function resolveImage(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_BASE}${path}`;
}
