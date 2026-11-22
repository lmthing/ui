import { z } from "zod";
import {
  clip,
  detailOf,
  itemsOf,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
  variantProps,
  wordsFor,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { noticeCountPieces, noticeProgress, noticeReading, noticeReceipt } from "../copy";
import { teamWordsFor } from "../lang";

// Core first: Banner/tone warns briefly, but cannot show a full authored staff bulletin and record read receipts.
export const meta = {
  id: "TeamNotice",
  status: "ready",
  group: "content",
  tier: "people",
  pick: "An official workplace bulletin, policy or staff announcement with author, date, priority and read receipts. Not a shift handover (Handover), a short transient warning (Banner), or a social post (Post).",
  purpose: "Read important workplace notices and acknowledge that you have read them.",
  region: "body",
  weight: 2,
  realPath: "pinned workplace bulletins and per-employee read receipts synchronized in a shared team app.",
  variants: { detail: ["full", "brief"], density: ["comfortable", "compact"], surface: ["card", "outlined"] },
  variantParts: { "detail.brief": { hides: ["author", "posted", "body", "count", "ack", "ack_label"] } },
  writeHints: [
    'For a pinned strip that links to the full bulletin, set detail to "brief" and keep the full body and goto. Use null for unrequested density and surface.',
    "Read count is the number who already read it, including the current member if acknowledged is true. Never make it greater than totalMembers.",
  ],
  parts: [
    "frame",
    "root",
    "title",
    "priority",
    "author",
    "posted",
    "body",
    "count",
    "ack",
    "ack_label",
    "message",
  ],
  actions: {
    parts: { ack: ["check"], root: ["press"] },
    when: { ack: { detail: "full", requireAck: true, acknowledged: false }, root: { linked: true } },
  },
  localState: noticeReceipt,
  states: ["filled", "loading", "success"],
  readSuccess: true,
  successActions: ["root.press"],
  read: (input, state, lang): string[] =>
    state === "loading" ? [] : noticeReading(input as ViewProps, state === "success", lang),
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    title: text(48).meta({ read: false }),
    by: text(24).meta({ read: false }),
    postedAt: text(16).meta({ read: false }),
    priority: z.enum(["info", "important", "urgent"]).default("info").meta({ read: false }),
    body: text(400).meta({ read: false }),
    requireAck: z.boolean().default(true),
    acknowledged: z.boolean().default(false),
    readCount: z.int().min(0),
    totalMembers: z.int().min(1),
    goto: screenId.optional(),
  })
  .refine(({ readCount, totalMembers }) => readCount <= totalMembers, {
    path: ["readCount"],
    message: "Read count cannot exceed total members",
  })
  .overwrite((input) => ({ ...input, linked: input.goto !== undefined, counted: input.acknowledged }));

export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const items = itemsOf(cast, 1);
  function castTitle(max: number, index: number) {
    const item = items[index];
    return (item && titleOf(item, max, thing)) || clip(placeholderTitle(index, lang), max);
  }
  return {
    title: castTitle(48, 0),
    by: clip(placeholderTitle(1, lang), 24),
    postedAt: clip(placeholderTitle(2, lang), 16),
    body: (items[0] && detailOf(items[0], 400, thing)) ?? wordsFor(lang).placeholderDetail,
    readCount: 0,
    totalMembers: 1,
  };
}

