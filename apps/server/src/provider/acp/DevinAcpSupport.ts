import { type DevinSettings, ProviderDriverKind } from "@t3tools/contracts";
import * as Crypto from "effect/Crypto";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as ChildProcessSpawner from "effect/unstable/process/ChildProcessSpawner";
import * as EffectAcpErrors from "effect-acp/errors";
import type * as EffectAcpSchema from "effect-acp/schema";
import { normalizeModelSlug } from "@t3tools/shared/model";

import * as AcpSessionRuntime from "./AcpSessionRuntime.ts";
import { findSessionConfigOption } from "./AcpRuntimeModel.ts";

const DEVIN_DRIVER_KIND = ProviderDriverKind.make("devin");
const DEVIN_MODEL_CONFIG_ID = "model";

type DevinAcpRuntimeDevinSettings = Pick<DevinSettings, "binaryPath">;

export interface DevinAcpRuntimeInput extends Omit<
  AcpSessionRuntime.AcpSessionRuntimeOptions,
  "authMethodId" | "clientCapabilities" | "spawn"
> {
  readonly childProcessSpawner: ChildProcessSpawner.ChildProcessSpawner["Service"];
  readonly devinSettings: DevinAcpRuntimeDevinSettings | null | undefined;
  readonly environment?: NodeJS.ProcessEnv;
}

export function buildDevinAcpSpawnInput(
  devinSettings: DevinAcpRuntimeDevinSettings | null | undefined,
  cwd: string,
  environment?: NodeJS.ProcessEnv,
): AcpSessionRuntime.AcpSpawnInput {
  return {
    command: devinSettings?.binaryPath || "devin",
    args: ["acp"],
    cwd,
    ...(environment ? { env: environment } : {}),
  };
}

export const makeDevinAcpRuntime = (
  input: DevinAcpRuntimeInput,
): Effect.Effect<
  AcpSessionRuntime.AcpSessionRuntime["Service"],
  EffectAcpErrors.AcpError,
  Crypto.Crypto | Scope.Scope
> =>
  Effect.gen(function* () {
    const acpContext = yield* Layer.build(
      AcpSessionRuntime.layer({
        ...input,
        spawn: buildDevinAcpSpawnInput(input.devinSettings, input.cwd, input.environment),
      }).pipe(
        Layer.provide(
          Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, input.childProcessSpawner),
        ),
      ),
    );
    return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(
      Effect.provide(acpContext),
    );
  });

export function resolveDevinAcpBaseModelId(model: string | null | undefined): string {
  const trimmed = model?.trim();
  const base = trimmed && trimmed.length > 0 ? trimmed : "swe-1-7";
  return normalizeModelSlug(base, DEVIN_DRIVER_KIND) ?? "swe-1-7";
}

export function currentDevinModelIdFromSessionSetup(
  sessionSetupResult:
    | EffectAcpSchema.LoadSessionResponse
    | EffectAcpSchema.NewSessionResponse
    | EffectAcpSchema.ResumeSessionResponse,
): string | undefined {
  const modelOption = findSessionConfigOption(
    sessionSetupResult.configOptions,
    DEVIN_MODEL_CONFIG_ID,
  );
  return modelOption?.currentValue?.toString().trim() || undefined;
}

export function currentDevinModelIdFromConfigOptions(
  configOptions: ReadonlyArray<EffectAcpSchema.SessionConfigOption> | null | undefined,
): string | undefined {
  const modelOption = findSessionConfigOption(configOptions, DEVIN_MODEL_CONFIG_ID);
  return modelOption?.currentValue?.toString().trim() || undefined;
}

export interface DevinAcpModelSelectionRuntime {
  readonly setConfigOption: AcpSessionRuntime.AcpSessionRuntime["Service"]["setConfigOption"];
  readonly getConfigOptions: AcpSessionRuntime.AcpSessionRuntime["Service"]["getConfigOptions"];
}

export function applyDevinAcpModelSelection<E>(input: {
  readonly runtime: DevinAcpModelSelectionRuntime;
  readonly currentModelId: string | undefined;
  readonly requestedModelId: string | undefined;
  readonly mapError: (cause: EffectAcpErrors.AcpError) => E;
}): Effect.Effect<string | undefined, E> {
  const resolved =
    input.requestedModelId !== undefined
      ? resolveDevinAcpBaseModelId(input.requestedModelId)
      : input.currentModelId;
  if (resolved === undefined) {
    return Effect.succeed(resolved);
  }
  if (input.currentModelId === resolved) {
    return Effect.succeed(resolved);
  }
  return input.runtime
    .setConfigOption(DEVIN_MODEL_CONFIG_ID, resolved)
    .pipe(Effect.mapError(input.mapError), Effect.as(resolved));
}

const DEVIN_MODE_BY_RUNTIME_MODE: Record<
  "approval-required" | "auto-accept-edits" | "auto" | "full-access",
  string
> = {
  "approval-required": "accept-edits",
  "auto-accept-edits": "accept-edits",
  auto: "accept-edits",
  "full-access": "bypass",
};

export function resolveDevinAcpMode(
  runtimeMode: string | undefined,
  interactionMode: string | undefined,
): string {
  if (interactionMode === "plan") {
    return "plan";
  }
  if (runtimeMode && runtimeMode in DEVIN_MODE_BY_RUNTIME_MODE) {
    return DEVIN_MODE_BY_RUNTIME_MODE[runtimeMode as keyof typeof DEVIN_MODE_BY_RUNTIME_MODE];
  }
  return "accept-edits";
}

export function applyDevinAcpModeSelection<E>(input: {
  readonly runtime: Pick<AcpSessionRuntime.AcpSessionRuntime["Service"], "setMode">;
  readonly currentModeId: string | undefined;
  readonly runtimeMode: string | undefined;
  readonly interactionMode: string | undefined;
  readonly mapError: (cause: EffectAcpErrors.AcpError) => E;
}): Effect.Effect<string, E> {
  const targetMode = resolveDevinAcpMode(input.runtimeMode, input.interactionMode);
  if (input.currentModeId === targetMode) {
    return Effect.succeed(targetMode);
  }
  return input.runtime
    .setMode(targetMode)
    .pipe(Effect.mapError(input.mapError), Effect.as(targetMode));
}
