import { z } from "zod";
// prettier-ignore
import { icon, itemsOf, photo, screenId, text, placeholderTitle, probesFor,
  thingOf, titleOf, type FallbackInput, type Meta, type Probe, type Props,
  variantProps,
} from "../../../catalog";
// prettier-ignore
import { KitAction, KitCard, KitContent, KitEmpty, KitGrid, KitIcon, KitJar, KitPhoto,
  KitText, PartScope, useComponentState, usePartContext, useWords } from "../../../kit";
import { rewardAmount, rewardBalanceParts, rewardJarRatio, rewardReading, rewardShortfall } from "../copy";
import { homeWordsFor } from "../lang";
import { prompt } from "../../../entry/prompt-Rewards.generated";
// Core first: Progress/ring tracks one goal, not children's points spent on claimable prizes.
export const meta = {
  id: "Rewards",
  status: "ready",
  group: "data",
  purpose: prompt.purpose,
  pick: prompt.pick,
  writeHints: prompt.writeHints,
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A parent keeps points and prize claims on the device.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["reason"] } },
  items: {
    key: "entries",
    parts: ["root", "jar", "name", "photo", "points", "unit", "title", "cost", "icon", "claim", "reason"],
  },
  parts: ["root", "heading", "shelf", "message"],
  confirmParts: ["claim"],
  states: ["filled", "success"],
  actions: {
    items: { root: ["press"], claim: ["press"] },
    when: { root: { entryKind: "kid" }, claim: { entryKind: "prize", claimable: true } },
  },
  read: (input, state, lang): string[] => {
    const { entries, money, detail } = input as z.output<typeof props>;
    return rewardReading(entries, money, state, lang, detail === "brief");
  },
} as const satisfies Meta;
const kidProps = z.strictObject({
  name: text(16),
  photo: photo.optional(),
  points: z.number().min(0),
  goto: screenId,
});
const prizeProps = z.strictObject({ title: text(24), cost: z.number().min(0), icon });
const schema = z.strictObject({
  ...variantProps(meta.variants),
  kids: z.array(kidProps).min(1).max(4),
  prizes: z.array(prizeProps).min(1).max(6),
  money: z.boolean().default(false),
});
const withEntries = (value: z.output<typeof schema>) => ({
  ...value,
  entries: [
    ...value.kids.map((kid) => ({ ...kid, entryKind: "kid" as const })),
    ...value.prizes.map((prize) => ({
      ...prize,
      entryKind: "prize" as const,
      claimable: value.kids.some((kid) => kid.points >= prize.cost),
    })),
  ],
});
export const props = schema.overwrite(withEntries) as typeof schema &
  z.ZodType<ReturnType<typeof withEntries>, z.input<typeof schema>>;
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast),
    items = itemsOf(cast, 4);
  return {
    kids: (items.length ? items : [undefined]).map((item, index) => ({
      name: (item && titleOf(item, 16, thing)) ?? placeholderTitle(index, lang),
      points: 0,
      goto: item && screenId.safeParse(item.id).success ? item.id : "detail",
    })),
    prizes: [{ title: placeholderTitle(0, lang), cost: 1, icon: "star" }],
    money: false,
  };
}
// prettier-ignore
const plantRewards = {
    kids: [{ name: "Mia", points: 20, goto: "mia" }],
    prizes: [
      { title: "Choose a new plant", cost: 15, icon: "leaf" },
      { title: "Paint a planter", cost: 30, icon: "star" },
    ],
    money: false,
} satisfies z.input<typeof props>;
// prettier-ignore
export const examples = [
  plantRewards,
  {
    kids: [{ name: "Leo", points: 8.5, goto: "leo" }, { name: "Avery", photo: "lib:people", points: 4, goto: "avery" }],
    prizes: [
      { title: "Dog park picnic", cost: 5, icon: "heart" },
      { title: "Pick a dog toy", cost: 10, icon: "star" },
    ],
    money: true,
  },
  { ...plantRewards, detail: "brief" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Rewards");
export const probes = [
  choose("Children earn points and spend them on a shelf of prizes with costs and a claim button"),
  choose("Show how far I am toward one goal of twenty walks", "Progress"),
  write("Mia has twenty points, can claim Choose a new plant for fifteen points, her details are mia"),
  {
    ...write(
      "Mia has 20 points and a new planter costs 30 points. Show the prize cost but don't display how many more points she needs.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Claim Choose a new plant", { address: "r1/r2/claim", action: "press" }),
] satisfies Probe[];

type RewardsProps = Props<typeof props, typeof meta>;
type Entry<K> = Extract<RewardsProps["entries"][number], { entryKind: K }>;

type Balance = ReturnType<typeof rewardAmount> & ReturnType<typeof rewardBalanceParts>;
type JarProps = { kid: Entry<"kid">; target: number; balance: Balance; compact: boolean };
function RewardJar({ kid, target, balance, compact }: JarProps) {
  const context = usePartContext();
  const { words } = useWords(homeWordsFor);
  const { value, unit, label, major, minor } = balance;
  const portrait = kid.photo ? { photo: kid.photo } : { initials: Array.from(kid.name)[0] ?? "" };
  const numberScale = compact ? "compact" : "display";
  const cents = <KitText key="fraction" role="body" part={null} children={minor} />;
  const figure = compact || !minor ? value : [major, cents];
  return (
    <PartScope {...context} item={kid.id}>
      <KitCard style="plain" part="root" goto={kid.goto} label={words.rewardEntry(kid.name, label)}>
        <KitJar part="jar" ratio={rewardJarRatio(kid.points, target)} label={label}>
          <KitPhoto {...portrait} shape="avatar" part="photo" label={kid.name} />
          <KitText role="number" {...{ numberScale }} align="center" part="points" children={figure} />
          {unit && <KitText role="label" tone="muted" align="center" part="unit" children={unit} />}
        </KitJar>
        <KitText role="body" align="center" part="name" lines={1} children={kid.name} />
      </KitCard>
    </PartScope>
  );
}

// prettier-ignore
function RewardPrize({ prize, money, best, brief }: { prize: Entry<"prize">; money: boolean; best: number; brief: boolean }) {
  const context = usePartContext();
  const { lang, words } = useWords(homeWordsFor);
  const cost = rewardAmount(prize.cost, money, lang).label;
  const claim = { label: brief && !prize.claimable ? words.rewardLabels.unavailable : words.rewardLabels.claim, disabled: !prize.claimable };
  const reason = brief ? undefined : rewardShortfall(prize.cost, best, money, lang);
  const lead = <KitIcon name={prize.icon} part="icon" scale="sm" tone="muted" />;
  return (
    <PartScope {...context} item={prize.id}>
      <KitCard part="root" style="plain">
        <KitGrid fitLast>
          <KitContent lead={lead} lineRole="body">
            <KitText role="label" part="title" children={prize.title} />
            <KitText role="label" tone="muted" part="cost" children={cost} />
            {reason && <KitText role="label" tone="muted" part="reason" children={reason} />}
          </KitContent>
          <KitAction part="claim" kind={claim.disabled ? "quiet" : "secondary"} {...claim} full />
        </KitGrid>
      </KitCard>
    </PartScope>
  );
}

export function Rewards({ entries, money, detail }: RewardsProps) {
  const surface = "card";
  const state = useComponentState();
  const { lang, words } = useWords(homeWordsFor);
  if (state === "success")
    return (
      <KitCard part="root" {...{ surface }}>
        <KitEmpty part="message" title={words.rewardLabels.success} icon="check" tone="good" decorativeIcon />
      </KitCard>
    );
  const prizes = entries.filter((entry) => entry.entryKind === "prize");
  const target = Math.max(0, ...prizes.map(({ cost }) => cost));
  const kids = entries.filter((entry) => entry.entryKind === "kid");
  const balances = kids.map((kid) => {
    const amount = rewardAmount(kid.points, money, lang);
    return { kid, balance: { ...amount, ...rewardBalanceParts(amount.value, money, lang) } };
  });
  const compact = balances.some(({ balance }) => balance.compact);
  const best = Math.max(...kids.map(({ points }) => points));
  const jars = balances.map(({ kid, balance }) => (
    <RewardJar key={kid.id} {...{ kid, target, balance, compact }} />
  ));
  const brief = detail === "brief";
  const shelf = prizes.map((prize) => <RewardPrize key={prize.id} {...{ prize, money, best, brief }} />);
  return (
    <KitCard part="root" padded {...{ surface }}>
      <KitText role="body" tone="muted" part="heading" children={words.rewardLabels.heading} />
      {jars.length === 1 ? jars : <KitGrid>{jars}</KitGrid>}
      <KitCard part="shelf" style="cards" children={shelf} />
    </KitCard>
  );
}
