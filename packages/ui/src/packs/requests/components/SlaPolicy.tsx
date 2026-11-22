import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { readSla, slaClocks, slaReading, validSlaTimes } from "../copy";
import { requestsWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-SlaPolicy.generated";

// Core first: Timer[until] counts down to one instant but cannot track two contractual targets or record a breach.
// prettier-ignore
export const meta = {
  id: "SlaPolicy", status: "ready", group: "data", tier: "phone", region: "body", weight: 2,
  purpose: prompt.purpose,
  pick: prompt.pick,
  realPath: "The host calculates contractual deadlines from the request's policy and timestamps or syncs them from a shared service desk.",
  writeHints: prompt.writeHints,
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["request", "response", "meter", "status"] } },
  parts: ["root", "request", "tier", "response", "resolution", "meter", "status", "policy", "policy_label"],
  actions: { parts: { policy: ["press"] }, when: { policy: { hasPolicy: true } } },
  successActions: ["policy.press"],
  states: ["filled", "loading", "success", "error"], readSuccess: true,
  clocks: slaClocks,
  read: readSla,
} as const satisfies c.Meta;

const isoOffset = z.iso.datetime({ offset: true });
const timestamp = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/)
  .refine((value) => isoOffset.safeParse(value).success && Number.isFinite(Date.parse(value)));

