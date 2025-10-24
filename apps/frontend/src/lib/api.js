// src/lib/api.js
export async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");
  const headers = new Headers(options.headers || {});
  headers.set("Accept", "application/json");
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const resp = await fetch(url, { ...options, headers });

  if (resp.status === 401) {
    // token inválido/expirado → limpiar sesión y mandar a login
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.assign("/login");
    return; // corta ejecución
  }
  return resp;
}
