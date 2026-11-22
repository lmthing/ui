import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { fitLine, measurementLine, sizeGuideReading } from "../copy";
import { commerceWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SizeGuide.generated";

const units = ["cm", "in"] as const;

// Core first: KeyValue/rows lists facts for one record, not a selectable size matrix with convertible units.
export const meta = {
  id: "SizeGuide",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Measurement specifications are stored with the product record on the device.",
  variants: {
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["model_note"] } },
  parts: ["root", "unit", "table", "fit", "model_note", "empty"],
  items: { key: "rows", parts: ["root", "size"] },
  states: ["filled", "empty", "loading"],
  actions: { parts: { unit: ["select"] }, items: { root: ["select"] } },
  selections: { unit: { prop: "displayUnit", choices: units, runtime: true } },
  select: { prop: "at", value: "index" },
  read: (input, state, lang): string[] =>
    state === "filled" ? sizeGuideReading(input as GuideProps, lang) : [],
} as const satisfies c.Meta;

const row = z.strictObject({
  size: c.text(10),
  values: z.array(z.number().min(0).max(9999)).min(2).max(6),
});

export const props = z
  .strictObject({
    unit: z.enum(units).default("cm"),
    columns: z.array(c.text(12)).min(2).max(6),
    rows: z.array(row).min(2).max(10),
    at: z.int().min(0).max(9).optional(),
    fitScore: z.number().min(1).max(5).optional(),
    modelNote: c.text(60).optional(),
    style: z.enum(["table", "fit"]).default("table"),
    ...c.variantProps(meta.variants),
  })
  .refine(({ columns, rows }) => rows.every(({ values }) => values.length === columns.length), {
    path: ["rows"],
  })
  .refine(({ at, rows }) => at === undefined || at < rows.length, { path: ["at"] })
  .overwrite((value) => (value.detail === "brief" ? { ...value, modelNote: undefined } : value));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const titles = c.itemsOf(cast, 3).map((item) => c.titleOf(item, 10, thing));
  return {
    columns: [0, 1].map((i) => c.clip(c.placeholderTitle(i, lang), 12)),
    rows: Array.from({ length: Math.max(2, titles.length) }, (_, i) => ({
      size: titles[i] || c.clip(c.placeholderTitle(i, lang), 10),
      values: [0, 0],
    })),
  };
}

