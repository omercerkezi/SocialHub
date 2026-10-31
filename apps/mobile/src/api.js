const BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export function createClient(token) {
  return async function api(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const body = options.body;
    if (body && !(body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${BASE}/api${path}`, { ...options, headers });
    const isJson = (response.headers.get("content-type") || "").includes("json");
    const data = isJson ? await response.json() : null;
    if (!response.ok) {
      throw new Error(data?.message || "The request did not complete.");
    }
    return data;
  };
}

export { BASE as apiBase };
