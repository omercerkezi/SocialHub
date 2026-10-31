const TOKEN = "socialhub.token";

export function token() {
  return sessionStorage.getItem(TOKEN) || "";
}

export function setToken(value) {
  if (value) sessionStorage.setItem(TOKEN, value);
  else sessionStorage.removeItem(TOKEN);
}

export function fileUrl(id) {
  return `/api/media/${id}/file?token=${encodeURIComponent(token())}`;
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (token()) headers.set("Authorization", `Bearer ${token()}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (response.status === 401 && !path.startsWith("/auth/login")) {
    setToken("");
    if (window.location.pathname !== "/login") window.location.assign("/login");
  }
  const isJson = (response.headers.get("content-type") || "").includes("json");
  const data = isJson ? await response.json() : null;
  if (!response.ok) {
    const error = new Error(data?.message || "The request did not complete.");
    error.fields = data?.fields || {};
    error.status = response.status;
    throw error;
  }
  return data;
}
