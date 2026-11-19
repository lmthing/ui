import { z } from "zod";
import {
  icon,
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  screenId,
  text,
  thingOf,
  titleOf,
} from "../../../catalog";
import type { FallbackInput, Meta, Probe, Props } from "../../../catalog";
import {
  KitAction,
  KitCard,
  KitContent,
  KitEmpty,
  KitGrid,
  KitIcon,
  KitJar,
  KitPhoto,
  KitText,
  PartScope,
  useComponentState,
  usePartContext,
  useWords,
} from "../../../kit";
import { rewardAmount, rewardJarRatio, rewardReading } from "../copy";
import { homeWordsFor } from "../lang";

// Core first: Ring/md tracks one goal, not children's points spent on claimable prizes.
export const meta = {
  id: "Rewards",
  status: "ready",
  group: "data",
  purpose: "Keep children's earned points or pocket money and claim prizes they can afford.",
  pick: "Children's points earned and spent on prizes with costs. Not one person's goal (Ring), a business stamp card (Loyalty), or milestone badges (Achievements).",
  writeHints: [
    "Write stored points and prize costs as nonnegative numbers. Claimability and balances after a claim are computed, never written. money means pocket money; never write a currency.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A parent keeps points and prize claims on the device.",
  items: {
    key: "entries",
    parts: ["root", "jar", "name", "photo", "points", "unit", "title", "cost", "icon", "claim"],
  },
  parts: ["root", "heading", "shelf", "message"],
  confirmParts: ["claim"],
  states: ["filled", "success"],
  actions: {
    items: { root: ["press"], claim: ["press"] },
    when: { root: { entryKind: "kid" }, claim: { entryKind: "prize", claimable: true } },
  },
  read: (input, state, lang?: string) => {
    const { entries, money } = input as z.output<typeof props>;
    return rewardReading(entries, money, state, lang);
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
export const examples = [
  {
    kids: [{ name: "Mia", photo: "lib:people", points: 20, goto: "mia" }],
    prizes: [
      { title: "Choose a new plant", cost: 15, icon: "leaf" },
      { title: "Paint a planter", cost: 30, icon: "star" },
    ],
    money: false,
  },
  {
    kids: [{ name: "Leo", points: 8.5, goto: "leo" }, { name: "Avery", photo: "lib:people", points: 4, goto: "avery" }],
    prizes: [
      { title: "Dog park picnic", cost: 5, icon: "heart" },
      { title: "Pick a dog toy", cost: 10, icon: "star" },
    ],
    money: true,
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("Rewards");
export const probes = [
  choose("Children earn points and spend them on a shelf of prizes with costs and a claim button"),
  choose("Show how far I am toward one goal of twenty walks", "Ring"),
  write("Mia has twenty points, can claim Choose a new plant for fifteen points, her details are mia"),
  read("Claim Choose a new plant", { address: "r1/r2/claim", action: "press" }),
] satisfies Probe[];

type RewardsProps = Props<typeof props, typeof meta>;
type Entry<K> = Extract<RewardsProps["entries"][number], { entryKind: K }>;

type JarProps = { kid: Entry<"kid">; target: number; money: boolean; compact: boolean };
function RewardJar({ kid, target, money, compact }: JarProps) {
  const context = usePartContext();
  const { lang, words } = useWords(homeWordsFor);
  const { value, unit, label } = rewardAmount(kid.points, money, lang);
  const portrait = kid.photo ? { photo: kid.photo } : { initials: Array.from(kid.name)[0] ?? "" };
  const numberScale = compact ? "compact" : "display";
  return (
    <PartScope {...context} item={kid.id}>
      <KitCard style="plain" part="root" goto={kid.goto} label={words.rewardEntry(kid.name, label)}>
        <KitJar part="jar" ratio={rewardJarRatio(kid.points, target)} label={label}>
          <KitPhoto {...portrait} shape="avatar" part="photo" label={kid.name} />
          <KitText role="number" {...{ numberScale }} align="center" part="points" children={value} />
          {unit && <KitText role="label" tone="muted" align="center" part="unit" children={unit} />}
        </KitJar>
        <KitText role="body" align="center" part="name" lines={1} children={kid.name} />
      </KitCard>
    </PartScope>
  );
}

function RewardPrize({ prize, money }: { prize: Entry<"prize">; money: boolean }) {
  const context = usePartContext();
  const { lang, words } = useWords(homeWordsFor);
  const cost = rewardAmount(prize.cost, money, lang).label;
  const claim = { label: words.rewardLabels.claim, disabled: !prize.claimable };
  return (
    <PartScope {...context} item={prize.id}>
      <KitCard part="root" style="plain">
        <KitGrid fitLast>
          <KitContent
            lead={<KitIcon name={prize.icon} part="icon" scale="sm" tone="muted" />}
            lineRole="body"
          >
            <KitText role="label" part="title" children={prize.title} />
            <KitText role="label" tone="muted" part="cost" children={cost} />
          </KitContent>
          <KitAction part="claim" kind="secondary" {...claim} full />
        </KitGrid>
      </KitCard>
    </PartScope>
  );
}

export function Rewards({ entries, money }: RewardsProps) {
  const state = useComponentState();
  const { lang, words } = useWords(homeWordsFor);
  if (state === "success")
    return (
      <KitCard part="root">
        <KitEmpty part="message" title={words.rewardLabels.success} icon="check" tone="good" decorativeIcon />
      </KitCard>
    );
  const prizes = entries.filter((entry) => entry.entryKind === "prize");
  const target = Math.max(0, ...prizes.map(({ cost }) => cost));
  const kids = entries.filter((entry) => entry.entryKind === "kid");
  const compact = kids.some(({ points }) => rewardAmount(points, money, lang).value.length > 4);
  const jars = kids.map((kid) => <RewardJar key={kid.id} {...{ kid, target, money, compact }} />);
  const shelf = prizes.map((prize) => <RewardPrize key={prize.id} {...{ prize, money }} />);
  return (
    <KitCard part="root" padded>
      <KitText role="body" tone="muted" part="heading" children={words.rewardLabels.heading} />
      {jars.length === 1 ? jars : <KitGrid>{jars}</KitGrid>}
      <KitCard part="shelf" style="cards" children={shelf} />
    </KitCard>
  );
}
