import {
  wordsFor,
  clock,
  formatAddress,
  timeOfDayLine,
  probesFor,
  text,
  itemVariantProps,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
  type ThemeDensity,
  variantProps,
} from "../../../catalog";
import { useCallback, useContext, useEffect, useRef, type ContextType, type ReactNode } from "react";
import { z } from "zod";
import { seedTitles } from "..";
import { healthWordsFor } from "../lang";
import {
  medicationFeedback,
  medicationLog,
  medicationReading,
  medicationStatus,
  orderedDoses,
  projectMedication,
  refillLine,
  stockLine,
} from "../copy";
import {
  KitAction,
  KitCard,
  KitChip,
  KitContent,
  KitEmpty,
  KitRow,
  KitText,
  PartRefScope,
  useComponentState,
  useLiveControls,
  usePartContext,
  useVariant,
  useWords,
  useKit,
} from "../../../kit";
import { prompt } from "../../../entry/prompt-Medication.generated";

// Core first: Checklist/plain cannot log timed doses, skipped marks and remaining stock with refill thresholds.
export const meta = {
  id: "Medication",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath:
    "Doses stored on the device; reminders need notification permission, and this log is not medical advice.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["left"] } },
  items: {
    key: "doses",
    parts: ["root", "name", "dose", "time", "status", "taken", "skip", "left"],
    variants: { mark: ["none", "highlight"] },
  },
  parts: ["root", "refill", "status"],
  states: ["filled", "empty", "success", "error"],
  confirmParts: ["skip"],
  actions: {
    items: { taken: ["check"], skip: ["press"] },
    when: { taken: { status: "due" }, skip: { status: "due" } },
  },
  localState: medicationLog,
  live: { derive: projectMedication },
  readInState: (_input, state) => state === "empty",
  readSuccess: true,
  readError: true,
  read: (input, state, lang?: string): string[] =>
    medicationReading(input as z.output<typeof props>, lang, state),
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
        status: medicationStatus.default("due"),
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
    doses: [
      { name: "Vitamin B12", dose: "1 tablet", time: "08:00", status: "taken", left: 30 },
      { name: "Vitamin D", dose: "1 tablet", time: "09:00", status: "due", left: 4 },
      { name: "Magnesium", dose: "1 capsule", time: "20:00", status: "due", left: 20 },
    ],
    refillAt: 5,
  },
  {
    detail: "brief",
    doses: [{ name: "Vitamin B12", dose: "1 tablet", time: "08:00", status: "taken" }],
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
type DoseFinish = Pick<Props<typeof props, typeof meta>, "detail"> & { density: ThemeDensity };

function MedicationReceiptScope({
  dose,
  acknowledged,
  children,
}: {
  dose: Dose;
  acknowledged: boolean;
  children: ReactNode;
}) {
  const { screen, component } = usePartContext();
  const { environment, nativeHost } = useKit();
  const parent = useContext(PartRefScope);
  const address = formatAddress({ screen, component, item: dose.id, part: "status" });
  const target = useRef<{ current: unknown } | null>(null);
  const seen = useRef(dose.status);
  const register = useCallback<NonNullable<ContextType<typeof PartRefScope>>>(
    (id, ref) => {
      if (id === address) target.current = ref;
      const unregister = parent?.(id, ref);
      return () => {
        if (target.current === ref) target.current = null;
        unregister?.();
      };
    },
    [address, parent],
  );
  useEffect(() => {
    const wasDue = seen.current === "due";
    seen.current = dose.status;
    if (!wasDue || dose.status === "due" || !acknowledged || environment.agentMode) return;
    const node = target.current?.current;
    if (typeof HTMLElement === "undefined" || !(node instanceof HTMLElement)) {
      if (node) nativeHost?.focusAccessibility?.(node);
    } else if (node.ownerDocument.activeElement === node.ownerDocument.body) {
      node.tabIndex = -1;
      node.focus({ preventScroll: true });
    }
  }, [acknowledged, dose.status, environment.agentMode, nativeHost]);
  return <PartRefScope.Provider value={register}>{children}</PartRefScope.Provider>;
}

function MedicationStatus({
  dose,
  detail,
  canLog,
}: {
  dose: Dose;
  detail: DoseFinish["detail"];
  canLog: boolean;
}) {
  const { lang, words } = useWords(healthWordsFor);
  const status = !canLog && dose.status === "due" ? "notLogged" : dose.status;
  return (
    <KitContent lineRole="body" rhythm="flush">
      <KitText
        role="caption"
        tone={status === "taken" ? "good" : status === "notLogged" ? "warn" : "text"}
        part="status"
      >
        {words.medicationLabels[status]}
      </KitText>
      <KitText role="caption" tone="muted" tabular part="time">
        {timeOfDayLine(dose.time, lang)}
      </KitText>
      <KitText role="caption" tone="muted" part="dose">
        {dose.dose}
      </KitText>
      {detail === "full" && dose.left !== undefined && (
        <KitText role="caption" tabular tone="muted" part="left">
          {stockLine(dose.left, lang)}
        </KitText>
      )}
    </KitContent>
  );
}
function MedicationDose({
  dose,
  density,
  detail,
  canLog,
  acknowledged,
}: {
  dose: Dose;
  canLog: boolean;
  acknowledged: boolean;
} & DoseFinish) {
  const { lang, words } = useWords(healthWordsFor);
  const time = timeOfDayLine(dose.time, lang);
  const actionLabel = (label: string) => words.medicationAction(label, dose.name, time);
  return (
    <MedicationReceiptScope {...{ dose, acknowledged }}>
      <KitRow
        item={dose.id}
        mark={dose.mark}
        {...{ density }}
        label={dose.name}
        trailing={
          canLog && dose.status === "due" ? (
            <>
              <KitChip
                item={dose.id}
                label={words.medicationLabels.markTaken}
                part="taken"
                labelPart={null}
                role="checkbox"
                on={false}
                roving={false}
              />
              <KitAction
                label={words.medicationLabels.skip}
                a11y={actionLabel(words.medicationLabels.skip)}
                tone="neutral"
                kind="quiet"
                part="skip"
              />
            </>
          ) : undefined
        }
      >
        <KitContent lineRole="body">
          <KitText role="body" part="name" emphasis="strong" breakLongWords>
            {dose.name}
          </KitText>
          <MedicationStatus {...{ dose, detail, canLog }} />
        </KitContent>
      </KitRow>
    </MedicationReceiptScope>
  );
}

export function Medication(input: Props<typeof props, typeof meta>) {
  const { doses } = useLiveControls(meta, input) as typeof input;
  const { refillAt } = input;
  const detail = useVariant("detail", meta.variants.detail, input.detail);
  const density = useKit().density;
  const { lang, words } = useWords(healthWordsFor);
  const state = useComponentState();
  if (state === "empty")
    return (
      <KitCard part="root" density={density}>
        <KitEmpty part="status" title={words.medicationLabels.empty} />
      </KitCard>
    );
  const refill = refillLine(doses, refillAt, lang);
  const { complete, unavailable } = medicationFeedback(doses, state);
  const due = new Set(input.doses.filter(({ status }) => status === "due").map(({ id }) => id));
  return (
    <KitCard style="inset" part="root" density={density}>
      {unavailable && (
        <KitRow label={words.medicationLabels.unavailable} density={density}>
          <KitText role="caption" tone="warn" part="status">
            {words.medicationLabels.unavailable}
          </KitText>
        </KitRow>
      )}
      {orderedDoses(doses).map((dose) => (
        <MedicationDose
          key={dose.id}
          {...{ density, detail, dose }}
          canLog={state === "filled"}
          acknowledged={due.has(dose.id)}
        />
      ))}
      {complete && !unavailable && (
        <KitRow label={words.medicationLabels.success} density={density}>
          <KitText role="caption" tone="good" part="status">
            {words.medicationLabels.success}
          </KitText>
        </KitRow>
      )}
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
