import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { afterEach, describe, expect, it, vi } from "vitest";

import { apiRequest, resolveExetatApiUrl } from "./api";

vi.mock("@capacitor/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@capacitor/core")>();
  return {
    ...actual,
    Capacitor: {
      ...actual.Capacitor,
      isNativePlatform: vi.fn(),
    },
    CapacitorHttp: {
      request: vi.fn(),
    },
  };
});

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("API EXETAT selon la plateforme", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("conserve les URL relatives sur le portail web", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ status: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest("/api/v1/exetat/matieres");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exetat/matieres",
      expect.objectContaining({ headers: expect.any(Object) }),
    );
  });

  it("utilise le client HTTP natif uniquement pour une API EXETAT HTTPS", async () => {
    vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
    vi.stubEnv(
      "VITE_EXETAT_API_BASE_URL",
      "https://portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com",
    );
    const requestMock = vi.mocked(CapacitorHttp.request).mockResolvedValue({
      data: { quizId: "quiz-1" },
      status: 201,
      headers: {},
      url: "https://portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com/api/v1/exetat/quizzes",
    });

    await apiRequest("/api/v1/exetat/quizzes", {
      method: "POST",
      body: JSON.stringify({ subjectId: "cercle" }),
    });

    expect(requestMock).toHaveBeenCalledWith({
      url: "https://portail-mbuyamba.apps.rm3.7wse.p1.openshiftapps.com/api/v1/exetat/quizzes",
      method: "POST",
      headers: { "content-type": "application/json" },
      data: { subjectId: "cercle" },
      responseType: "json",
    });
  });

  it("refuse une configuration Android qui n'utilise pas HTTPS", () => {
    expect(() =>
      resolveExetatApiUrl("/api/v1/exetat/matieres", "http://portail.example.test"),
    ).toThrow(/HTTPS/i);
  });

  it("refuse toute route extérieure aux API EXETAT", () => {
    expect(() =>
      resolveExetatApiUrl("/actuator/health", "https://portail.example.test"),
    ).toThrow(/Seules les API EXETAT/i);
  });
});
