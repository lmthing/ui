import type { Meta, StateName, Tier } from "../../src/catalog";
import { componentSection, splitTop } from "./doc-section";
import { partMeta } from "./parts";
import type { Field } from "./shape";

const groups = ["structure", "content", "data", "input", "action", "beyond", "signature", "escape"];
const tiers: Tier[] = ["phone", "ok", "people", "service"];
const states: StateName[] = ["filled", "empty", "loading", "success", "error"];
const regions = ["top", "body", "bottom", "overlay"] as const;
const plain = (value: string) => value.replaceAll("`", "");

type DraftMeta = Omit<Meta, "variants"> & { variants?: Record<string, string[]> };

function readStates(source: string): StateName[] {
  if (!source) return ["filled"];
  return splitTop(splitTop(source, ".")[0] ?? "", ",;").map((part) => {
    const state = plain(part).split(/\s+/, 1)[0] as StateName;
    if (!states.includes(state)) throw new Error(`Unknown state: ${part}`);
    return state;
  });
}

export function readMeta(
  name: string,
  doc: ReturnType<typeof componentSection>,
  fields: Field[],
  axes: Record<string, string[]>,
) {
  const group = doc.heading.find((word) => groups.includes(word)) as Meta["group"] | undefined;
  const tier = doc.heading.find((word) => tiers.includes(word as Tier)) as Tier | undefined;
  const pick = doc.sections.get("Pick");
  if (!group || !tier || !pick) throw new Error(`Expected group, tier and Pick for ${name}`);
  const region = regions.find((value) => doc.heading.includes(value)) ?? "body";
  const density = doc.sections.get("Density") ?? "";
  const weight =
    /\bweight\s+([0-3])\b/.exec([...doc.heading, density].join(" "))?.[1] ??
    (region === "overlay" ? "0" : group === "structure" ? "1" : "2");
  const words = plain(doc.description || pick)
    .split(/\s+/)
    .slice(0, 16)
    .join(" ")
    .replace(/[,;:]$/, "");
  const purpose = /[.!?]$/.test(words) ? words : `${words}.`;
  const { groups: rowGroups, meta: parts } = partMeta(doc.sections.get("Parts") ?? "", fields);
  const meta: DraftMeta = {
    id: name,
    status: "draft",
    group,
    tier,
    pick: plain(pick),
    purpose,
    region,
    weight: Number(weight) as Meta["weight"],
    realPath: plain(
      doc.sections.get("Real path") ?? "On-device app content. Confirm the real path before shipping.",
    ),
    ...(Object.keys(axes).length ? { variants: axes } : {}),
    ...(/dense:\s*true/.test(density) ? { dense: true } : {}),
    ...parts,
    states: readStates(doc.sections.get("States") ?? ""),
    ...(/\bcode-owned\b/i.test(doc.heading.join(" ")) ? { codeOwned: true } : {}),
  };
  return { meta, rowGroups };
}

export function nearMiss(pick: string) {
  const alternatives = pick
    .split(/\bnot\b/i)
    .slice(1)
    .join(" ");
  return /`([A-Z][A-Za-z0-9]*)`/.exec(alternatives)?.[1];
}
