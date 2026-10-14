const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
const base =
  configuredBase ||
  (import.meta.env.DEV
    ? "http://localhost:5000/api"
    : "https://m-dairy.onrender.com/api");
let csrf;

async function responseBody(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json().catch(() => null);
}

async function token() {
  if (!csrf) {
    const response = await fetch(`${base}/csrf-token`, {
      credentials: "include",
    });
    const payload = await responseBody(response);
    if (!response.ok || !payload?.data?.token)
      throw new Error(
        "Unable to start a secure session. Check that the M-DAIRY API is available.",
      );
    csrf = payload.data.token;
  }
  return csrf;
}

export async function api(path, { method = "GET", body, signal } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (method !== "GET" && method !== "HEAD")
    headers["CSRF-Token"] = await token();
  const response = await fetch(`${base}${path}`, {
    method,
    headers,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
    signal,
  });
  const payload = response.status === 204 ? null : await responseBody(response);
  if (response.status === 403 && method !== "GET" && method !== "HEAD") csrf = null;
  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
        (response.status === 404
          ? "M-DAIRY API endpoint was not found."
          : "The M-DAIRY API returned an unexpected response. Please try again."),
    );
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  if (!payload?.data)
    throw new Error("The M-DAIRY API returned an invalid response.");
  return payload.data;
}
