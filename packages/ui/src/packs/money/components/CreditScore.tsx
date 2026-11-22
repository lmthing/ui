import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { creditScoreCopy, creditScoreReading, creditScoreScale, creditScoreZones } from "../copy";
import { moneyWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-CreditScore.generated";

// Core first: Progress/ring shows progress to one goal, not a bureau score with rating bands and contributing factors.
const score = z.number().int().min(creditScoreScale.min).max(creditScoreScale.max);

export const meta = {
  id: "CreditScore",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "service",
  realPath: "A credit-monitoring service fetches the bureau score and rated factors for the person.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["gauge"] } },
  parts: [
    "root",
    "label",
    "score",
    "gauge",
    "tier",
    "delta",
    "report",
    "factors",
    "status",
    "refresh",
    "refresh_label",
  ],
  items: { key: "factors", parts: ["root", "label", "value", "rating", "impact"] },
  states: ["filled", "empty", "loading", "error"],
  actions: { items: { root: ["press"] }, parts: { refresh: ["press"] }, when: { root: { linked: true } } },
  live: {
    derive: (input) => ({
      factors: (input.factors as readonly z.output<typeof factor>[]).map((row) => ({
        ...row,
        linked: !!row.goto,
      })),
    }),
  },
  emptyActions: ["refresh.press"],
  hostCommands: { parts: { "refresh.press": { kind: "command", name: "refresh_credit_score" } } },
  read: (input, state, lang): string[] =>
    creditScoreReading(input as Parameters<typeof creditScoreReading>[0], state, lang),
} as const satisfies c.Meta;

const factor = z.strictObject({
  label: c.text(24),
  value: c.text(16),
  rating: z.enum(["excellent", "good", "fair", "poor"]),
  impact: z.enum(["high", "medium", "low"]),
  goto: c.screenId.optional(),
});

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  score,
  previousScore: score.optional(),
  bureau: c.text(24),
  updatedAt: c.isoDate,
  factors: z.array(factor).min(4).max(6),
});

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const [bureau, ...items] = c.itemsOf(cast, 5);
  const thing = c.thingOf(cast);
  return {
    score: creditScoreScale.min,
    bureau: (bureau && c.titleOf(bureau, 24, thing)) || c.placeholderTitle(0, lang),
    updatedAt: new Date(0).toISOString().slice(0, 10),
    factors: Array.from({ length: 4 }, (_, index) => {
      const item = items[index];
      return {
        label: (item && c.titleOf(item, 24, thing)) || c.placeholderTitle(index + 1, lang),
        value: c.wordsFor(lang).placeholderValue,
        rating: "fair",
        impact: "low",
      };
    }),
  };
}

const ledgeFactors = [
  { label: "Payment history", value: "All on time", rating: "excellent", impact: "high", goto: "payments" },
  { label: "Credit utilization", value: "18%", rating: "good", impact: "high" },
  { label: "Credit age", value: "5 years", rating: "good", impact: "medium" },
  { label: "Recent inquiries", value: "1 inquiry", rating: "good", impact: "low" },
  { label: "Credit mix", value: "2 account types", rating: "fair", impact: "low" },
] satisfies z.input<typeof factor>[];

export const examples = [
  {
    score: 752,
    previousScore: 734,
    bureau: "Ledge credit report",
    updatedAt: "2026-11-19",
    factors: ledgeFactors,
  },
  {
    score: 694,
    bureau: "Trot credit report",
    updatedAt: "2026-11-17",
    detail: "brief",
    factors: [
      { label: "Payment history", value: "1 late payment", rating: "fair", impact: "high" },
      { label: "Credit utilization", value: "42%", rating: "fair", impact: "high" },
      { label: "Credit age", value: "3 years", rating: "fair", impact: "medium" },
      { label: "Recent inquiries", value: "No inquiries", rating: "excellent", impact: "low" },
    ],
  },
] as const satisfies readonly z.input<typeof props>[];

