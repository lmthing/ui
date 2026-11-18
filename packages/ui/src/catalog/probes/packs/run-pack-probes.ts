import type { PackId, PackMeta } from "../../meta";
import { probePackIndex } from "./probe-pack-index";
import { scorePack } from "./score-pack";
import type { CallModel, ProbeResult } from "..";

/** Director probes use the complete index, even when only one pack's probes are selected. */
export async function runPackProbes(options: {
  packs: Partial<Record<PackId, PackMeta>>;
  callModel: CallModel;
  only?: readonly string[];
  samples?: number;
}): Promise<ProbeResult[]> {
  const { packs, callModel, only, samples = 1 } = options;
  const results: ProbeResult[] = [];
  const index = probePackIndex(packs);
  for (const pack of Object.values(packs).filter((pack) => !only?.length || only.includes(pack.id))) {
    for (const probe of pack.probes.filter((probe) => probe.kind === "pack")) {
      const prompt = `Choose the domain packs this app needs from the index below. Match the app's purpose to the pack's purpose and pick line. Include a matching domain even when core components cover some screens. Choose [] only for a core-only app with no matching domain.\n\n${index.prompt}\n\nIdea: ${probe.idea}\nReply with a JSON array of up to 3 pack ids, or [] when none fit.`;
      const runs = [];
      for (let sample = 0; sample < samples; sample++) {
        const reply = await callModel(prompt, sample);
        runs.push({ reply, ...scorePack(reply, index.ids, probe.expect) });
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
