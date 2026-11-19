import { z } from "zod";
import {
  clock,
  placeholderDetail,
  probesFor,
  text,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import { seedTitles } from "..";
import { medicationLabels, medicationReading, orderedDoses, refillLine, stockLine } from "../copy";
import {
  KitAction,
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitRow,
  KitText,
  useComponentState,
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
  items: { key: "doses", parts: ["root", "name", "dose", "time", "taken", "skip", "left"] },
  parts: ["root", "refill"],
  states: ["filled", "empty", "success"],
  confirmParts: ["skip"],
  actions: {
    items: { taken: ["check"], skip: ["press"] },
    when: { taken: { status: "due" }, skip: { status: "due" } },
  },
  read: (input) => medicationReading(input as z.output<typeof props>),
} as const satisfies Meta;
export const props = z.strictObject({
  doses: z
    .array(
      z.strictObject({
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
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  return {
    doses: seedTitles(cast, 2, 24).map((name) => ({
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
  { doses: [{ name: "Vitamin B12", dose: "1 tablet", time: "08:00", status: "taken", left: 30 }] },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Medication");
export const probes = [
  choose("Show today's medicine doses by time, mark taken or skipped, and warn when pill stock is low"),
  choose("Tick off today's jobs, stretch and walk, with no dose times, medicine or stock", "Checklist"),
  write(
    "Vitamin D one tablet at 08:00 due, four pills left, and magnesium one capsule at 20:00 taken, twenty left, refill threshold five",
  ),
  read("Mark the morning vitamin D dose taken", { address: "m1/r1/taken", action: "check" }),
  read("Skip the morning vitamin D dose", { address: "m1/r1/skip", action: "press" }),
] satisfies Probe[];

type Dose = Props<typeof props, typeof meta>["doses"][number];
function MedicationStatus({ dose }: { dose: Dose }) {
  return (
    <KitContent lineRole="body">
      <KitText
        role="caption"
        tone={dose.status === "taken" ? "good" : "muted"}
        part={dose.status === "skipped" ? "skip" : null}
      >
        {medicationLabels[dose.status]}
      </KitText>
      {dose.left !== undefined && (
        <KitText role="caption" tabular tone="muted" part="left">
          {stockLine(dose.left)}
        </KitText>
      )}
    </KitContent>
  );
}
function MedicationDose({ dose }: { dose: Dose }) {
  const due = dose.status === "due";
  return (
    <KitRow
      item={dose.id}
      label={dose.name}
      trailing={
        <>
          {due && <KitAction icon="close" a11y={medicationLabels.skip} kind="quiet" part="skip" />}
          {dose.status !== "skipped" && (
            <KitCheck
              done={dose.status === "taken"}
              readonly={!due}
              part="taken"
              label={medicationLabels.taken}
            />
          )}
        </>
      }
    >
      <KitContent lineRole="body">
        <KitText role="body" part="name">
          {dose.name}
        </KitText>
        <KitText role="number" numberScale="compact" tabular part="time">
          {dose.time}
        </KitText>
        <KitText role="caption" tone="muted" part="dose">
          {dose.dose}
        </KitText>
        <MedicationStatus dose={dose} />
      </KitContent>
    </KitRow>
  );
}

export function Medication({ doses, refillAt }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  if (state === "empty")
    return (
      <KitCard part="root">
        <KitEmpty part="name" />
      </KitCard>
    );
  const refill = refillLine(doses, refillAt);
  const complete = state === "success" || doses.every((dose) => dose.status === "taken");
  return (
    <KitCard style="inset" part="root">
      {complete && (
        <KitRow label={medicationLabels.success}>
          <KitText role="body" tone="good">
            {medicationLabels.success}
          </KitText>
        </KitRow>
      )}
      {orderedDoses(doses).map((dose) => (
        <MedicationDose key={dose.id} dose={state === "success" ? { ...dose, status: "taken" } : dose} />
      ))}
      {refill && (
        <KitRow label={refill}>
          <KitText role="caption" tone="warn" part="refill">
            {refill}
          </KitText>
        </KitRow>
      )}
    </KitCard>
  );
}
