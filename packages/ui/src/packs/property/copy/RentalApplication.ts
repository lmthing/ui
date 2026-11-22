import { z } from "zod";
import {
  appointmentDate,
  defineLocalState,
  localeOf,
  moneyLine,
  type AppCurrency,
  type StateName,
} from "../../../catalog";
import { propertyWordsFor } from "../lang";

export const applicationNoteMax = 120;
export const applicationDecisions = z.enum(["pending", "waitlisted", "approved", "declined"]);
type Decision = z.output<typeof applicationDecisions>;
type Words = ReturnType<typeof propertyWordsFor>["applications"];
type Check = { kind: keyof Words["kinds"]; status: keyof Words["checksStatus"]; note?: string | undefined };
export type ApplicationInput = {
  unit: string;
  moveIn: string;
  monthlyRent: number;
  applicants: readonly { name: string; monthlyIncome: number }[];
  checks: readonly Check[];
  decision: Decision;
  note?: string | undefined;
  detail?: string | null;
};

const outcomes = { waitlist: "waitlisted", approve: "approved", decline: "declined" } as const;
const isOpen = (status: unknown) => status === "pending" || status === "waitlisted";

export function applicationGates(input: Record<string, unknown>) {
  const checks = (input.checks as (Check & { goto?: string })[]).map((check) => ({
    ...check,
    linked: Boolean(check.goto),
  }));
  const canDecide = input.detail !== "brief" && isOpen(input.decision);
  return { checks, canDecide, canWaitlist: canDecide && input.decision === "pending" };
}

export const applicationDecision = defineLocalState({
  schema: z.strictObject({
    applicationRef: z.string().max(32),
    decision: applicationDecisions,
    note: z.string().max(applicationNoteMax).optional(),
  }),
  initial: (input) => ({
    applicationRef: input.applicationRef as string,
    decision: input.decision as Decision,
    note: input.note as string | undefined,
  }),
  events: ["waitlist.press", "approve.press", "decline.press", "note.type"],
  reduce: (state, { part, value }) => {
    if (part === "note" && typeof value === "string" && value.length <= applicationNoteMax)
      return { state: { ...state, note: value } };
    if (part === "waitlist" || part === "approve" || part === "decline")
      return { state: { ...state, decision: outcomes[part] } };
    return { error: "Invalid application update" };
  },
  project: ({ decision, note }) => ({ decision, note: note ?? "" }),
});

const tones = { pending: "muted", passed: "good", flagged: "warn", missing: "muted" } as const;

export function applicationCopy(lang?: string, currency?: AppCurrency) {
  const words = propertyWordsFor(lang).applications;
  const money = (value: number) => moneyLine(value, currency, undefined, lang);
  return {
    words,
    summary: (input: ApplicationInput) => {
      const total = input.applicants.reduce((sum, applicant) => sum + applicant.monthlyIncome, 0);
      const ratio = new Intl.NumberFormat(localeOf(lang), {
        maximumFractionDigits: 2,
        notation: total / input.monthlyRent >= 1000 ? "scientific" : "standard",
      }).format(total / input.monthlyRent);
      return {
        applicants: new Intl.ListFormat(localeOf(lang)).format(input.applicants.map(({ name }) => name)),
        moveIn: words.moveIn(appointmentDate(input.moveIn, lang)),
        householdIncome: words.householdIncome(money(total)),
        monthlyRent: words.monthlyRent(money(input.monthlyRent)),
        ratio: words.multiple(ratio),
      };
    },
    check: (check: Check) => ({
      label: words.kinds[check.kind],
      status: words.checksStatus[check.status],
      tone: tones[check.status],
    }),
  };
}

export function applicationReading(
  raw: unknown,
  state: StateName,
  lang?: string,
  _data?: unknown,
  currency?: AppCurrency,
) {
  const input = raw as ApplicationInput;
  const copy = applicationCopy(lang, currency),
    { words } = copy;
  const summary = copy.summary(input);
  return [
    ...(state === "success" ? [words.success] : []),
    summary.applicants,
    summary.moveIn,
    ...(state === "success" && input.decision === "pending" ? [] : [words.decisions[input.decision]]),
    words.ratioReading(summary.ratio),
    summary.householdIncome,
    summary.monthlyRent,
    words.checks,
    ...input.checks.map((check, index) => {
      const { label, status } = copy.check(check);
      const note = input.detail !== "brief" ? check.note : undefined;
      return words.checkReading(`r${index + 1}`, label, status, note);
    }),
    ...(input.detail !== "brief" && input.note ? [input.note] : []),
  ];
}