export const examples = [
  {
    columns: ["Rim", "Height"],
    rows: [
      { size: "Small", values: [12.7, 10.2] },
      { size: "Medium", values: [17.8, 15.2] },
      { size: "Large", values: [22.9, 20.3] },
    ],
    at: 1,
    fitScore: 3,
    modelNote: "The fern in the display uses a medium pot.",
  },
  {
    unit: "in",
    style: "fit",
    columns: ["Chest", "Neck"],
    rows: [
      { size: "Small", values: [18, 12] },
      { size: "Medium", values: [22, 15] },
      { size: "Large", values: [26, 18] },
    ],
    fitScore: 2,
    modelNote: "Clover has a 22 in chest and wears a medium.",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SizeGuide");
export const probes = [
  choose(
    "Compare chest and waist measurements across jacket sizes, switch between inches and centimetres, and see whether the jacket runs small",
  ),
  choose(
    "Show the room, light needs and watering interval of my one fern as simple label and value facts",
    "KeyValue",
  ),
  write(
    "Make a dog harness sizing chart in inches, with Chest and Neck columns: Small 18 and 12, Medium 22 and 15. It runs true to size.",
  ),
  {
    ...write(
      "Compare chest and neck in inches: Small 18 and 12, Medium 22 and 15. It runs small. Keep the note 'Clover is wearing a medium' in the data but hide the model note on screen.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Switch the measurement chart to inches without changing the reference size", {
    address: "s1/unit",
    action: "select",
  }),
  read("Highlight Large as the reference size without changing the units", {
    address: "s1/r3",
    action: "select",
  }),
] satisfies c.Probe[];

type GuideProps = c.Props<typeof props, typeof meta> & { displayUnit?: (typeof units)[number] };

type MeasurementProps = { input: GuideProps; loading: boolean; density: c.ThemeDensity };

function Measurements({ input, loading, density }: MeasurementProps) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const copy = words.sizeGuide;
  const unit = input.displayUnit ?? input.unit;
  const cell = (
    label: string,
    role: "label" | "number",
    align: "start" | "end",
    part: "size" | null = null,
  ) => (
    <kit.KitContent inset="md">
      {loading ? (
        <kit.KitSkeleton
          shape="figure"
          inset="none"
          density={density}
          content={[[role, label, align, "compact"]]}
        />
      ) : (
        <kit.KitText
          {...{ part, role, align, density }}
          lines={1}
          tone={role === "label" && !part ? "muted" : "text"}
          numberScale="compact"
          tabular={role === "number"}
        >
          {label}
        </kit.KitText>
      )}
    </kit.KitContent>
  );
  const columns = input.columns.map((label, i) => ({
    id: String(i),
    label,
    header: cell(label, "label", "end"),
  }));
  const rows = input.rows.map(({ id, size, values }, i) => ({
    id,
    label: size,
    ...(!loading && { target: { item: id, part: "root" }, selected: input.at === i }),
    heading: cell(size, "label", "start", "size"),
    cells: values.map((value, j) => ({
      id: String(j),
      content: cell(measurementLine(value, input.unit, unit, lang), "number", "end"),
    })),
  }));
  const fitted =
    columns.length <= 2 || (columns.length === 3 && columns.every(({ label }) => label.length <= 8));
  return (
    <kit.KitTable
      part="table"
      corner={cell(copy.size, "label", "start")}
      fitColumns={fitted}
      {...{ columns, rows }}
    />
  );
}

function FitDetails({
  input,
  loading,
  density,
}: {
  input: GuideProps;
  loading: boolean;
  density: c.ThemeDensity;
}) {
  const { lang, words } = kit.useWords(commerceWordsFor);
  const { fitScore, modelNote, detail } = input;
  const showNote = detail !== "brief" && modelNote;
  if (fitScore === undefined && !showNote) return null;
  return (
    <kit.KitContent density={density} group={input.style === "table" ? "response" : "content"}>
      {fitScore !== undefined && (
        <kit.KitRangeBand
          part="fit"
          label={words.sizeGuide.fit}
          min={1}
          max={5}
          low={2.5}
          high={3.5}
          value={fitScore}
          loading={loading}
          reading={
            <kit.KitText role="label" part={null} density={density}>
              {fitLine(fitScore, lang)}
            </kit.KitText>
          }
        />
      )}
      {showNote &&
        (loading ? (
          <kit.KitSkeleton shape="figure" inset="none" density={density} content={[["caption", modelNote]]} />
        ) : (
          <kit.KitText part="model_note" role="caption" tone="muted" density={density}>
            {modelNote}
          </kit.KitText>
        ))}
    </kit.KitContent>
  );
}

export function SizeGuide(input: GuideProps) {
  const { words } = kit.useWords(commerceWordsFor);
  const state = kit.useComponentState();
  const loading = state === "loading";
  const density = kit.useKit().density;
  const surface = "card";
  const live = kit.useLiveControls(meta, input) as GuideProps;
  const unit = live.displayUnit ?? live.unit;
  const copy = words.sizeGuide;
  const fit = <FitDetails input={live} {...{ loading, density }} />;
  const startsWithFit = input.style === "fit" && (live.fitScore !== undefined || Boolean(live.modelNote));
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty part="empty" decorativeIcon />
      ) : (
        <>
          {input.style === "fit" && fit}
          <kit.KitContent density={density} group={startsWithFit ? "response" : "content"}>
            <kit.KitTrack part="unit" look="segments" role="radiogroup" label={copy.unit}>
              {units.map((value) => (
                <kit.KitChip
                  key={value}
                  item={null}
                  role="radio"
                  look="segment"
                  label={copy.units[value]}
                  value={value}
                  on={unit === value}
                  {...(loading ? { disabled: false, part: null } : {})}
                />
              ))}
            </kit.KitTrack>
          </kit.KitContent>
          <Measurements input={live} {...{ loading, density }} />
          {input.style === "table" && fit}
        </>
      )}
    </kit.KitCard>
  );
}
