import { describe, expect, it } from "vite-plus/test";
import * as EffectAcpErrors from "effect-acp/errors";

import { isSessionAlreadyOpenError } from "./AcpSessionRuntime.ts";

describe("AcpSessionRuntime", () => {
  describe("isSessionAlreadyOpenError", () => {
    it("returns true for an AcpRequestError whose message says the session is already open", () => {
      const error = new EffectAcpErrors.AcpRequestError({
        code: -32602,
        errorMessage:
          "Session 'fearless-creator' is already open in another process. Close the other instance before opening it here.",
      });
      expect(isSessionAlreadyOpenError(error)).toBe(true);
    });

    it("returns false for unrelated AcpRequestErrors", () => {
      const error = new EffectAcpErrors.AcpRequestError({
        code: -32602,
        errorMessage: "Invalid params",
      });
      expect(isSessionAlreadyOpenError(error)).toBe(false);
    });

    it("returns true for an AcpTransportError whose cause contains the already-open message", () => {
      const error = new EffectAcpErrors.AcpTransportError({
        operation: "call-rpc",
        method: "session/load",
        cause: new Error("Session 'fearless-creator' is already open in another process."),
      });
      expect(isSessionAlreadyOpenError(error)).toBe(true);
    });

    it("returns false for an AcpTransportError with an unrelated cause", () => {
      const error = new EffectAcpErrors.AcpTransportError({
        operation: "call-rpc",
        method: "session/load",
        cause: new Error("Connection refused"),
      });
      expect(isSessionAlreadyOpenError(error)).toBe(false);
    });

    it("returns true for a raw Error containing the already-open message", () => {
      expect(
        isSessionAlreadyOpenError(
          new Error(
            "Session 'fearless-creator' is already open in another process. Close the other instance before opening it here.",
          ),
        ),
      ).toBe(true);
    });

    it("returns false for a raw Error with an unrelated message", () => {
      expect(isSessionAlreadyOpenError(new Error("Connection refused"))).toBe(false);
    });
  });
});
