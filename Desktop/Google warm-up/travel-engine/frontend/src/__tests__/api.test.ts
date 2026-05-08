// Unit tests for API client module

const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, "localStorage", { value: localStorageMock });

describe("API client", () => {
  beforeEach(() => {
    mockFetch.mockClear();
    localStorageMock.clear();
  });

  it("adds Authorization header when token is set", async () => {
    localStorageMock.setItem("token", "test-jwt-token");
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "token", user: {} }),
    });

    const { api } = await import("@/lib/api");
    await api.trips.list();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers["Authorization"]).toBe("Bearer test-jwt-token");
  });

  it("does not add Authorization header when no token", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ([]),
    });

    const { api } = await import("@/lib/api");
    await api.trips.list();

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers["Authorization"]).toBeUndefined();
  });

  it("throws on non-ok response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ detail: "Unauthorized" }),
    });

    const { api } = await import("@/lib/api");
    await expect(api.trips.list()).rejects.toThrow("Unauthorized");
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => { throw new Error("No body"); },
    });

    const { api } = await import("@/lib/api");
    const result = await api.trips.delete("trip-id");
    expect(result).toBeUndefined();
  });

  it("sends correct Content-Type header", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ id: "new-trip" }),
    });

    const { api } = await import("@/lib/api");
    await api.trips.create({ title: "Test" });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers["Content-Type"]).toBe("application/json");
  });
});
