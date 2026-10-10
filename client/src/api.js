const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
let csrf;
async function token() {
  if (!csrf) {
    const r = await fetch(`${base}/csrf-token`, { credentials: "include" });
    csrf = (await r.json()).data.token;
  }
  return csrf;
}
export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (method !== "GET") headers["CSRF-Token"] = await token();
  const r = await fetch(`${base}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  if (r.status === 403 && method !== "GET") {
    csrf = null;
  }
  if (!r.ok) {
    const x = await r.json().catch(() => ({}));
    const e = new Error(x.error?.message || "Request failed");
    e.status = r.status;
    throw e;
  }
  return r.status === 204 ? null : (await r.json()).data;
}