export const examples = [
  {
    title: "Greenhouse access update",
    by: "Anna Cole",
    postedAt: "20 Nov · 09:30",
    priority: "important",
    body: "Use the side entrance while the front steps are repaired. Let the shift lead know if a delivery needs access.",
    readCount: 14,
    totalMembers: 18,
    goto: "access_notice",
  },
  {
    title: "Check leads before walks",
    by: "Sam Ortiz",
    postedAt: "21 Nov · 08:00",
    priority: "urgent",
    body: "A batch of spare leads has faulty clips. Use the checked leads by the office and report any loose clip to the route lead.",
    readCount: 5,
    totalMembers: 8,
    goto: "lead_notice",
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = probesFor("TeamNotice");
export const probes = [
  choose(
    "Publish a formal workplace bulletin with the author, date, priority and a checkbox for staff to acknowledge reading it. Show how many have read it.",
  ),
  choose("Put a short warning strip at the top of the screen: The park gate is closed.", "Banner"),
  write(
    "Issue staff bulletin Greenhouse access update, by Anna Cole on 20 Nov at 09:30. Mark important. Body: Use the side entrance while the front steps are repaired. Require acknowledgment; I have not read it, and 14 of 18 members have.",
  ),
  {
    ...write(
      "Make a pinned strip that opens access_notice. Title Greenhouse access update, Anna Cole, 20 Nov 09:30, important. Store body Use the side entrance during repairs. 14 of 18 have read it. Hide the body, author, read count, and acknowledgment in the strip; do not change density or surface.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Tick the acknowledgment that I've read the workplace bulletin.", {
    address: "t1/ack",
    action: "check",
  }),
] satisfies Probe[];

type ViewProps = Props<typeof props, typeof meta>;
const priorities = { info: "muted", important: "warn", urgent: "bad" } as const;

// prettier-ignore
function NoticeHeader({ input, brief, density }: { input: ViewProps; brief: boolean; density: ViewProps["density"] }) {
  const loading = kit.useComponentState() === "loading";
  const { words: { teamNotice: words } } = kit.useWords(teamWordsFor);
  const badge = <kit.KitTrail kind="badge" value={words.priority[input.priority]} part="priority" tone={priorities[input.priority]} density={density} />;
  return (
    <kit.KitRow part={loading ? null : "root"} label={input.title} goto={loading ? undefined : input.goto}
      inset="none" inline fitContent density={density}>
      {brief ? <kit.KitGrid fitLast density={density}>
        <kit.KitHeader density={density} title={{ text: input.title, part: "title", role: "body", strong: true }} />
        {badge}
      </kit.KitGrid> : <kit.KitContent density={density}>
        <kit.KitGrid fitLast density={density}>
          <kit.KitLayoutText line={{ text: input.by, part: "author", role: "meta" }} density={density} />
          {badge}
        </kit.KitGrid>
        <kit.KitHeader density={density} title={{ text: input.title, part: "title", role: "title" }}
          meta={[
            { text: input.postedAt, part: "posted" },
          ]} />
      </kit.KitContent>}
    </kit.KitRow>
  );
}

// prettier-ignore
function Acknowledgment({ done, density }: { done: boolean; density: ViewProps["density"] }) {
  const loading = kit.useComponentState() === "loading";
  const { words: { teamNotice: words } } = kit.useWords(teamWordsFor);
  const text = done ? words.acknowledged : words.ack;
  return (
    <kit.KitRow label={text} inline inset="none" density={density}
      trailing={loading ? <kit.KitSkeleton shape="control" kind="quiet" />
        : <kit.KitCheck done={done} label={text} part="ack" readonly={done} />}>
      <kit.KitLayoutText line={{ text, part: "ack_label", role: "body" }} density={density} />
    </kit.KitRow>
  );
}

// prettier-ignore
function NoticeContent({ input, brief, density }: { input: ViewProps; brief: boolean; density: ViewProps["density"] }) {
  const state = kit.useComponentState();
  const { lang } = kit.useWords(teamWordsFor);
  const progress = noticeProgress(input, state === "success", lang);
  return (
    <>
      <NoticeHeader {...{ input, brief, density }} />
      {!brief && <>
        <kit.KitLayoutText line={{ text: input.body, part: "body", role: "body" }} density={density} />
        {state === "loading" ? <kit.KitLayoutText line={{ text: progress.count, role: "body" }} density={density} />
          : <kit.KitText part="count" role="body" density={density}>
            {noticeCountPieces(progress.count, lang).map(({ text, figure }, index) =>
              <kit.KitText key={index} role={figure ? "number" : "body"} numberScale="compact"
                tone={figure ? "text" : "muted"} tabular={figure} part={null} density={density}>{text}</kit.KitText>
            )}
          </kit.KitText>}
        {input.requireAck && <Acknowledgment done={progress.done} density={density} />}
      </>}
    </>
  );
}

// prettier-ignore
export function TeamNotice(input: ViewProps) {
  const { screen, component } = kit.usePartContext();
  const { words: { teamNotice: words } } = kit.useWords(teamWordsFor);
  kit.useControlValue(`${screen}/${component}/$localState/${meta.id}`, undefined);
  const live = kit.useLiveControls(meta, input) as ViewProps;
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const detail = kit.useVariant("detail", meta.variants.detail, input.detail);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const content = <NoticeContent input={live} brief={detail === "brief"} density={density} />;
  return (
    <kit.KitCard part="frame" style="inset" padded {...{ density, surface }}>
      <kit.KitState retain message={words.success} part="message" density={density} loading={content}>
        {content}
      </kit.KitState>
    </kit.KitCard>
  );
}
