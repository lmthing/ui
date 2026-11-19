import { z } from "zod";
import { probesFor, text, type CastLike, type Meta, type Probe, type Props } from "../../../catalog";
import {
  KitCard,
  KitChip,
  KitContent,
  KitGrid,
  KitRow,
  KitSlider,
  KitText,
  KitTrack,
  useControlValue,
  usePart,
} from "../../../kit";
import { indexedActions, indexedParts, indexedValues, indexedWhen, seedTitles } from "..";
import { symptomChosen, symptomSeverity, symptomLevelLine, symptomReading, symptomTargets } from "../copy";

// Core first: Scale/mood cannot select several grouped symptoms and set a severity for each.
export const meta = {
  id: "SymptomLog",
  status: "ready",
  group: "input",
  purpose: "Note several body symptoms and each symptom's severity.",
  pick: "Grouped body symptoms with a selected chip and severity zero to five for each. Not one level for the day (Scale), collection filters (Chips), or naming feelings (Feelings).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Symptom entries stored on the device; logging symptoms is not a diagnosis or medical advice.",
  items: {
    key: "groups",
    parts: ["root", "label", "chips", ...indexedParts(8, ["symptom", "severity", "reading"])],
    nested: {
      key: "symptoms",
      parts: {
        symptom: { action: "toggle", prop: "on" },
        severity: { action: "set", prop: "severity", min: 1, max: 5, integer: true, when: "symptom" },
      },
    },
  },
  parts: ["root"],
  states: ["filled"],
  actions: {
    items: indexedActions(8, { symptom: ["toggle"], severity: ["set"] }),
    when: indexedWhen(8, ["symptom", "severity"]),
  },
  read: (input, state) => {
    if (state !== "filled") return [];
    const { groups } = input as z.output<typeof props>;
    return [...symptomReading(groups), ...symptomTargets(groups)];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  groups: z
    .array(
      z
        .strictObject({
          label: text(16),
          symptoms: z
            .array(
              z
                .strictObject({
                  label: text(16),
                  severity: z.int().min(0).max(5).default(0),
                  on: z.boolean().optional(),
                })
                .overwrite((symptom) => ({ ...symptom, on: symptomChosen(symptom) })),
            )
            .min(2)
            .max(8),
        })
        .overwrite((group) => ({
          ...group,
          ...indexedValues(
            group.symptoms.map((symptom) => ({
              symptom: { on: symptomChosen(symptom) },
              severity: symptom.severity,
            })),
            8,
            ["symptom", "severity"],
          ),
        })),
    )
    .min(1)
    .max(4),
});
export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const titles = seedTitles(cast, 2, 16);
  return {
    groups: [
      {
        label: titles[0]!,
        symptoms: [0, 1].map((index) => ({ label: titles[index % titles.length]!, severity: 0 })),
      },
    ],
  };
}
export const examples = [
  {
    groups: [
      {
        label: "Head",
        symptoms: [
          { label: "Headache", severity: 2, on: true },
          { label: "Dizziness", severity: 0 },
        ],
      },
      {
        label: "Stomach",
        symptoms: [
          { label: "Nausea", severity: 1 },
          { label: "Cramping", severity: 0 },
        ],
      },
    ],
  },
  {
    groups: [
      {
        label: "Energy",
        symptoms: [
          { label: "Fatigue", severity: 4 },
          { label: "Weakness", severity: 1 },
        ],
      },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("SymptomLog");
export const probes = [
  choose(
    "Log headache, nausea and fatigue grouped by body area, select each and set a separate severity one to five",
  ),
  choose("Rate how my day felt on one five-level mood scale, with no list of symptoms", "Scale"),
  write(
    "Head symptoms: headache severity two and dizziness zero; stomach symptoms: nausea one and cramping zero",
  ),
  read("Change the severity of headache", { address: "s1/r1/severity_1", action: "set" }),
  read("Select dizziness in the Head group; leave the already-selected headache unchanged.", {
    address: "s1/r1/symptom_2",
    action: "toggle",
  }),
] satisfies Probe[];

type Group = Props<typeof props, typeof meta>["groups"][number];
function SymptomChip({ group, index }: { group: Group; index: number }) {
  const symptom = group.symptoms[index]!;
  const part = `symptom_${index + 1}`;
  const address = usePart(part).testID;
  const on = useControlValue(address, symptomChosen(symptom));
  return (
    <KitChip item={group.id} part={part} labelPart={null} label={symptom.label} on={on} role="checkbox" />
  );
}
function SymptomSeverity({ symptom, index }: { symptom: Group["symptoms"][number]; index: number }) {
  const part = `severity_${index + 1}`;
  const address = usePart(part).testID;
  const on = useControlValue(address.replace(/severity_(\d+)$/, "symptom_$1"), symptomChosen(symptom));
  const severity = useControlValue(address, symptom.severity);
  if (!on) return null;
  const current = { ...symptom, on, severity };
  return (
    <KitContent group="response">
      <KitGrid columns={2} fitLast>
        <KitText role="label" tone="muted" part={null}>
          {symptom.label}
        </KitText>
        <KitText role="number" numberScale="compact" tabular part={`reading_${index + 1}`}>
          {symptomLevelLine(current)}
        </KitText>
      </KitGrid>
      <KitSlider part={part} label={symptom.label} value={symptomSeverity(current)} min={1} max={5} />
    </KitContent>
  );
}
export function SymptomLog({ groups }: Props<typeof props, typeof meta>) {
  return (
    <KitCard style="inset" part="root">
      {groups.map((group) => (
        <KitRow item={group.id} key={group.id} label={group.label} lineRole="heading">
          <KitText role="heading" part="label">
            {group.label}
          </KitText>
          <KitTrack part="chips" label={group.label}>
            {group.symptoms.map((_, index) => (
              <SymptomChip key={index} group={group} index={index} />
            ))}
          </KitTrack>
          {group.symptoms.map((symptom, index) => (
            <SymptomSeverity key={index} symptom={symptom} index={index} />
          ))}
        </KitRow>
      ))}
    </KitCard>
  );
}
