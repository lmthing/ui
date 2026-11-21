import type { PackProbe } from "..";
import type { PackId, PackMeta } from "../../meta";
import { connectionProbes } from "./connection-probes";
import { discoveryProbes } from "./discovery-probes";
import { interestProbes } from "./interest-probes";

const wave6: Partial<Record<PackId, readonly PackProbe[]>> = {
  ...connectionProbes,
  ...discoveryProbes,
  ...interestProbes,
};

/** Index-level probes exist before a scaffold; its own probes can add cases. */
export function packSelectionProbes(id: PackId, pack?: PackMeta): readonly PackProbe[] {
  const authored = pack?.probes.filter((probe) => probe.kind === "pack") ?? [];
  return [...(wave6[id] ?? []), ...authored];
}
