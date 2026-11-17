import { z } from "zod";
import {
  goalLine,
  itemsOf,
  placeholderDetail,
  text,
  thingOf,
  titleOf,
  type CastLike,
  type Meta,
  type Probe,
  type Props,
} from "../catalog";
import { KitCard, KitScaleTrack, KitText } from "../kit";

export const meta = {
  id: "Scale",
  group: "input",
  purpose: "Log a rating or feeling from one to five.",
  pick: "Rate how something went, feels or looks on five ordered levels. Not switching views (Segmented) or entering information in a general input (Field).",
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "A selected level is stored with a record in the on-device database.",
  parts: ["root", "label", "l1", "l2", "l3", "l4", "l5"],
  states: ["filled"],
  actions: {
    parts: { l1: ["select"], l2: ["select"], l3: ["select"], l4: ["select"], l5: ["select"] },
  },
  aliases: ["rating", "mood", "stars", "level"],
  read: (input: unknown) => {
    const { value } = props.parse(input);
    return [`${value} ${goalLine(5)}`];
  },
} as const satisfies Meta;

export const props = z.strictObject({
  style: z.enum(["mood", "stars", "dots"]).default("dots"),
  label: text(32),
  value: z.int().min(0).max(5).default(0),
});

export function fallback({ cast }: { cast: CastLike }): z.input<typeof props> {
  const thing = thingOf(cast);
  const item = itemsOf(cast, 1)[0];
  const styles = ["stars", "dots", "mood"] as const;
  return {
    label: (item && titleOf(item, 32, thing)) || placeholderDetail,
    style: thing?.type ? styles[thing.type.length % styles.length]! : "dots",
    value: 0,
  };
}

export const examples = [
  { label: "How healthy does it look?", style: "mood", value: 3 },
  { label: "How was the walk?", style: "stars", value: 4 },
  { label: "How did it go?", style: "dots", value: 0 },
] satisfies z.input<typeof props>[];

export const probes = [
  {
    kind: "choose",
    need: "Let me rate how today's walk went from one to five stars",
    expect: "Scale",
  },
  {
    kind: "choose",
    need: "Switch the walk schedule between today, this week and all dates, showing one view at a time",
    expect: "Segmented",
  },
  {
    kind: "write",
    brief: "Ask how healthy the plant looks with five faces, starting at three out of five",
    expect: "Scale",
  },
  {
    kind: "read",
    screen: 0,
    task: "Rate it 5",
    expect: { address: "s1/l5", action: "select" },
  },
] satisfies Probe[];

export function Scale({ style, label, value }: Props<typeof props, typeof meta>) {
  const labels = [1, 2, 3, 4, 5].map((level) => `${level} ${goalLine(5)}`) as [
    string,
    string,
    string,
    string,
    string,
  ];
  return (
    <KitCard style="inset" part="root" padded>
      <KitText role="heading" part="label">
        {label}
      </KitText>
      <KitScaleTrack style={style} value={value} labels={labels} />
    </KitCard>
  );
}
