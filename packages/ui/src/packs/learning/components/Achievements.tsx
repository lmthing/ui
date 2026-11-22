import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { badgeMilestone, readBadgeMilestones } from "../copy";
import { learningWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Achievements.generated";

// Core first: Streak/default cannot list distinct earned and locked milestones with dates and criteria.
export const meta = {
  id: "Achievements",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  realPath: "Learning milestones are checked on the device.",
  variants: {
    density: ["comfortable", "compact"],
    surface: ["card", "outlined"],
    arrange: ["grid", "rows"],
  },
  writeHints: prompt.writeHints,
  parts: ["root", "empty"],
  items: { key: "badges", parts: ["root", "title", "icon", "earned", "how"] },
  states: ["filled", "empty"],
  actions: { items: { root: ["press"] } },
  emptyActions: [],
  read: (input, state, lang): string[] =>
    state === "filled" ? readBadgeMilestones((input as z.output<typeof props>).badges, lang) : [],
} as const satisfies c.Meta;

export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    badges: z
      .array(
        z.strictObject({
          title: c.text(20),
          icon: c.icon,
          earned: c.isoDate.optional(),
          how: c.text(48).optional(),
        }),
      )
      .min(2)
      .max(12),
  })
  .overwrite((value) => ({
    ...value,
    badges: value.badges.map((badge) => (badge.earned ? { ...badge, how: undefined } : badge)),
  }));

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const items = c.itemsOf(cast, 6);
  return {
    badges: Array.from({ length: Math.max(2, items.length) }, (_, index) => {
      const item = items[index];
      return {
        title: (item && c.titleOf(item, 20, thing)) ?? c.placeholderTitle(index, lang),
        icon: "award",
        how: item && c.detailOf(item, 48, thing),
      };
    }),
  };
}

export const examples = [
  {
    badges: [
      { title: "Fern lesson", icon: "star", earned: "2026-10-04" },
      { title: "Water-wise", icon: "drop", how: "Water quiz: 5/5" },
      { title: "Light finder", icon: "sun", earned: "2026-10-12" },
      { title: "Repotting pro", icon: "leaf", how: "Repot a fern." },
    ],
  },
  {
    badges: [
      { title: "Lead ready", icon: "dog", earned: "2026-09-08" },
      { title: "Route reader", icon: "map", how: "Park quiz: 5/5" },
    ],
  },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("Achievements");
export const probes = [
  choose(
    "Show earned and locked milestone badges as a grid, with the date each was earned or what I have to do to earn it.",
  ),
  choose(
    "Show my twelve consecutive days of studying and the days I studied this week. No badges or milestones.",
    "Streak",
  ),
  write(
    "Give me two badges: First kanji with a star, earned on 2026-10-04, and Radical reader with a drop, unlocked by mastering 20 water-radical characters.",
  ),
  {
    ...write(
      "Show two milestone badges: First kanji with a star, earned on 2026-10-04, and Radical reader with a drop, unlocked by mastering 20 water-radical characters. Put one badge per row, stacked vertically instead of side by side.",
    ),
    variant: { axis: "arrange", value: "rows", itemTitles: ["First kanji", "Radical reader"] },
  },
  read("Open the Water-wise badge to see how to earn it.", { address: "a1/r2", action: "press" }),
] satisfies c.Probe[];

type AchievementsProps = c.Props<typeof props, typeof meta>;

function Badge({
  badge,
  density,
  row,
  lang,
}: {
  badge: AchievementsProps["badges"][number];
  density: c.ThemeDensity;
  row: boolean;
  lang: string;
}) {
  const { id: item, title: label, icon, earned } = badge;
  const { part, text } = badgeMilestone(badge, lang);
  const badgeTone = earned ? "accent" : "muted";
  const detail = (
    <kit.KitText {...{ part, density }} role="caption" align={row ? "start" : "center"} tone="muted">
      {text}
    </kit.KitText>
  );
  if (row)
    return (
      <kit.KitRow
        {...{ item, label, density }}
        part="root"
        role="button"
        leading={<kit.KitIcon name={icon} tone={badgeTone} />}
        lineRole="label"
        inset="none"
      >
        <kit.KitContent density={density}>
          <kit.KitText role="label" part="title" density={density}>
            {label}
          </kit.KitText>
          {detail}
        </kit.KitContent>
      </kit.KitRow>
    );
  return (
    <kit.KitTile {...{ item, label, icon, badgeTone, detail, density }} labelPart="title" action="press" />
  );
}

export function Achievements(input: AchievementsProps) {
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const surface = kit.useVariant("surface", meta.variants.surface, input.surface);
  const arrange = kit.useVariant("arrange", meta.variants.arrange, input.arrange);
  const state = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const { words, lang } = kit.useWords(learningWordsFor);
  return (
    <kit.KitCard part="root" padded {...{ density, surface }}>
      {state === "empty" ? (
        <kit.KitEmpty
          icon="award"
          part="empty"
          title={thing ? c.emptyLine(thing, lang) : words.achievements.empty}
          decorativeIcon
        />
      ) : (
        <kit.KitGrid {...{ density, arrange }} list>
          {input.badges.map((badge) => (
            <Badge key={badge.id} {...{ badge, density, lang }} row={arrange === "rows"} />
          ))}
        </kit.KitGrid>
      )}
    </kit.KitCard>
  );
}
