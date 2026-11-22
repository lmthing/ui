import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
// prettier-ignore
import { modQueueApprove, modQueueCount, modQueueDecision, modQueueItems, modQueuePresentation, modQueueReading,
  modQueueReason, modQueueRowMeta, modQueueState, type ModQueueRow } from "../copy";
import { communityWordsFor } from "../lang";
import { dateTime, distinct, ref } from "../seeds";
import { prompt } from "../../../entry/prompt-ModQueue.generated";

// Core first: List/expand opens notices but cannot record rule-backed moderation decisions.
// prettier-ignore
export const meta = {
  id: "ModQueue", status: "ready", group: "action", tier: "people",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body", weight: 3, dense: true,
  realPath: "A shared community app synchronizes applications, reports and decisions from authorized moderators.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["detail"] } },
  parts: ["root", "heading", "count", "count_label", "notice"],
  items: {
    key: "items", parts: ["root", "author", "photo", "meta", "timestamp", "summary", "detail", "recorded_reason", "notice",
      "approve", "decline", "remove", "reason"],
    visibleWhen: { shown: true },
    pickers: { reason: { prop: "selectedRule", choices: { prop: "ruleChoices" } } },
  },
  actions: {
    items: { root: ["press"], approve: ["press"], decline: ["press"], remove: ["press"], reason: ["select"] },
    when: {
      root: { linked: true }, approve: { status: "pending" }, decline: { canDecline: true },
      remove: { canRemove: true }, reason: { status: "pending" },
    },
  },
  confirmParts: ["decline", "remove"],
  hostCommands: {
    identity: ({ row }) => row?.queueId as string | undefined,
    items: { "approve.press": modQueueDecision("approved"), "decline.press": modQueueDecision("declined"),
      "remove.press": modQueueDecision("removed") },
  },
  readSuccess: true,
  read: modQueueReading,
  live: { derive: modQueuePresentation },
  states: ["filled", "empty", "loading", "success", "error"],
} as const satisfies c.Meta;

