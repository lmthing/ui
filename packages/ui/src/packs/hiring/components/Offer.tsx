import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { offerCopy, offerReading, offerWindow, responseCutoff } from "../copy";
import { hiringWordsFor } from "../lang";
import { payPeriods, seedApplicationId, seedDate, seedGoto } from "../seeds";
import { prompt } from "../../../entry/prompt-Offer.generated";

// Core first: Amount/inline shows one pay number but cannot hold employment terms or their response.
export const meta = {
  id: "Offer",
  status: "ready",
  group: "content",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { send: "service", accept: "people", decline: "people", withdraw: "service" },
  realPath:
    "The phone holds drafts and logged outcomes, sending needs an outside service, and actual responses need a shared app.",
  variants: { arrange: ["rows", "grid"] },
  // prettier-ignore
  parts: [
    "root", "candidate", "role", "employer", "pay", "hours_per_week", "start", "respond_by",
    "conditions", "status", "edit", "edit_label", "send", "send_label", "accept", "accept_label",
    "decline", "decline_label", "withdraw", "withdraw_label", "success", "error",
  ],
  confirmParts: ["decline", "withdraw"],
  states: ["filled", "loading", "success", "error"],
  actions: {
    parts: { edit: ["press"], send: ["send"], accept: ["press"], decline: ["press"], withdraw: ["press"] },
    when: {
      edit: { draft: true },
      send: { draft: true },
      accept: { sent: true, expired: false },
      decline: { sent: true, expired: false },
      withdraw: { sent: true },
    },
    noGoto: { parts: ["accept", "decline", "withdraw"] },
  },
  live: { derive: ({ status }) => offerWindow(status) },
  deviceDataFlags: {
    expired: (_data, { status, respondBy }, now) =>
      status === "sent" && now >= (responseCutoff(respondBy) ?? Infinity),
  },
  deviceDataWake: (_data, { status, respondBy }) =>
    status === "sent" ? responseCutoff(respondBy) : undefined,
  read: (input, state, lang, _data, currency): string[] =>
    state === "filled"
      ? offerReading(input as z.output<typeof props> & { expired: boolean }, currency, lang)
      : [],
  writeHints: prompt.writeHints,
} as const satisfies c.Meta;

export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  offerId: c.text(32).meta({ kind: "id" }),
  applicationId: c.text(32).meta({ kind: "id" }),
  candidate: c.text(24),
  role: c.text(32),
  employer: c.text(32),
  pay: z.number().min(0),
  per: z.enum(payPeriods),
  hoursPerWeek: z.number().gt(0).max(80),
  start: c.isoDate,
  respondBy: c.isoDate.optional(),
  conditions: z.array(c.text(100)).min(0).max(6),
  status: z.enum(["draft", "sent", "accepted", "declined", "withdrawn"]),
  goto: c.screenId,
});

const initialStatus = "draft";

export function fallback(input: c.FallbackInput): z.input<typeof props> {
  const { cast, lang } = input;
  const thing = c.thingOf(cast);
  const [item] = c.itemsOf(cast, 1);
  return {
    offerId: "offer_1",
    applicationId: seedApplicationId,
    candidate: (item && c.titleOf(item, 24, thing)) ?? c.clip(c.placeholderTitle(0, lang), 24),
    role: (item && c.detailOf(item, 32, thing)) ?? c.clip(c.wordsFor(lang).placeholderDetail, 32),
    employer: c.clip(c.placeholderTitle(1, lang), 32),
    pay: 0,
    per: "hour",
    hoursPerWeek: 1,
    start: seedDate,
    conditions: [],
    status: initialStatus,
    goto: seedGoto,
  };
}

