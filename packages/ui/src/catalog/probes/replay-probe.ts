import { z } from "zod";
import type { Definition, Probe, ReplayProbe } from "./types";

function schemaForReplay(props: Definition["props"]) {
  return z.toJSONSchema(props, {
    io: "input",
    unrepresentable: "any",
    override: ({ zodSchema, jsonSchema }) => {
      const checks = zodSchema._zod.def.checks ?? [];
      const custom = checks
        .map((check) => check._zod.def.check)
        .filter((kind) => kind === "custom" || kind === "overwrite");
      if (custom.length) jsonSchema["x-replay-checks"] = custom;
    },
  });
}

export function componentReplayProbe(def: Definition, probe: Probe, localPrompt: string): ReplayProbe {
  const text = probe.kind === "choose" ? probe.need : probe.kind === "write" ? probe.brief : probe.task;
  const { status: _status, ...meta } = def.meta;
  return {
    id: `${def.meta.id}/${probe.kind}/${text}`,
    definition: {
      meta,
      schema: schemaForReplay(def.props),
      probe,
    },
    localPrompt,
    ...(probe.kind === "choose" ? { listing: { ids: [def.meta.id] } } : {}),
  };
}
