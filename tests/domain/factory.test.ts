import { afterEach, describe, expect, it, vi } from "vitest";
import { createEmptyHoshinDocument } from "@/src/domain/hoshin/factory";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createEmptyHoshinDocument", () => {
  it("always starts in picker mode for deterministic hydration", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => "drag",
      setItem: () => undefined
    });

    const document = createEmptyHoshinDocument();
    expect(document.settings.arrowInputMode).toBe("picker");
  });

  it("falls back to generated id when randomUUID is unavailable", () => {
    vi.stubGlobal("crypto", {});
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      setItem: () => undefined
    });

    const document = createEmptyHoshinDocument();
    expect(document.id.startsWith("hoshin-")).toBe(true);
    expect(document.settings.arrowInputMode).toBe("picker");
  });
});
