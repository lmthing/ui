import {
  isoDate,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  repeatOptions,
  screenId,
  text,
  thingOf,
  titleOf,
  detailOf,
  type FallbackInput,
  type Meta,
  type Probe,
  type Props,
} from "../../../catalog";
import {
  KitCard,
  KitCheck,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitPhoto,
  KitRow,
  KitText,
  KitTrail,
  PartContext,
  useComponentState,
  usePartContext,
  useWords,
} from "../../../kit";
import { choreIsDone, choreLines, choreReading } from "../copy";
import { homeWordsFor } from "../lang";
import { z } from "zod";
// Core first: Checklist/default ticks today's jobs, not owners, repeats and earned points.
export const meta = {
  id: "Chores",
  status: "ready",
  group: "input",
  purpose: "Share recurring household jobs with owners and points earned for completing them.",
  pick: "Shared household jobs with an owner, a repeat and optional points. Not one person's jobs today (Checklist), staff shifts (Shift), or recurring care for a pet or plant (CareSchedule).",
  writeHints: [
    "Write last completion, repeat and every, never next due, overdue or done-for-now. Completion awards points and advances the due date in code.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  partTiers: { done: "people" },
  realPath: "Chores stay on the device; each person ticking their own on another phone needs a shared app.",
  items: {
    key: "chores",
    parts: ["root", "title", "who", "photo", "repeat", "last", "next", "points", "done"],
  },
  parts: ["root", "message"],
  states: ["filled", "empty", "success"],
  actions: { items: { done: ["check"], root: ["press"] }, when: { "done.check": { done: false } } },
  read: (input, state, lang) =>
    state === "filled" ? choreReading((input as z.output<typeof props>).chores, lang) : [],
} as const satisfies Meta;
export const props = z.strictObject({
  chores: z
    .array(
      z.strictObject({
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
export const examples = [
  {
    chores: [
      { title: "Mist the fern", who: "Sam", photo: "lib:people", repeat: "daily", every: 1, last: "2026-11-16", points: 5, goto: "fern" },
      { title: "Dust shelves", who: "Alex", repeat: "weekly", every: 1, points: 10, goto: "shelves" },
    ],
  },
  {
    chores: [
      { title: "Wash dog bowl", who: "Alex", photo: "lib:people", repeat: "weekly", every: 2, last: "2026-11-15", points: 10, goto: "clover" },
      { title: "Hang lead rack", who: "Sam", repeat: "never", every: 1, last: "2026-11-17", goto: "lead_rack" },
    ],
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Chores");
export const probes = [
  choose("Shared household jobs with who does each, how often, last done and points for ticking them"),
  choose("Tick off my own three jobs today, without repeats, owners or points", "Checklist"),
  write("Sam mists the fern every day, last done 18 November 2026, earns five points, opens fern details"),
  read("Mark Sam's misting job done", { address: "c1/r1/done", action: "check" }),
] satisfies Probe[];
type Chore = Props<typeof props, typeof meta>["chores"][number];
function ChoreDetails({ copy }: { copy: ReturnType<typeof choreLines> }) {
  return (
    <KitGrid>
      <>
        <KitText part="repeat" role="caption" tone="muted">
          {copy.repeat}
        </KitText>
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
        {copy.last && (
          <KitText part="last" role="caption" tone="muted">
            {copy.last}
          </KitText>
        )}
      </>
    </KitGrid>
  );
}
function ChoreRow({ chore, first }: { chore: Chore; first: boolean }) {
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
      <KitContent group={first ? "content" : "response"}>
        <KitRow label={copy.label} inline leadingAlign="row" leading={leading}>
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
          <ChoreDetails copy={copy} />
        </KitRow>
      </KitContent>
    </PartContext.Provider>
  );
}

export function Chores({ chores }: Props<typeof props, typeof meta>) {
  const state = useComponentState();
  const { words } = useWords(homeWordsFor);
  const title = words.choreLabels.complete;
  const success = state === "success" ? ({ icon: "check", tone: "good", title } as const) : {};
  return (
    <KitCard part="root" padded={state === "filled"}>
      {state === "filled" ? (
        chores.map((chore, index) => <ChoreRow key={chore.id} chore={chore} first={index === 0} />)
      ) : (
        <KitEmpty part="message" decorativeIcon {...success} />
      )}
    </KitCard>
  );
}
