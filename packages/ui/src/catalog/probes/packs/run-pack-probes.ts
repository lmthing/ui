import type { PackId, PackMeta } from "../../meta";
import { buildPackIndex } from "../../prompt";
import { scorePack } from "./score-pack";
import type { CallModel, ProbeResult } from "../types";

/** Director probes use the complete index, even when only one pack's probes are selected. */
export async function runPackProbes(options: {
  packs: Partial<Record<PackId, PackMeta>>;
  callModel: CallModel;
  only?: readonly string[];
  samples?: number;
}): Promise<ProbeResult[]> {
  const { packs, callModel, only, samples = 1 } = options;
  const results: ProbeResult[] = [];
  for (const pack of Object.values(packs).filter((pack) => !only?.length || only.includes(pack.id))) {
    for (const probe of pack.probes) {
      const prompt = `${buildPackIndex(packs)}\n\nIdea: ${probe.idea}\nReply with a JSON array of up to 3 pack ids, or [] when none fit.`;
      const runs = [];
      for (let sample = 0; sample < samples; sample++) {
        const reply = await callModel(prompt, sample);
        runs.push({ reply, ...scorePack(reply, Object.keys(packs), probe.expect) });
      }
      const passed = runs.filter((run) => run.pass).length;
      const shown = runs.find((run) => !run.pass) ?? runs[0]!;
      results.push({
        component: pack.id,
        probe,
        prompt,
        reply: shown.reply,
        status: passed * 2 > samples ? "pass" : "fail",
        score: `${passed}/${samples}`,
        detail: passed * 2 > samples && passed < samples ? `unstable: ${shown.detail}` : shown.detail,
      });
    }
  }
  return results;
}
