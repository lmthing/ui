import { appointmentDate, numberLine, timeOfDayLine, type Meta, type StateName } from "../../../catalog";
import { communityWordsFor } from "../lang";

type Words = ReturnType<typeof communityWordsFor>["modQueue"];
type Seed = {
  id: string;
  kind: keyof Words["kind"];
  author: string;
  photo?: string | undefined;
  summary: string;
  detail?: string | undefined;
  reason?: string | undefined;
  submittedAt: string;
  status: keyof Words["status"];
  goto?: string | undefined;
};

export type ModQueueRow = ReturnType<typeof modQueueItems>[number] & { selectedRule?: string };

export function modQueueItems({ items, rules, style }: { items: Seed[]; rules: string[]; style: string }) {
  return items.map((row) => {
    const pending = row.status === "pending";
    const joins = row.kind === "join";
    return {
      ...row,
      queueId: row.id,
      linked: Boolean(row.goto),
      shown: style !== "joins" || (joins && pending),
      canDecline: pending && joins,
      canRemove: pending && !joins,
      // A draft rule belongs to this record and its allowed choices, not to the reused row slot.
      ruleChoices: rules.map((label) => ({ label, value: `${row.id}:${label}` })),
    };
  });
}

export function modQueueCount(rows: readonly Seed[], lang?: string) {
  return numberLine(rows.filter(({ status }) => status === "pending").length, lang);
}

export function modQueueRowMeta(row: Seed, lang?: string) {
  const words = communityWordsFor(lang).modQueue;
  const date = appointmentDate(row.submittedAt.slice(0, 10), lang);
  const time = timeOfDayLine(row.submittedAt.slice(11, 16), lang);
  const kind =
    row.status === "pending"
      ? words.kind[row.kind]
      : [words.kind[row.kind], words.status[row.status]].join(words.separator);
  const timestamp = words.submitted(date, time);
  return { kind, timestamp, text: [kind, timestamp].join(words.separator) };
}

const picked = (row: ModQueueRow) => row.ruleChoices.find(({ value }) => value === row.selectedRule)?.label;

export const modQueuePresentation: NonNullable<NonNullable<Meta["live"]>["derive"]> = (input) => ({
  items: (input.items as ModQueueRow[]).map((row) => ({
    ...row,
    detail: input.detail === "brief" ? undefined : row.detail,
    selectedRule: row.status === "pending" && picked(row) ? row.selectedRule : undefined,
  })),
});

export function modQueueReason(row: ModQueueRow, words: Words) {
  return row.reason ? words.recordedReason(row.reason) : undefined;
}

export function modQueueApprove(row: ModQueueRow, words: Words) {
  return row.kind === "join" ? words.approve : words.keep;
}

export function modQueueState(state: StateName, words: Words) {
  return state === "error" ? words.error : state === "success" ? words.saved : undefined;
}

type Binding = NonNullable<NonNullable<Meta["hostCommands"]>["items"]>[`${string}.press`];
export function modQueueDecision(decision: Exclude<Seed["status"], "pending">): NonNullable<Binding> {
  return {
    kind: "command",
    name: "moderate_item",
    input: ({ row }) => {
      if (!row) return;
      const item = row as ModQueueRow;
      return { itemId: item.queueId, decision, reason: picked(item) ?? null };
    },
  };
}

export const modQueueReading: NonNullable<Meta["read"]> = (input, state, lang) => {
  const words = communityWordsFor(lang).modQueue;
  const { items: rows } = input as { items: ModQueueRow[] };
  if (state !== "filled" && state !== "success") return [];
  return [
    ...(state === "success" ? [words.saved] : []),
    words.heading,
    words.counts(modQueueCount(rows, lang)),
    ...(state === "filled" && rows.length === 0 ? [words.empty] : []),
    ...rows.map((row) => {
      const selection = picked(row);
      return [
        `${row.id}: ${row.author}`,
        modQueueRowMeta(row, lang).text,
        row.summary,
        row.detail,
        modQueueReason(row, words),
        selection && words.selectedReason(selection),
        ...(state === "filled" && row.status === "pending"
          ? [
              words.reason,
              ...row.ruleChoices.map(({ label }) => label),
              modQueueApprove(row, words),
              row.canDecline ? words.decline : words.remove,
            ]
          : []),
      ]
        .filter(Boolean)
        .join(words.separator);
    }),
  ];
};
