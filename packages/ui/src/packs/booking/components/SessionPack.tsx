import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import * as copy from "../copy";
import { bookingWordsFor, type BookingWords } from "../lang";
import { prompt } from "../../../entry/prompt-SessionPack.generated";

// Core first: Progress/compact shows an amount against a target, not prepaid credits with expiry and redeem/renew actions.
// prettier-ignore
export const meta = {
  id: "SessionPack", status: "ready", group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body", weight: 2, tier: "phone",
  realPath: "Prepaid session balances live on the provider's device; online top-up uses a payment service.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": {
    hides: ["service", "label", "amount", "redeem", "redeem_label", "renew", "renew_label",
      "retry", "retry_label", "renew_error", "renew_error_label"], adds: ["remaining"],
  } },
  parts: ["root", "title", "service", "label", "amount", "remaining", "expiry", "feedback",
    "redeem", "redeem_label", "renew", "renew_label", "retry", "retry_label", "renew_error", "renew_error_label"],
  states: ["filled", "empty", "loading", "success", "error"],
  partTiers: { renew: "service", renew_error: "service" },
  confirmParts: ["redeem", "retry"],
  successActions: ["redeem.press", "renew.press"],
  errorActions: ["retry.press", "renew_error.press"],
  readSuccess: true, read: copy.sessionPackReading,
  deviceData: copy.sessionPackPreviewKinds, previewDeviceData: copy.sessionPackPreview,
  recordRuntime: copy.sessionPackRecord,
  deviceDataWake: copy.sessionPackWake,
  actions: {
    parts: { redeem: ["press"], renew: ["press"], retry: ["press"], renew_error: ["press"] },
    when: { redeem: { redeemable: true }, retry: { redeemable: true },
      renew: { renewable: true }, renew_error: { renewable: true } },
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  packId: c.text(24).meta({ kind: undefined }), title: c.text(28),
  total: z.int().min(2).max(50), used: z.int().min(0).max(50),
  expires: c.isoDate.optional(), service: c.text(28).optional(), renewGoto: c.screenId.optional(),
}).refine(({ total, used }) => used <= total, { path: ["used"], message: "Used cannot exceed total" });

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const item = c.itemsOf(cast, 1)[0];
  return {
    packId: c.placeholderValue,
    title: (item && c.titleOf(item, 28, thing)) || c.placeholderTitle(0, lang),
    total: 2,
    used: 2,
  };
}

const ledge = {
  packId: "repotting",
  title: "Repotting bundle",
  total: 6,
  used: 2,
  service: "Repotting visits",
  expires: "2026-12-12",
  renewGoto: "renew",
} satisfies z.input<typeof props>;

// prettier-ignore
export const examples = [
  ledge,
  { packId: "park_walks", title: "Park walk bundle", total: 10, used: 7, renewGoto: "renew" },
  { ...ledge, detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SessionPack");
// prettier-ignore
export const probes = [
  choose("I prepaid for six repotting visits. Show how many I've got left, when they expire, and let me use one at my next visit."),
  choose("Show how far along we are toward each of our separate studio targets: 8 of 12 class places booked, 6 of 10 survey responses received, and 3 of 5 new members signed up. Give every target its own completion bar; I'm not comparing the raw totals.", "Progress"),
  { ...write("Use the full details for my prepaid repotting bundle, reference repotting: six visits total, two used, a balance meter and a redeem button. It expires December 12, 2026."), variant: { axis: "detail", value: "full" } },
  {
    ...write("My prepaid park walk bundle, reference park_walks, has ten walks total and seven used. Show only a read-only summary row with a credits-left badge instead of the meter and buttons."),
    variant: { axis: "detail", value: "brief" },
  },
  read("Use one of my prepaid park walks.", { address: "s1/redeem", action: "press" }, 1),
  read("Open renewal for my prepaid park walk bundle.", { address: "s1/renew", action: "press" }, 1),
] satisfies c.Probe[];

type Balance = ReturnType<typeof copy.sessionPackCopy>;
type Facts = ReturnType<typeof copy.sessionPackFacts>;
type Labels = BookingWords["sessionPack"];
type Presentation = { facts: Facts; balance: Balance; density: c.ThemeDensity; total: number; words: Labels };

// prettier-ignore
function PackActions({ facts, words, density, loading = false, error = false }: {
  facts: Facts; words: Labels; density: c.ThemeDensity; loading?: boolean; error?: boolean;
}) {
  const actions = [
    ...(facts.redeemable ? [{ part: error ? "retry" : "redeem", label: words.redeem, kind: "primary" as const }] : []),
    ...(facts.renew ? [{
      part: error ? "renew_error" : "renew", label: words.renew, goto: facts.renew.goto,
      kind: facts.redeemable ? "secondary" as const : "primary" as const,
    }] : []),
  ];
  if (!actions.length) return null;
  const controls = actions.map(({ part, label, kind, ...link }) => loading
    ? <kit.KitSkeleton key={part} shape="control" {...{ label, kind }} full />
    : <kit.KitAction key={part} {...{ part, label, kind }} {...link} action="press" full />);
  return <kit.KitContent group="response" density={density}>
    {controls.length === 1 ? controls : <kit.KitGrid density={density}>{controls}</kit.KitGrid>}
  </kit.KitContent>;
}

// prettier-ignore
function PackMeter({ facts, balance, density, total, words, loading = false }: Presentation & { loading?: boolean }) {
  const tone = facts.expiry === "expired" ? "bad" : facts.expiry === "soon" ? "warn" : "accent";
  return <kit.KitContent group="response" density={density}>
    <kit.KitGrid fitLast density={density}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", words.balance]]} />
        : <kit.KitText part="label" role="label">{words.balance}</kit.KitText>}
      {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["number", balance.amount, "end", "compact"]]} />
        : <kit.KitText part="amount" role="number" numberScale="compact" tabular>{balance.amount}</kit.KitText>}
    </kit.KitGrid>
    <kit.KitMeter label="" amount="" ratio={loading ? 0 : facts.remaining / total} {...{ tone }}
      addressed={false} slim={density === "compact"} />
    {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["label", balance.expiry]]} />
      : <PackExpiry {...{ facts, balance }} />}
  </kit.KitContent>;
}

