import { describe, expect, it } from "vite-plus/test";
import type * as EffectAcpSchema from "effect-acp/schema";

import { buildDevinDiscoveredModelsFromConfigOptions } from "./DevinProvider.ts";

describe("buildDevinDiscoveredModelsFromConfigOptions", () => {
  it("returns an empty array when the model option is missing", () => {
    expect(buildDevinDiscoveredModelsFromConfigOptions([])).toEqual([]);
  });

  it("returns an empty array when the model option is not a select", () => {
    const options: ReadonlyArray<EffectAcpSchema.SessionConfigOption> = [
      {
        id: "model",
        name: "Model",
        type: "boolean",
        currentValue: false,
      },
    ];
    expect(buildDevinDiscoveredModelsFromConfigOptions(options)).toEqual([]);
  });

  it("builds models from flat options", () => {
    const options: ReadonlyArray<EffectAcpSchema.SessionConfigOption> = [
      {
        id: "model",
        name: "Model",
        type: "select",
        currentValue: "swe-1-7",
        options: [
          { value: "swe-1-7", name: "SWE 1.7" },
          { value: "swe-1-5", name: "SWE 1.5" },
        ],
      },
    ];
    const models = buildDevinDiscoveredModelsFromConfigOptions(options);
    expect(models).toHaveLength(2);
    expect(models[0]).toMatchObject({ slug: "swe-1-7", name: "SWE 1.7", isDefault: true });
    expect(models[1]).toMatchObject({ slug: "swe-1-5", name: "SWE 1.5", isDefault: undefined });
  });

  it("flattens grouped options and preserves all models", () => {
    const options: ReadonlyArray<EffectAcpSchema.SessionConfigOption> = [
      {
        id: "model",
        name: "Model",
        type: "select",
        currentValue: "gpt-5.4",
        options: [
          {
            group: "devin",
            name: "Devin",
            options: [
              { value: "swe-1-7", name: "SWE 1.7" },
              { value: "swe-1-5", name: "SWE 1.5" },
            ],
          },
          {
            group: "openai",
            name: "OpenAI",
            options: [
              { value: "gpt-5.4", name: "GPT 5.4" },
              { value: "composer-2", name: "Composer 2" },
            ],
          },
        ],
      },
    ];
    const models = buildDevinDiscoveredModelsFromConfigOptions(options);
    const slugs = models.map((m) => m.slug);
    expect(slugs).toEqual(["swe-1-7", "swe-1-5", "gpt-5.4", "composer-2"]);
    expect(models[2]).toMatchObject({ slug: "gpt-5.4", name: "GPT 5.4", isDefault: true });
  });

  it("deduplicates models by resolved slug", () => {
    const options: ReadonlyArray<EffectAcpSchema.SessionConfigOption> = [
      {
        id: "model",
        name: "Model",
        type: "select",
        currentValue: "swe-1-7",
        options: [
          { value: "swe-1-7", name: "SWE 1.7 (first)" },
          { value: "  swe-1-7  ", name: "SWE 1.7 (duplicate)" },
        ],
      },
    ];
    const models = buildDevinDiscoveredModelsFromConfigOptions(options);
    expect(models).toHaveLength(1);
    expect(models[0]).toMatchObject({
      slug: "swe-1-7",
      name: "SWE 1.7 (first)",
      isDefault: true,
    });
  });
});