// prettier-ignore
const item = z.strictObject({
  id: ref, kind: z.enum(["join", "flagged_post", "flagged_comment"]), author: c.text(24), photo: c.photo.optional(),
  summary: c.text(120), detail: c.text(200).optional(), reason: c.text(32).optional(), submittedAt: dateTime,
  status: z.enum(["pending", "approved", "declined", "removed"]), goto: c.screenId.optional(),
});
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    items: z.array(item).min(0).max(12),
    rules: z.array(c.text(32)).min(1).max(6),
    style: z.enum(["mixed", "joins"]).default("mixed"),
  })
  .refine(({ items }) => distinct(items, (row) => row.id), { path: ["items"] })
  .refine(({ rules }) => distinct(rules, (rule) => rule), { path: ["rules"] })
  .overwrite((input) => ({ ...input, items: modQueueItems(input) }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const rows = c.itemsOf(cast, 2).flatMap((row, index) => {
    const author = c.titleOf(row, 24, thing);
    if (!author) return [];
    return [
      {
        id: `item_${index + 1}`,
        kind: "join" as const,
        author,
        summary: c.detailOf(row, 120, thing) || c.wordsFor(lang).placeholderDetail,
        submittedAt: "2000-01-01T00:00:00Z",
        status: "pending" as const,
      },
    ];
  });
  return { items: rows, rules: [c.placeholderTitle(0, lang)] };
}

// prettier-ignore
export const examples: z.input<typeof props>[] = [
  { items: [
      { id: "ivy_join", kind: "join", author: "Ivy Chen", photo: "lib:people", summary: "I’d like to help at the seed swap.",
        detail: "Lives in the ward and can volunteer on Saturdays.", submittedAt: "2026-11-21T09:00:00Z", status: "pending", goto: "ivy_application" },
      { id: "lee_post", kind: "flagged_post", author: "Lee Ortiz", summary: "Plant pots for sale this weekend.",
        detail: "A member reported a sales link in the tool exchange.", submittedAt: "2026-11-21T10:00:00Z", status: "pending" },
    ], rules: ["Local residents only", "No advertising"] },
  { style: "joins", items: [
      { id: "ana_join", kind: "join", author: "Ana Reed", summary: "Hoping to join the Saturday dog walks.",
        detail: "Has read the group rules and lives near the park.", submittedAt: "2026-11-20T10:00:00+01:00", status: "pending" },
    ], rules: ["Local residents only", "Dogs on leads"] },
  { items: [
      { id: "mo_comment", kind: "flagged_comment", author: "Mo Park", summary: "A comment on the evening walk thread.",
        reason: "Personal attacks", submittedAt: "2026-11-19T18:20:00Z", status: "removed" },
    ], rules: ["Personal attacks", "No advertising"] },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("ModQueue");
const brief =
  "For our allotment club's moderator, review Ivy Chen's pending join application ivy_join, sent 2026-11-21T09:00:00Z. Summary: Wants to help at the seed swap. Screening answer: Lives in the ward. Use rules Local residents only and No advertising.";
// prettier-ignore
export const probes = [
  choose("Give our allotment club moderators one place to review join applications and flagged comments, approve or decline applicants, and remove comments with a rule reason."),
  choose("Give me a list of short club notices. Each should expand to show its full text when tapped. No moderation or decisions.", "List"),
  write(brief),
  { ...write(`${brief} Keep the screening answer in the data but hide the extra detail in the queue. Leave spacing and surface alone.`),
    variant: { axis: "detail", value: "brief" } },
  read("On Lee Ortiz’s flagged post, select No advertising as the rule reason without removing the post yet.",
    { address: "m1/r2/reason", action: "select" }),
  read("Open Ivy Chen's application to review it without making a decision.", { address: "m1/r1", action: "press" }),
] satisfies c.Probe[];

type QueueProps = c.Props<typeof props, typeof meta>;
type Finish = { density: c.ThemeDensity; state: c.StateName; later: boolean };

// prettier-ignore
function QueueControls({ row, density }: { row: ModQueueRow; density: c.ThemeDensity }) {
  const { words: { modQueue: words } } = kit.useWords(communityWordsFor);
  const loading = kit.useComponentState() === "loading";
  return <>
    <kit.KitLayoutText line={{ text: words.reason, role: "meta", tone: "muted" }} density={density} />
    <kit.KitTrack part="reason" role="radiogroup" label={words.reason}>
      {row.ruleChoices.map(({ label, value }) => <kit.KitChip key={value} item={null} label={label} value={value}
        on={value === row.selectedRule} role="radio" disabled={loading || undefined} />)}
    </kit.KitTrack>
    <kit.KitActionFooter density={density}>
      <kit.KitAction part="approve" action="press" label={modQueueApprove(row, words)} kind="secondary" contentParts={{}} />
      {row.canDecline && <kit.KitAction part="decline" action="press" label={words.decline} kind="danger" contentParts={{}} />}
      {row.canRemove && <kit.KitAction part="remove" action="press" label={words.remove} kind="danger" contentParts={{}} />}
    </kit.KitActionFooter>
  </>;
}

// prettier-ignore
function QueueRow({ row, state, density, operation, later }: Finish & { row: ModQueueRow; operation?: c.HostOperation["status"] | undefined }) {
  const scope = kit.usePartContext();
  const { lang, words: { modQueue: words } } = kit.useWords(communityWordsFor);
  const loading = state === "loading", active = state === "filled" && operation !== "pending";
  const notice = operation === "pending" ? words.pending : operation === "accepted" ? words.saved :
    operation === "rejected" ? words.error : undefined;
  const linked = active && row.linked;
  const { kind, timestamp, text } = modQueueRowMeta(row, lang);
  const lead = row.photo ? <kit.KitPhoto photo={row.photo} part="photo" shape="round" loading={loading} /> :
    <kit.KitIcon name={row.kind === "join" ? "user" : "flag"} scale="sm" tone="muted" decorative loading={loading} />;
  return <kit.PartScope {...scope} item={row.id}>
    <kit.KitContent density={density} group={later ? "response" : "content"}>
      <kit.KitRow item={row.id} part={loading ? null : "root"} label={row.author}
        inline fitContent={!linked} inset="none" density={density} goto={linked ? row.goto : undefined}
        leading={lead} leadingAlign={row.photo ? "row" : "line"}
        trailing={linked && <kit.KitIcon name="chevron_right" scale="sm" decorative />}>
        <kit.KitMetaLine title={{ text: row.author, part: "author", strong: true }}
          meta={row.status === "pending" ? { text, part: "meta" } : [{ text: kind, part: "meta" },
            { text: timestamp, part: "timestamp" }]} density={density} />
      </kit.KitRow>
      <kit.KitContent density={density}>
        <kit.KitLayoutText line={{ text: row.summary, part: "summary" }} density={density} />
        <kit.KitLayoutText line={{ text: row.detail, part: "detail", role: "meta", tone: "muted" }} density={density} />
        <kit.KitLayoutText line={{ text: modQueueReason(row, words), part: "recorded_reason", role: "meta", tone: "muted" }} density={density} />
      </kit.KitContent>
      {notice && <kit.KitLayoutText line={{ text: notice, part: "notice", role: "meta",
        tone: operation === "rejected" ? "bad" : operation === "accepted" ? "good" : "muted" }} density={density} />}
      {(active || loading) && row.status === "pending" && <QueueControls {...{ row, density }} />}
    </kit.KitContent>
  </kit.PartScope>;
}

// prettier-ignore
export function ModQueue(input: QueueProps) {
  const state = kit.useComponentState();
  const density = kit.useKit().density;
  const surface = "card";
  const operations = kit.useHostOperations();
  const { lang, words: { modQueue: words } } = kit.useWords(communityWordsFor);
  const live = kit.useLiveControls(meta, input);
  const rows = c.visibleItems(meta, live) as ModQueueRow[];
  const body = <>
    <kit.KitGrid fitLast density={density}>
      <kit.KitHeader title={{ text: words.heading, part: "heading" }} density={density} />
      <kit.KitFigure density={density} align="end" value={{ text: modQueueCount(rows, lang), part: "count", compact: true, strong: true }}
        unit={{ text: words.countUnit, part: "count_label" }} />
    </kit.KitGrid>
    <kit.KitRowGroup density={density} spacing="groups" leadingWidth="avatar" separators={false}>
      {rows.map((row, index) => <QueueRow key={row.queueId} {...{ row, state, density }} later={index > 0}
        operation={operations.find((op) => op.row === row.id)?.status} />)}
    </kit.KitRowGroup>
    {!rows.length && state === "filled" && <kit.KitEmpty title={words.empty} part="notice" prominence="body" decorativeIcon />}
  </>;
  return <kit.KitCard part="root" padded {...{ density, surface }}>
    <kit.KitState part="notice" retain message={modQueueState(state, words)} loading={body} {...{ density }}>{body}</kit.KitState>
  </kit.KitCard>;
}
