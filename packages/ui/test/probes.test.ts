// Replays the recorded model replies: every component's probes must pass on every required model.
// A missing recording fails with the command to run (pnpm llm:check --component <Id>).
import { describe, expect, it } from "vitest";
import { createRegistry, runProbes, runPackProbes, packs } from "@lmthing/ui/catalog";

import { existsSync } from "node:fs";
import { probeModels, replayCall } from "../scripts";

const known = (id: string) => existsSync(`${import.meta.dirname}/known/${id}.md`);

const registry = createRegistry({ includeDrafts: true });
const required = probeModels.filter((model) => model.required);

describe.each(required)("probes on $id", (model) => {
  it.each(registry.ids)("%s passes its probes", async (id) => {
    if (known(id)) return; // open problem in test/known/<Id>.md: llm:check shows it, the fixer clears it
    const results = await runProbes({
      defs: registry.defs,
      callModel: replayCall(id, model.id),
      only: [id],
      samples: model.samples,
    });
    const failures = results.filter((result) => result.status === "fail");
    expect(failures.map((f) => `${f.probe.kind}: ${f.detail}`)).toEqual([]);
    expect(results.some((result) => result.status === "pass")).toBe(true);
  });
});

describe.each(required)("pack probes on $id", (model) => {
  it("replays pack recordings with at least 90% accuracy", async () => {
    const results = [];
    for (const id of Object.keys(packs))
      results.push(
        ...(await runPackProbes({
          packs,
          only: [id],
          samples: model.samples,
          callModel: replayCall(`pack/${id}`, model.id),
        })),
      );
    if (!results.length) return;
    expect(
      results.filter((result) => result.status === "pass").length / results.length,
    ).toBeGreaterThanOrEqual(0.9);
  });
});