const { choose, write, read } = c.probesFor("CreditScore");
export const probes = [
  choose(
    "Show my latest bureau score on the 300 to 850 scale and explain how my borrowing and payment history affect it.",
  ),
  choose(
    "Show how far I am toward one savings goal with a circular indicator and the amount in the middle.",
    "Progress",
  ),
  write(
    'My bureau is "Ledge Credit", report dated 2026-11-19, score 752 up from 734. Payment history: all on time, excellent, high impact. Utilization: 18%, good, high impact. Credit age: 5 years, good, medium impact. Inquiries: one inquiry, good, low impact. Credit mix: two account types, fair, low impact.',
  ),
  {
    ...write(
      'For "Trot Credit" on 2026-11-17, show score 694. Payment history: one late payment, fair, high impact. Credit utilization: 42%, fair, high impact. Credit age: 3 years, fair, medium impact. Recent inquiries: none, excellent, low impact. Keep the score and factors but hide the band gauge.',
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Open the payment history breakdown.", { address: "c1/r1", action: "press" }),
] satisfies c.Probe[];

type View = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity };

function ScoreSummary({ input, density, full }: { input: View; full: boolean } & Finish) {
  const {
    lang,
    words: { creditScore: words },
  } = kit.useWords(moneyWordsFor);
  const loading = kit.useComponentState() === "loading";
  const copy = creditScoreCopy(input, lang);
  const figure = (
    <kit.KitFigure
      density={density}
      value={{ text: copy.score, part: "score" }}
      unit={{ text: copy.rating, part: "tier", role: "body", strong: true }}
    />
  );
  return (
    <kit.KitContent density={density}>
      <kit.KitHeader
        density={density}
        title={{ text: words.label, part: "label", role: "body", strong: true }}
      />
      {figure}
      {copy.delta && (
        <kit.KitLayoutText
          density={density}
          line={{ text: copy.delta, part: "delta", role: "meta", tabular: true }}
        />
      )}
      <kit.KitLayoutText
        density={density}
        line={{ text: copy.report, part: "report", role: "meta", tone: "muted" }}
      />
      {full && (
        <kit.KitRangeBand
          part="gauge"
          loading={loading}
          label={words.scale}
          value={input.score}
          {...creditScoreScale}
          zones={creditScoreZones(lang)}
          reading={null}
        />
      )}
    </kit.KitContent>
  );
}

function ScoreFactors({ factors, density }: Pick<View, "factors"> & Finish) {
  const {
    words: { creditScore: words },
  } = kit.useWords(moneyWordsFor);
  const loading = kit.useComponentState() === "loading";
  return (
    <kit.KitContent group="response" density={density}>
      <kit.KitHeader
        density={density}
        title={{ text: words.factors, part: "factors", role: "body", strong: true }}
      />
      <kit.KitRowGroup density={density} spacing="groups">
        {factors.map((row) => (
          <kit.KitRow
            key={row.id}
            item={row.id}
            part={loading ? null : "root"}
            inline
            inset="none"
            density={density}
            label={row.label}
            goto={loading ? undefined : row.goto}
          >
            <kit.KitGrid density={density}>
              <kit.KitMetaLine
                density={density}
                title={{ text: row.label, part: "label" }}
                meta={{ text: row.value, part: "value" }}
              />
              <kit.KitContent density={density}>
                <kit.KitLayoutText
                  density={density}
                  line={{ text: words.rating[row.rating], part: "rating", strong: true }}
                />
                <kit.KitLayoutText
                  density={density}
                  line={{ text: words.impact[row.impact], part: "impact", role: "meta", tone: "muted" }}
                />
              </kit.KitContent>
            </kit.KitGrid>
          </kit.KitRow>
        ))}
      </kit.KitRowGroup>
    </kit.KitContent>
  );
}

export function CreditScore(input: View) {
  const state = kit.useComponentState();
  const {
    words: { creditScore: words },
  } = kit.useWords(moneyWordsFor);
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const operation = kit.useHostOperations()[0];
  const refresh = (
    <kit.KitActionFooter density={density}>
      <kit.KitAction
        part="refresh"
        contentParts={{ label: "refresh_label" }}
        action="press"
        kind="secondary"
        label={operation?.status === "pending" ? words.refreshing : words.refresh}
      />
    </kit.KitActionFooter>
  );
  const body = (
    <kit.KitContent density={density}>
      <ScoreSummary input={input} density={density} full={detail === "full"} />
      <ScoreFactors factors={input.factors} density={density} />
      {refresh}
    </kit.KitContent>
  );
  return (
    <kit.KitCard part="root" padded density={density}>
      <kit.KitState
        part="status"
        density={density}
        loading={body}
        message={state === "empty" ? words.empty : words.error}
        icon={state === "empty" ? "file_text" : "alert"}
      >
        {body}
      </kit.KitState>
      {operation?.status === "rejected" && (state === "filled" || state === "empty") && (
        <kit.KitLayoutText
          density={density}
          line={{ part: state === "filled" ? "status" : null, text: words.error, role: "meta", tone: "bad" }}
        />
      )}
      {state === "empty" && (
        <kit.KitContent align="center" density={density}>
          {refresh}
        </kit.KitContent>
      )}
    </kit.KitCard>
  );
}