// prettier-ignore
export const props = z.strictObject({
  requestRef: c.text(32).meta({ kind: undefined }), tier: c.text(24), openedAt: timestamp, responseDueAt: timestamp,
  respondedAt: timestamp.optional(), resolutionDueAt: timestamp, resolvedAt: timestamp.optional(),
  paused: z.boolean().default(false), policyGoto: c.screenId.optional(),
  ...c.variantProps(meta.variants),
})
  .refine(validSlaTimes, { path: ["responseDueAt"], message: "SLA deadlines and events must be in chronological order" })
  .overwrite((value) => ({
    ...value, hasPolicy: value.policyGoto !== undefined, policy: value.policyGoto ? { goto: value.policyGoto } : undefined,
    responseOpen: !value.paused && !value.respondedAt, resolutionOpen: !value.paused && !value.resolvedAt,
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const item = c.itemsOf(cast, 1)[0];
  const thing = item && c.thingOf(cast, item.type);
  const at = "2000-01-01T00:00:00Z";
  return {
    requestRef: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    tier: (item && c.detailOf(item, 24, thing)) || c.placeholderTitle(1, lang),
    openedAt: at,
    responseDueAt: at,
    resolutionDueAt: at,
    paused: true,
  };
}

// prettier-ignore
export const examples = [
  { requestRef: "LG-41", tier: "Priority repair", openedAt: "2026-11-22T00:00:00Z",
    responseDueAt: "2026-11-22T04:00:00Z", respondedAt: "2026-11-22T02:15:00Z",
    resolutionDueAt: "2026-11-22T12:00:00Z", policyGoto: "service_rules" },
  { requestRef: "TR-08", tier: "Standard 24h", openedAt: "2026-11-21T08:00:00+01:00",
    responseDueAt: "2026-11-21T12:00:00+01:00", respondedAt: "2026-11-21T09:15:00+01:00",
    resolutionDueAt: "2026-11-22T08:00:00+01:00", resolvedAt: "2026-11-21T17:30:00+01:00", detail: "brief" },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("SlaPolicy");
// prettier-ignore
export const probes = [
  choose("For one repair ticket, show the service agreement tier, whether we met the first reply deadline, and the time left to resolve it. Flag either deadline if missed."),
  choose("Just count down to Friday at 4 PM. I only need a timer until that moment.", "Timer"),
  { ...write("Track the service deadlines for LG-41, Priority repair. Opened at 00:00 UTC on Nov 22, 2026; first response due 04:00, sent at 02:15. Resolve by 12:00 the same day, still open. Keep both targets visible, with the response status row and resolution bar. Link the SLA rules to service_rules."), variant: { axis: "detail", value: null } },
  { ...write("Show only a one-line SLA badge and remaining time for TR-08, Standard 24h. Preserve the timestamps: opened Nov 21, 2026 at 08:00 UTC; response due at 12:00 UTC that day; resolution due Nov 22 at 08:00 UTC. No reply or resolution yet."), variant: { axis: "detail", value: "brief" } },
  { ...read("Open the SLA rules for the priority repair", { address: "s1/policy", action: "press" }), at: Date.parse("2026-11-22T06:00:00Z") },
] satisfies c.Probe[];

type SlaProps = c.Props<typeof props, typeof meta>;
type Reading = ReturnType<typeof slaReading>;

// prettier-ignore
function SlaTargets({ brief, tier, requestRef, reading, density }: {
  brief: boolean; tier: string; requestRef: string | undefined; reading: Reading; density: c.ThemeDensity;
}) {
  const { words, response, resolution, resolutionText, ratio } = reading;
  const loading = kit.useComponentState() === "loading";
  const badge = <kit.KitTrail kind="badge" part="tier" value={tier} density={density} />;
  const value = <kit.KitLayoutText density={density} line={{
    text: brief && reading.state === "success" ? words.success : resolutionText,
    part: "resolution", role: resolution === "pending" ? "figure" : "body", compact: brief,
    tabular: true, tone: resolution === "breached" ? "bad" : resolution === "met" ? "good" : "text",
  }} />;
  if (brief) return <kit.KitRow part={null} inset="none" label={words.resolution} leading={badge} trailing={value} density={density}>{null}</kit.KitRow>;
  return <kit.KitRowGroup spacing="groups" separators={false} density={density}>
    <kit.KitRow part={null} inset="none" label={tier} trailing={badge} density={density}>
      <kit.KitHeader title={{ text: requestRef, part: "request", role: "body", strong: true }} density={density} />
    </kit.KitRow>
    <kit.KitRow part={null} inset="none" inline fitContent label={words.response} density={density}
      trailing={<kit.KitLayoutText line={{ text: words[response], role: "meta", tone: response === "breached" ? "bad" : response === "met" ? "good" : "muted" }} density={density} />}>
      <kit.KitLayoutText line={{ text: words.response, part: "response", role: "meta" }} density={density} />
    </kit.KitRow>
    <kit.KitContent density={density}>
      <kit.KitLayoutText line={{ text: words.resolution, role: "meta", tone: "muted" }} density={density} />
      {value}
      <kit.KitRow part="meter" label={words.resolution} inset="none" inline fitContent>
        <kit.KitMeter label="" amount="" ratio={loading ? 0 : ratio}
          tone={resolution === "breached" ? "bad" : resolution === "met" ? "good" : "accent"} slim addressed={false} />
      </kit.KitRow>
    </kit.KitContent>
  </kit.KitRowGroup>;
}

// prettier-ignore
function PolicyRow({ goto, label, density, loading = false }: { goto: string; label: string; density: c.ThemeDensity; loading?: boolean }) {
  return <kit.KitRow part={loading ? null : "policy"} inset="none" label={label} goto={loading ? undefined : goto} density={density}
    trailing={loading ? undefined : <kit.KitIcon name="chevron_right" decorative scale="sm" />}>
    <kit.KitLayoutText line={{ text: label, part: "policy_label", role: "caption", tone: "muted" }} density={density} />
  </kit.KitRow>;
}

// prettier-ignore
export function SlaPolicy(input: SlaProps) {
  const density = kit.useKit().density;
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const { lang } = kit.useWords(requestsWordsFor), context = kit.usePartContext();
  const live = kit.useLiveControls(meta, input) as SlaProps;
  const reading = slaReading(live, lang), { words } = reading;
  const brief = detail === "brief";
  const state = context.state === "filled" ? reading.state : context.state;
  const rowState = brief && state === "success" && reading.state === "success" ? "filled" : state;
  const targets = <SlaTargets {...{ brief, density, reading }} tier={input.tier} requestRef={input.requestRef} />;
  const retain = state !== "error" || context.state === "filled" || reading.state === "error";
  const showTargets = context.state === "filled" || context.state === reading.state;
  const message = state === "error" ? words.error : words.success;
  const policy = input.policyGoto && { goto: input.policyGoto, label: words.policy, density };
  return <kit.KitCard padded density={density} surface="card">
    <kit.PartScope {...context} state={rowState}>
      <kit.KitState {...{ retain, density, message }} part={brief ? null : "status"}
        loading={<>{targets}{policy && <PolicyRow {...policy} loading />}</>}>
        {showTargets && targets}
      </kit.KitState>
    </kit.PartScope>
    {policy && (context.state === "filled" || context.state === "success") && <PolicyRow {...policy} />}
  </kit.KitCard>;
}
