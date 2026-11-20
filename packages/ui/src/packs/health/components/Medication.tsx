import {
  wordsFor,
  clock,
  timeOfDayLine,
  probesFor,
  text,
  variantProps,
  itemVariantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { z } from "zod";
import { seedTitles } from "..";
import { healthWordsFor } from "../lang";
import { medicationReading, orderedDoses, refillLine, stockLine } from "../copy";
import {
  KitAction,
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitRow,
  KitText,
  useComponentState,
  useWords,
  useVariant,
} from "../../../kit";

// Core first: Checklist/plain cannot log timed doses, skipped marks and remaining stock with refill thresholds.
export const meta = {
  id: "Medication",
  status: "ready",
  group: "input",
  purpose: "Log today's medicine doses by time, including taken, skipped and remaining pills.",
  pick: "Medicines or supplements on schedule, with doses, taken/skipped marks and refill stock. Not ordinary jobs (Checklist) or nudging one count (Counter).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Doses stored on the device; reminders need notification permission, and this log is not medical advice.",
  writeHints: [
    "Leave axes null unless asked. To hide individual pill counts, set detail brief but keep left and refillAt in the data. Mark only an explicitly highlighted dose.",
  ],
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["left"] } },
  items: {
    key: "doses",
    parts: ["root", "name", "dose", "time", "taken", "skip", "left"],
    variants: { mark: ["none", "highlight"] },
  },
  parts: ["root", "refill"],
  states: ["filled", "empty", "success"],
  confirmParts: ["skip"],
  actions: {
    items: { taken: ["check"], skip: ["press"] },
    when: { taken: { status: "due" }, skip: { status: "due" } },
  },
  read: (input, _state, lang?: string): string[] => medicationReading(input as z.output<typeof props>, lang),
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  doses: z
    .array(
      z.strictObject({
        ...itemVariantProps(meta.items.variants),
        name: text(24),
        dose: text(16),
        time: clock,
        status: z.enum(["due", "taken", "skipped"]).default("due"),
        left: z.int().min(0).max(10000).optional(),
      }),
    )
    .min(1)
    .max(8),
  refillAt: z.int().min(0).max(10000).optional(),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const { placeholderDetail } = wordsFor(lang);

  return {
    doses: seedTitles(cast, 2, 24, lang).map((name) => ({
      name,
      dose: placeholderDetail,
      time: "00:00",
      status: "due",
    })),
  };
}
export const examples = [
  {
    doses: [
      { name: "Vitamin D", dose: "1 tablet", time: "08:00", status: "due", left: 4 },
      { name: "Magnesium", dose: "1 capsule", time: "20:00", status: "taken", left: 20 },
    ],
    refillAt: 5,
  },
  { doses: [{ name: "Iron supplement", dose: "1 tablet", time: "09:30", status: "skipped" }] },
  {
    density: "compact",
    detail: "brief",
    doses: [
      { name: "Vitamin B12", dose: "1 tablet", time: "08:00", status: "taken", left: 30 },
      { name: "Vitamin D", dose: "1 tablet", time: "09:00", status: "due", left: 4, mark: "highlight" },
      { name: "Magnesium", dose: "1 capsule", time: "20:00", status: "due", left: 20 },
    ],
    refillAt: 5,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Medication");
export const probes = [
  choose("Show today's medicine doses by time, mark taken or skipped, and warn when pill stock is low"),
  choose("Tick off today's jobs, stretch and walk, with no dose times, medicine or stock", "Checklist"),
  write(
    "Vitamin D one tablet at 08:00 due, four pills left, and magnesium one capsule at 20:00 taken, twenty left, refill threshold five",
  ),
  {
    ...write(
      "Log vitamin D one tablet at 08:00, due, four pills left, and magnesium one capsule at 20:00, due, twenty left. Refill threshold five. Hide the individual pill counts on screen, but keep the refill warning and the stock numbers in the data.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark the morning vitamin D dose taken", { address: "m1/r1/taken", action: "check" }),
  read("Skip the morning vitamin D dose", { address: "m1/r1/skip", action: "press" }),
] satisfies Probe[];

type Dose = Props<typeof props, typeof meta>["doses"][number];
type DoseFinish = Pick<Props<typeof props, typeof meta>, "density" | "detail">;
// prettier-ignore
function MedicationStatus({ dose, detail }: { dose: Dose; detail: DoseFinish["detail"] }) {
  const { lang, words } = useWords(healthWordsFor);
  return (
    <KitContent lineRole="body">
      <KitText role="caption" tone={dose.status === "taken" ? "good" : "muted"}
        part={dose.status === "skipped" ? "skip" : null}>{words.medicationLabels[dose.status]}</KitText>
      {detail === "full" && dose.left !== undefined &&
        <KitText role="caption" tabular tone="muted" part="left">{stockLine(dose.left, lang)}</KitText>}
    </KitContent>
  );
}
// prettier-ignore
function MedicationDose({ dose, density, detail }: { dose: Dose } & DoseFinish) {
  const { lang, words } = useWords(healthWordsFor);
  const due = dose.status === "due";
  return (
    <KitRow
      item={dose.id} mark={dose.mark} {...{ density }} label={dose.name}
      trailing={
        <>
          {due && <KitAction icon="close" a11y={words.medicationLabels.skip} kind="quiet" part="skip" />}
          {dose.status !== "skipped" && <KitCheck done={dose.status === "taken"} readonly={!due}
            part="taken" label={words.medicationLabels.taken} />}
        </>
      }
    >
      <KitContent lineRole="body">
        <KitText role="body" part="name">{dose.name}</KitText>
        <KitText role="number" numberScale="compact" tabular part="time">{timeOfDayLine(dose.time, lang)}</KitText>
        <KitText role="caption" tone="muted" part="dose">{dose.dose}</KitText>
        <MedicationStatus {...{ dose, detail }} />
      </KitContent>
    </KitRow>
  );
}

// prettier-ignore
export function Medication(input: Props<typeof props, typeof meta>) {
  const { doses, refillAt, detail } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const { lang, words } = useWords(healthWordsFor);
  const state = useComponentState();
  if (state === "empty")
    return <KitCard part="root" density={density}><KitEmpty part="name" /></KitCard>;
  const refill = refillLine(doses, refillAt, lang);
  const complete = state === "success" || doses.every((dose) => dose.status === "taken");
  return (
    <KitCard style="inset" part="root" density={density}>
      {complete && (
        <KitRow label={words.medicationLabels.success} density={density}>
          <KitText role="body" tone="good" part={null}>
            {words.medicationLabels.success}
          </KitText>
        </KitRow>
      )}
      {orderedDoses(doses).map((dose) => (
        <MedicationDose key={dose.id} {...{ density, detail }} dose={state === "success" ? { ...dose, status: "taken" } : dose} />
      ))}
      {refill && (
        <KitRow label={refill} density={density}>
          <KitText role="caption" tone="warn" part="refill">
            {refill}
          </KitText>
        </KitRow>
      )}
    </KitCard>
  );
}