// prettier-ignore
export const examples = [
  {
    offerId: "sam_terms", applicationId: "sam", candidate: "Sam Patel", role: "Summer dog walker",
    employer: "Trot", pay: 20, per: "hour", hoursPerWeek: 20, start: "2027-05-10", respondBy: "2027-05-01",
    conditions: ["Subject to two references"], status: "sent", goto: "offer_edit",
  },
  {
    offerId: "mara_terms", applicationId: "mara", candidate: "Mara Kim", role: "Morning baker",
    employer: "Harbour Bakery", pay: 26, per: "hour", hoursPerWeek: 30, start: "2027-06-07",
    conditions: [], status: initialStatus, goto: "mara_edit",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Offer");
export const probes: c.Probe[] = [
  choose(
    "Show a proposed job offer with hourly pay, weekly hours, a start date and conditions, and let the recipient accept or decline.",
  ),
  choose(
    "Show just one prominent money figure for the hourly rate, labelled Base pay. No other employment terms, deadlines or actions.",
    "Amount",
  ),
  write(
    "Trot sent Sam Patel a Summer dog walker offer: 20 per hour, 20 hours weekly, start 2027-05-10, reply by 2027-05-01, subject to two references. Link to the edit form.",
  ),
  {
    ...write(
      "Draft a Morning baker job offer for Mara Kim at Harbour Bakery. Pay 26 an hour, 30 hours a week starting 2027-06-07, with no conditions. Show weekly hours beside the start date in two columns. Link to the edit form.",
    ),
    variant: { axis: "arrange", value: "grid" },
  },
  read("Withdraw the offer that was sent to Sam.", { address: "o1/withdraw", action: "press" }),
] satisfies c.Probe[];

type Terms = c.Props<typeof props, typeof meta>;

// prettier-ignore
function OfferActions({ input, expired, density, loading }: { input: Terms; expired: boolean; density: c.ThemeDensity; loading: boolean }) {
  const { words: { offer: words } } = kit.useWords(hiringWordsFor);
  const { draft, sent } = offerWindow(input.status);
  if (!draft && !sent) return null;
  const button = (part: keyof typeof words.actions, kind: kit.ActionKind, goto?: string) =>
    loading ? <kit.KitSkeleton shape="control" label={words.actions[part]} {...{ kind }} full /> :
      <kit.KitAction label={words.actions[part]} action={part === "send" ? "send" : "press"} {...{ part, kind, goto }} full />;
  return <kit.KitContent group="response" {...{ density }}>
    {draft ? <>
      {button("send", "primary")}
      {button("edit", "quiet", input.goto)}
    </> : <kit.KitRowGroup spacing="groups" density={density}>
      {!expired && <kit.KitRow part={null} role="group" inline fitContent label={words.recipientActions} density={density}>
        <kit.KitLayoutText line={{ text: words.recipientActions, role: "meta", tone: "muted" }} density={density} />
        <kit.KitGrid {...{ density }}>
          {button("accept", "primary")}{button("decline", "danger")}
        </kit.KitGrid>
      </kit.KitRow>}
      <kit.KitRow part={null} role="group" inline fitContent label={words.employerActions} density={density}>
        <kit.KitLayoutText line={{ text: words.employerActions, role: "meta", tone: "muted" }} density={density} />
        <kit.KitRow part={loading ? null : "withdraw"} label={words.actions.withdraw}
          role={loading ? "text" : "button"} inline density={density}>
          <kit.KitLayoutText line={{ part: "withdraw_label", text: words.actions.withdraw, role: "meta", tone: "bad" }} density={density} />
        </kit.KitRow>
      </kit.KitRow>
    </kit.KitRowGroup>}
  </kit.KitContent>;
}

// prettier-ignore
export function Offer(input: Terms) {
  const state = kit.useComponentState(), loading = state === "loading";
  const { lang, words: { offer: words } } = kit.useWords(hiringWordsFor);
  const density = kit.useKit().density;
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const { expired: liveExpired } = kit.useLiveControls(meta, input);
  const expired = typeof liveExpired === "boolean" ? liveExpired :
    input.status === "sent" && Date.now() >= (responseCutoff(input.respondBy) ?? Infinity);
  const copy = offerCopy(input, expired, kit.useAppCurrency(), lang);
  const line = (part: string | null, value: string, role: kit.TextRole, tone: kit.TextTone = "text") =>
    loading ? <kit.KitSkeleton shape="figure" inset="none" content={[[role, value, "start", "compact"]]} {...{ density }} /> :
      <kit.KitText {...{ part, role, tone, density }} numberScale="compact" tabular={role === "number"}>{value}</kit.KitText>;
  return <kit.KitCard part="root" padded density={density}>
    {state === "success" || state === "error" ? <kit.KitEmpty part={state} title={words[state]}
      icon={state === "success" ? "check" : "alert"} tone={state === "success" ? "good" : "bad"} decorativeIcon /> : <>
      <kit.KitContent {...{ density }}>
        {line("candidate", input.candidate, "title")}
        {line("role", input.role, "body")}
        {line("employer", input.employer, "label", "muted")}
        {line("status", copy.status, "label", expired ? "warn" : input.status === "accepted" ? "good" : "muted")}
      </kit.KitContent>
      <kit.KitContent group="response" {...{ density }}>
        {line("pay", copy.pay, "number")}
        {arrange === "grid" ? <kit.KitGrid {...{ arrange, density }}>
          {line("hours_per_week", copy.hours, "label")}{line("start", copy.start, "label")}
        </kit.KitGrid> : loading ? line(null, [copy.hours, copy.start].join(words.termSeparator), "label") :
          <kit.KitText role="label" part={null} {...{ density }}>{line("hours_per_week", copy.hours, "label")}
            {words.termSeparator}{line("start", copy.start, "label")}</kit.KitText>}
        {copy.deadline && line("respond_by", copy.deadline, "label", expired ? "warn" : "muted")}
      </kit.KitContent>
      {copy.conditions.length > 0 && <kit.KitContent group="response" {...{ density }}>
        {line("conditions", words.conditions, "label", "muted")}
        {copy.conditions.map((condition, index) => <kit.KitContent key={index} {...{ density }}>
          {line(null, condition, "body")}
        </kit.KitContent>)}
      </kit.KitContent>}
      <OfferActions {...{ input, expired, density, loading }} />
    </>}
  </kit.KitCard>;
}
