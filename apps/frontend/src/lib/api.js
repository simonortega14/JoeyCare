// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_URL || "";

export const getToken = () => (localStorage.getItem("token") || "").trim();
export const authHeader = () => {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeader() },
    credentials: "omit", // usa "include" solo si dependes de cookies
  });
  return res; // no redirijas aquí
}
