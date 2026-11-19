import { packById, site } from "../data/site";
import type { RecordedData } from "../../scripts/site-types";
import { cap } from "../shared/status";

export type Source = {
  key: string;
  label: string;
  /** Honest provenance: a worked example from the catalog, or a reply recorded from a named model. */
  origin: string;
  title: string;
  lines: string[];
};

const lineOf = (c: Record<string, unknown>) => JSON.stringify(c);

/** Worked examples of every pack that has one, and screens real models wrote in recorded runs. */
export function sources(data?: RecordedData | null): Source[] {
  const worked = site.packs
    .filter((pack) => pack.lines.length)
    .map((pack): Source => ({
      key: `ex_${pack.id}`,
      label: `${cap(pack.id)} app`,
      origin: `worked example, packs/${pack.id}/example.jsonl`,
      title: pack.example,
      lines: pack.lines,
    }));
  const recorded = (data?.screens ?? [])
    .filter((entry) => entry.screen.components.length >= 4)
    .slice(0, 40)
    .map((entry, at): Source => ({
      key: `rec_${at}`,
      label: entry.screen.title ?? entry.screen.id,
      origin: `recorded from ${entry.model}${entry.pack ? `, ${cap(entry.pack)} pack` : ", core"}`,
      title: `${entry.screen.title ?? entry.screen.id}, written by ${entry.model}`,
      lines: entry.screen.components.map(lineOf),
    }));
  return [...worked.filter((s) => packById.get(s.key.slice(3))?.ready), ...recorded.slice(0, 6)];
}
