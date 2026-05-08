const _apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const BASE = _apiUrl.endsWith("/api") ? _apiUrl : `${_apiUrl}/api`;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Request failed");
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  auth: {
    register: (data: unknown) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
    login: (data: unknown) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    googleSignIn: (id_token: string) =>
      request("/auth/google", { method: "POST", body: JSON.stringify({ id_token }) }),
  },
  trips: {
    list: () => request("/trips/"),
    get: (id: string) => request(`/trips/${id}`),
    create: (data: unknown) => request("/trips/", { method: "POST", body: JSON.stringify(data) }),
    generate: (data: unknown) => request("/trips/generate", { method: "POST", body: JSON.stringify(data) }),
    chat: (data: unknown) => request("/trips/chat", { method: "POST", body: JSON.stringify(data) }),
    updateStatus: (id: string, status: string) =>
      request(`/trips/${id}/status?status=${status}`, { method: "PATCH" }),
    updatePreferences: (id: string, data: unknown) =>
      request(`/trips/${id}/preferences`, { method: "PATCH", body: JSON.stringify(data) }),
    searchPlaces: (id: string, query: string) =>
      request(`/trips/${id}/places?query=${encodeURIComponent(query)}`),
    delete: (id: string) => request(`/trips/${id}`, { method: "DELETE" }),
  },
};

export function createWebSocket(tripId: string): WebSocket {
  const wsBase = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000")
    .replace("https://", "wss://")
    .replace("http://", "ws://")
    .replace(/\/api$/, "");
  return new WebSocket(`${wsBase}/ws/trips/${tripId}`);
}
