import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { patternReport, readFindings, seededJournal } from "../copy";
import { mindWordsFor } from "../lang";

// Core first: Bars/columns can plot supplied values but cannot derive with-and-without comparisons from journal entries.
export const meta = {
  id: "Patterns",
  status: "draft",
  group: "data",
  purpose: "Find which logged daily factors tend to go with better or worse moods.",
  pick: "Derive findings from a mood journal by comparing days with and without a tagged factor after at least two weeks. Choose this for journal-derived comparisons even when findings also use paired bars. Not plotting values the person already supplied (Bars) or a single time trend (Sparkline).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "The phone computes the comparison averages and findings from stored entries.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    detail: ["full", "brief"],
  },
  variantParts: { "detail.brief": { hides: ["with", "without"] } },
  parts: ["root", "title", "days_left", "empty"],
  items: { key: "findings", parts: ["root", "finding", "with", "without"] },
  states: ["filled", "empty"],
  writeHints: [
    "Use factor labels from the same screen's Factors when available. Only choose labels and minDays; never invent findings or write mood averages or bar values.",
    'Leave density, surface and detail null unless requested. When asked for finding sentences without comparison charts, set detail to "brief".',
  ],
  deviceData: ["journal_entries"],
  previewDeviceData: ({ input, state }): c.DeviceData => ({
    journal_entries: seededJournal(props.parse(input), state),
  }),
  read: (input, state, lang, data): string[] =>
    readFindings(input as z.output<typeof props>, state, lang, data?.journal_entries ?? []),
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  factors: z.array(c.text(14)).min(1).max(4),
  minDays: z.int().min(14).max(60).default(14),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const factors = c
    .itemsOf(cast, 4)
    .map((item, index) => c.titleOf(item, 14, thing) ?? c.placeholderTitle(index, lang));
  return { factors: factors.length ? factors : [c.placeholderTitle(0, lang)] };
}

export const examples = [
  { factors: ["Outdoors", "Slept well"], minDays: 14 },
  {
    factors: ["Music", "Long shift", "Early start", "Fresh air"],
    minDays: 28,
  },
] satisfies z.input<typeof props>[];

const { choose, write } = c.probesFor("Patterns");
export const probes = [
  choose(
    "Use my mood journal to find how I tend to feel on days with and without time outdoors, with paired bars after enough days have been logged.",
  ),
  choose(
    "Draw one tiny unlabelled line of my mood values across the past seven days, without comparing any factors.",
    "Sparkline",
  ),
  choose(
    "Plot exactly two supplied mood scores, 4 for A and 2 for B, as vertical columns. No journal analysis or time trend.",
    "Bars",
  ),
  write(
    "Compare mood on days with and without Outdoors and Slept well. Wait until at least 21 days are logged. The app computes the results.",
  ),
  {
    ...write(
      "From the mood journal, compare days with and without Outdoors after 14 logged days. Show just the finding sentence, without the paired bars or scores.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
] satisfies c.Probe[];

function PatternSummary({
  findings,
  density,
}: {
  findings: readonly { id: string; sentence: string }[];
  density: c.ThemeDensity;
}) {
  const scope = kit.usePartContext();
  return findings.map(({ id, sentence }) => (
    <kit.PartContext.Provider key={id} value={{ ...scope, item: id }}>
      <kit.KitText part="root" density={density}>
        <kit.KitText part="finding" density={density}>
          {sentence}
        </kit.KitText>
      </kit.KitText>
    </kit.PartContext.Provider>
  ));
}

export function Patterns(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const data = kit.useDeviceData().journal_entries ?? [];
  const { lang, words } = kit.useWords(mindWordsFor);
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const report = patternReport(input, state, lang, data);
  const { title, withFactor, withoutFactor } = words.patterns;
  const heading = (
    <kit.KitText part="title" role="heading">
      {title}
    </kit.KitText>
  );
  return (
    <kit.KitCard part="root" surface={surface} density={density} padded={"findings" in report} inset="none">
      {"message" in report ? (
        <kit.KitEmpty decorativeIcon part={report.part} title={report.message} />
      ) : detail === "brief" ? (
        <kit.KitContent inset="md" density={density}>
          {heading}
          <PatternSummary findings={report.findings} density={density} />
        </kit.KitContent>
      ) : (
        <>
          <kit.KitContent inset="md" density={density}>
            {heading}
          </kit.KitContent>
          {report.findings.map(({ id, sentence, withAverage, withoutAverage }) => (
            <kit.KitRow key={id} item={id} label={sentence} density={density}>
              <kit.KitContent density={density}>
                <kit.KitText part="finding" role="body">
                  {sentence}
                </kit.KitText>
                <kit.KitBars
                  {...(withAverage === withoutAverage ? { highlight: -1 } : {})}
                  pair={[
                    { part: "with", label: withFactor, value: withAverage },
                    { part: "without", label: withoutFactor, value: withoutAverage },
                  ]}
                />
              </kit.KitContent>
            </kit.KitRow>
          ))}
        </>
      )}
    </kit.KitCard>
  );
}
