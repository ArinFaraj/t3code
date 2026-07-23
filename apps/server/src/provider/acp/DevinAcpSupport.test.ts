import { describe, expect, it } from "vite-plus/test";

import { resolveDevinAcpBaseModelId, resolveDevinAcpMode } from "./DevinAcpSupport.ts";

describe("DevinAcpSupport", () => {
  describe("resolveDevinAcpBaseModelId", () => {
    it("returns the trimmed model slug", () => {
      expect(resolveDevinAcpBaseModelId(" swe-1-7 ")).toBe("swe-1-7");
    });

    it("falls back to the Devin default model", () => {
      expect(resolveDevinAcpBaseModelId(undefined)).toBe("swe-1-7");
      expect(resolveDevinAcpBaseModelId("")).toBe("swe-1-7");
    });
  });

  describe("resolveDevinAcpMode", () => {
    it("maps plan interaction mode to plan", () => {
      expect(resolveDevinAcpMode("auto", "plan")).toBe("plan");
      expect(resolveDevinAcpMode("full-access", "plan")).toBe("plan");
    });

    it("maps full-access runtime mode to bypass", () => {
      expect(resolveDevinAcpMode("full-access", undefined)).toBe("bypass");
    });

    it("maps other runtime modes to accept-edits", () => {
      expect(resolveDevinAcpMode("approval-required", undefined)).toBe("accept-edits");
      expect(resolveDevinAcpMode("auto-accept-edits", undefined)).toBe("accept-edits");
      expect(resolveDevinAcpMode("auto", undefined)).toBe("accept-edits");
    });

    it("defaults to accept-edits for unknown runtime modes", () => {
      expect(resolveDevinAcpMode(undefined, undefined)).toBe("accept-edits");
      expect(resolveDevinAcpMode("unknown", undefined)).toBe("accept-edits");
    });
  });
});
