const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("shelther_token");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("shelther_user");
  return raw ? JSON.parse(raw) : null;
}

export function setSession(token, user) {
  localStorage.setItem("shelther_token", token);
  localStorage.setItem("shelther_user", JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem("shelther_token");
  localStorage.removeItem("shelther_user");
  window.location.href = "/";
}

export async function api(path, opts = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...(opts.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.detail || "Something went wrong.";
    throw new Error(typeof message === "string" ? message : JSON.stringify(message));
  }
  return data;
}

export async function apiUpload(path, file) {
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}${path}`, { method: "POST", headers, body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || "Upload failed.");
  return data;
}

export function resolveImageUrl(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}
