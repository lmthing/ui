import type { StateName } from "../../../catalog";
import { homeWordsFor } from "../lang";
import { homeTimestampParts } from "./timestamp";

type Routine = {
  id: string;
  name: string;
  triggerSummary: string;
  actionsSummary: string;
  lastRun?: string | undefined;
};
type Input = { routines: Routine[]; style: "rules" | "activity"; detail: "full" | "brief" };

export function routineLastRun(at: string | undefined, lang?: string) {
  const { routines: words } = homeWordsFor(lang);
  if (!at) return words.never;
  const { date, clock } = homeTimestampParts(at, lang);
  return words.last(date, clock);
}

export function routineOrder<T extends { lastRun?: string | undefined }>(
  rows: readonly T[],
  style: Input["style"],
) {
  const time = ({ lastRun }: T) => (lastRun ? Date.parse(lastRun) : -Infinity);
  return style === "rules" ? rows : [...rows].sort((a, b) => time(b) - time(a));
}

export function routineReading(raw: unknown, state: StateName, lang?: string) {
  const { routines, style, detail } = raw as Input;
  const { routines: words } = homeWordsFor(lang);
  return [
    words[style],
    words.automatic,
    words.run,
    ...(state === "success" ? [words.success] : []),
    ...routineOrder(routines, style).map((row) =>
      [
        row.id,
        row.name,
        ...(style === "rules" ? [words.trigger(row.triggerSummary)] : []),
        ...(detail === "full" ? [words.action(row.actionsSummary)] : []),
        routineLastRun(row.lastRun, lang),
      ].join(" · "),
    ),
  ];
}

/** Keep authored trigger text intact while letting the view emphasize numbers and units. */
export function routineTriggerParts(trigger: string) {
  return trigger.split(/(\p{Nd}+(?:[.:,]\p{Nd}+)*(?:[%°])?)/u);
}