// prettier-ignore
function PackExpiry({ facts, balance }: Pick<Presentation, "facts" | "balance">) {
  const tone = facts.expiry === "expired" ? "bad" : facts.expiry === "soon" ? "warn" : "muted";
  return balance.expiry && <kit.KitText part="expiry" role="label" tone={tone}>{balance.expiry}</kit.KitText>;
}

// prettier-ignore
function PackLoading({ title, ...presentation }: Presentation & { title: string }) {
  const { balance, density, facts } = presentation;
  const heading = <kit.KitSkeleton shape="figure" inset="none" density={density}
    content={[["heading", title], ["label", facts.brief ? balance.expiry : facts.service]]} />;
  if (facts.brief)
    return <kit.KitGrid fitLast density={density}>{heading}<kit.KitTrail kind="badge" part="remaining" value={balance.badge} /></kit.KitGrid>;
  return <>{heading}<PackMeter {...presentation} loading /><PackActions {...presentation} loading /></>;
}

// prettier-ignore
function PackBody({ title, state, ...presentation }: Presentation & { title: string; state: c.StateName }) {
  const { balance, density, facts } = presentation;
  const heading = <kit.KitContent density={density}>
    <kit.KitText part="title" role="heading" {...{ density }}>{title}</kit.KitText>
    {facts.brief ? <PackExpiry {...presentation} />
      : facts.service && <kit.KitText part="service" role="label" tone="muted">{facts.service}</kit.KitText>}
  </kit.KitContent>;
  return <>
    {facts.brief ? <kit.KitGrid fitLast density={density}>
      {heading}<kit.KitTrail kind="badge" part="remaining" value={balance.badge} density={density}
        tone={facts.expiry === "expired" ? "bad" : facts.remaining === 0 ? "muted" : "accent"} />
    </kit.KitGrid> : <>{heading}<PackMeter {...presentation} /></>}
    {balance.feedback && <kit.KitText part="feedback" role="label"
      tone={state === "error" && !facts.recovered ? "bad" : "good"}>{balance.feedback}</kit.KitText>}
    <PackActions {...presentation} error={state === "error"} />
  </>;
}

export function SessionPack(input: c.Props<typeof props, typeof meta>) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const { lang, words } = kit.useWords(bookingWordsFor);
  const live = kit.useLiveControls(meta, input);
  const facts = copy.sessionPackFacts(live);
  const balance = copy.sessionPackCopy(input, facts, state, lang);
  const content = {
    title: input.title,
    total: input.total,
    balance,
    density,
    facts,
    words: words.sessionPack,
  };
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty part="title" decorativeIcon />
      ) : state === "loading" ? (
        <PackLoading {...content} />
      ) : (
        <PackBody {...content} state={state} />
      )}
    </kit.KitCard>
  );
}
