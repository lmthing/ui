import type { PackId, PackMeta } from "../../meta";
import { probePackIndex } from "./probe-pack-index";
import { packSelectionProbes } from "./pack-selection-probes";
import { scorePack } from "./score-pack";
import type { ProbeCall, ProbeResult, ReplayProbe } from "..";

const selectionInstructions = [
  "Choose the domain packs this app needs from the index below.",
  "Match the app's purpose to the pack's purpose and pick line.",
  "Include a matching domain even when core components cover some screens.",
  "Choose [] only for a core-only app with no matching domain.",
  "Use the best matching pack for each independently requested job.",
  "Do not add another pack for details the chosen pack already covers.",
].join(" ");

const selectionPrompt = (index: string, idea: string) =>
  `${selectionInstructions}\n\n${index}\n\nIdea: ${idea}\nReply with a JSON array of up to 3 pack ids, or [] when none fit.`;

function selectionReplayProbe(
  id: PackId,
  index: string,
  probe: ReturnType<typeof packSelectionProbes>[number],
): ReplayProbe {
  const ids = [...new Set([id, ...probe.expect, ...(probe.allow ?? [])])];
  const listing = index.split("\n").filter((line) => ids.some((pack) => line.startsWith(`- ${pack}: `)));
  return {
    id: `${id}/pack/${probe.idea}`,
    definition: probe,
    localPrompt: selectionPrompt(listing.join("\n"), probe.idea),
    listing: { ids },
  };
}

/** Director probes use the complete index, even when only one pack's probes are selected. */
export async function runPackProbes(options: {
  packs: Partial<Record<PackId, PackMeta>>;
  callModel: ProbeCall;
  only?: readonly string[];
  samples?: number;
}): Promise<ProbeResult[]> {
  const { packs, callModel, only, samples = 1 } = options;
  const results: ProbeResult[] = [];
  const index = probePackIndex(packs);
  for (const id of index.ids.filter((id) => (only?.length ? only.includes(id) : packs[id]))) {
    for (const probe of packSelectionProbes(id, packs[id])) {
      const prompt = selectionPrompt(index.prompt, probe.idea);
      const replayProbe = selectionReplayProbe(id, index.prompt, probe);
      const runs = [];
      for (let sample = 0; sample < samples; sample++) {
        const reply = await callModel(prompt, sample, undefined, replayProbe);
        runs.push({ reply, ...scorePack(reply, index.ids, probe.expect, probe.allow) });
      }
      const passed = runs.filter((run) => run.pass).length;
      const shown = runs.find((run) => !run.pass) ?? runs[0]!;
      results.push({
        component: id,
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
