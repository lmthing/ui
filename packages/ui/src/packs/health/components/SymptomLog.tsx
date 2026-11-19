import { z } from "zod";
import { probesFor, text, type CastLike, type Meta, type Probe } from "../../../catalog";
import { indexedActions, indexedParts, indexedValues, indexedWhen, seedTitles } from "..";

// Core first: Scale/mood cannot select several grouped symptoms and set a severity for each.
export const meta = {
  id: "SymptomLog",
  status: "draft",
  group: "input",
  purpose: "Note several body symptoms and each symptom's severity.",
  pick: "Grouped body symptoms with a selected chip and severity zero to five for each. Not one level for the day (Scale), collection filters (Chips), or naming feelings (Feelings).",
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Symptom entries stored on the device; logging symptoms is not a diagnosis or medical advice.",
  items: { key: "groups", parts: ["root", "label", ...indexedParts(8, ["symptom", "severity"])] },
  parts: ["root"],
  states: ["filled"],
  actions: {
    items: indexedActions(8, { symptom: ["toggle"], severity: ["set"] }),
    when: indexedWhen(8, ["symptom", "severity"]),
  },
  read: (input, state) =>
    state !== "filled"
      ? []
      : (input as z.output<typeof props>).groups.flatMap((group) =>
          group.symptoms.map(
            (symptom, index) => `${group.label} / ${index + 1}: ${symptom.label} ${symptom.severity}/5`,
          ),
        ),
} as const satisfies Meta;
export const props = z.strictObject({
  groups: z
    .array(
      z
        .strictObject({
          label: text(16),
          symptoms: z
            .array(
              z.strictObject({
                label: text(16),
                severity: z.int().min(0).max(5).default(0),
              }),
            )
            .min(2)
            .max(8),
        })
        .overwrite((group) => ({
          ...group,
          ...indexedValues(
            group.symptoms.map((symptom) => ({
              symptom: { on: symptom.severity > 0 },
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
          { label: "Headache", severity: 2 },
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
  read("Select dizziness", { address: "s1/r1/symptom_2", action: "toggle" }),
] satisfies Probe[];
