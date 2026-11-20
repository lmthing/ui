import type { StateName } from "../../../catalog";
import { requestsWordsFor, type RequestsWords } from "../lang";

type Words = RequestsWords["triage"];
type Route = { id: string; kind: "queue"; label: string };
type Duplicate = { id: string; kind: "duplicate"; number: string; title: string };
type Reading = {
  number: string;
  title: string;
  reportedUrgency: keyof Words["urgency"];
  priority: keyof Words["urgency"];
  impact: Parameters<Words["impact"]>[0];
  detail: "full" | "brief";
  apply?: number;
  canApply: boolean;
  reason: string;
  choices: (Route | Duplicate)[];
};

export function triageReading(input: unknown, state: StateName, lang?: string): string[] {
  const { triage: w } = requestsWordsFor(lang);
  if (state === "success") return [w.saved];
  if (state !== "filled") return [];
  const p = input as Reading;
  const decision = p.apply === undefined ? undefined : p.choices[p.apply];
  const hasDuplicates = p.choices.some(({ kind }) => kind === "duplicate");
  return [
    ...(p.detail === "full" ? [p.number, p.title, w.reported(p.reportedUrgency), w.impact(p.impact)] : []),
    p.detail === "brief" ? w.decision : w.priority,
    w.urgency[p.priority],
    ...Object.values(w.urgency),
    w.queue,
    ...(decision && p.canApply
      ? [w.selected(decision.kind === "duplicate" ? decision.number : decision.label)]
      : []),
    ...(hasDuplicates ? [w.duplicates, w.link, w.chosen] : []),
    ...p.choices.map((row) =>
      row.kind === "queue" ? `${row.id} ${row.label}` : `${row.id} ${row.number} ${row.title}`,
    ),
    w.reason,
    p.reason,
    w.apply,
  ].filter(Boolean);
}
