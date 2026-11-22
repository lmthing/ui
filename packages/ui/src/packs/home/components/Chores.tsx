// prettier-ignore
import { isoDate, itemsOf, itemVariantProps, photo, placeholderTitle, probesFor, repeatOptions, screenId, text,
  thingOf, titleOf, detailOf, variantProps, type FallbackInput, type Meta, type Probe, type Props } from "../../../catalog";
// prettier-ignore
import { KitCard, KitCheck, KitContent, KitEmpty, KitGrid, KitIcon, KitPhoto, KitRow,
  KitText, KitTrail, PartContext, useComponentState, usePartContext, useWords, useVariant } from "../../../kit";
import { choreIsDone, choreLines, choreReading } from "../copy";
import { homeWordsFor } from "../lang";
import { z } from "zod";
import { prompt } from "../../../entry/prompt-Chores.generated";
// Core first: Checklist/default ticks today's jobs, not owners, repeats and earned points.
export const meta = {
  id: "Chores",
  status: "ready",
  group: "input",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { done: "people" },
  realPath: "Chores stay on the device; each person ticking their own on another phone needs a shared app.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "outlined"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["repeat", "last"] } },
  items: {
    key: "chores",
    parts: ["root", "title", "who", "photo", "repeat", "last", "next", "points", "done"],
    variants: { mark: ["none", "highlight"] },
  },
  parts: ["root", "message"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["check"], root: ["press"] }, when: { "done.check": { done: false } } },
  read: (input, state, lang): string[] => {
    const { chores, detail } = input as { chores: Parameters<typeof choreReading>[0]; detail: string };
    return state === "filled" ? choreReading(chores, lang, detail === "brief") : [];
  },
} as const satisfies Meta;
export const props = z.strictObject({
  ...variantProps(meta.variants),
  chores: z
    .array(
      z.strictObject({
        ...itemVariantProps(meta.items.variants),
        title: text(28),
        who: text(16),
        photo: photo.optional(),
        repeat: z.enum(repeatOptions),
        every: z.int().min(1).max(12),
        last: isoDate.optional(),
        points: z.number().min(0).max(100).optional(),
        goto: screenId,
      }),
    )
    .min(1)
    .max(6)
    .overwrite((chores) => chores.map((chore) => ({ ...chore, done: choreIsDone(chore) }))),
});
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 6);
  return {
    chores: (items.length ? items : [undefined]).map((item, index) => ({
      title: (item && titleOf(item, 28, thing)) ?? placeholderTitle(index, lang),
      who: (item && detailOf(item, 16, thing)) ?? placeholderTitle(index, lang),
      repeat: "weekly",
      every: 1,
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
  };
}
// prettier-ignore
const plantChores = {
    chores: [
      { title: "Mist the fern", who: "Sam", repeat: "daily", every: 1, last: "2026-11-16", points: 5, goto: "fern" },
      { title: "Dust shelves", who: "Alex", repeat: "weekly", every: 1, points: 10, goto: "shelves" },
    ],
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  plantChores,
  {
    chores: [
      { title: "Wash bowl", who: "Alex", repeat: "daily", every: 1, points: 10, goto: "clover" },
      { title: "Hang leads", who: "Sam", repeat: "never", every: 1, goto: "lead_rack", mark: "highlight" },
      { title: "Wash bed", who: "Mia", repeat: "weekly", every: 1, points: 5, goto: "blanket" },
    ],
  },
  { ...plantChores, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Chores");
export const probes = [
  choose("Shared household jobs with who does each, how often, last done and points for ticking them"),
  choose("Tick off my own three jobs today, without repeats, owners or points", "Checklist"),
  write("Sam mists the fern every day, last done 18 November 2026, earns five points, opens fern details"),
  {
    ...write(
      "Sam mists the fern daily, last done November 18, 2026, for five points. Show the due date but hide the recurrence and last completion.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Mark Sam's misting job done", { address: "c1/r1/done", action: "check" }),
] satisfies Probe[];
type Chore = Props<typeof props, typeof meta>["chores"][number];
// prettier-ignore
function ChoreDetails({ copy, brief }: { copy: ReturnType<typeof choreLines>; brief: boolean }) {
  return (
    <KitGrid>
      <>
        {!brief && <KitText part="repeat" role="caption" tone="muted">{copy.repeat}</KitText>}
        {copy.points && (
          <KitText part="points" role="caption" tone="muted">
            <KitText part={null} role="number" numberScale="compact" tone="muted" tabular>
              {copy.points.count}
            </KitText>
            {copy.points.suffix}
          </KitText>
        )}
      </>
      <>
        <KitText part="next" role="caption" tone={copy.tone}>
          {copy.next}
        </KitText>
        {!brief && copy.last && (
          <KitText part="last" role="caption" tone="muted">
            {copy.last}
          </KitText>
        )}
      </>
    </KitGrid>
  );
}
type ChoresProps = Props<typeof props, typeof meta>;
// prettier-ignore
function ChoreRow({ chore, first, brief, density, marked }: { chore: Chore; first: boolean; brief: boolean; density: ChoresProps["density"]; marked: boolean }) {
  const context = usePartContext();
  const { lang } = useWords(homeWordsFor);
  const copy = choreLines(chore, undefined, lang);
  const { photo, who: label } = chore;
  const avatar = { label, initials: copy.initials, ...(photo ? { photo } : {}) };
  const leading = <KitPhoto part="photo" shape="round" {...avatar} />;
  const done = copy.done ? (
    <KitTrail kind="check" part="done" />
  ) : (
    <KitCheck done={false} label={copy.check} part="done" />
  );
  return (
    <PartContext.Provider value={{ ...context, item: chore.id }}>
      <KitContent group={first || density === "compact" || marked ? "content" : "response"} {...{ density }}>
        <KitRow label={copy.label} inline={!marked} leadingAlign="row" leading={leading} mark={chore.mark} {...{ density }}>
          <KitRow label={copy.label} inline lineRole="heading" trailing={done}>
            <KitRow
              part="root"
              goto={chore.goto}
              label={copy.label}
              inline
              lineRole="heading"
              trailing={<KitIcon name="chevron_right" scale="sm" decorative />}
            >
              <KitText part="title" role="heading">
                {chore.title}
              </KitText>
              <KitText part="who" role="caption" tone="muted">
                {chore.who}
              </KitText>
            </KitRow>
          </KitRow>
          <ChoreDetails {...{ copy, brief }} />
        </KitRow>
      </KitContent>
    </PartContext.Provider>
  );
}

// prettier-ignore
export function Chores(input: ChoresProps) {
  const { chores, surface, detail } = input;
  const density = useVariant("density", meta.variants.density, input.density);
  const marked = chores.some((chore) => chore.mark === "highlight");
  const state = useComponentState();
  const { words } = useWords(homeWordsFor);
  const title = words.choreLabels.complete;
  const success = state === "success" ? ({ icon: "check", tone: "good", title } as const) : {};
  return (
    <KitCard part="root" padded={state === "filled"} {...{ density, surface }}>
      {state === "filled" ? (
        chores.map((chore, index) => <ChoreRow key={chore.id} {...{ chore, density, marked }} first={index === 0} brief={detail === "brief"} />)
      ) : (
        <KitEmpty part="message" decorativeIcon {...success} />
      )}
    </KitCard>
  );
}
