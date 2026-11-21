import { z } from "zod";
import type { Definition, Probe, ReplayProbe } from "./types";

export function componentReplayProbe(def: Definition, probe: Probe, localPrompt: string): ReplayProbe {
  const text = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : probe.task;
  return {
    id: `${def.meta.id}/${probe.kind}/${text}`,
    definition: {
      meta: def.meta,
      schema: z.toJSONSchema(def.props, { io: "input", unrepresentable: "any" }),
      examples: def.examples,
      probe,
    },
    localPrompt,
    ...(probe.kind === "choose" ? { listing: { ids: [def.meta.id] } } : {}),
  };
}
