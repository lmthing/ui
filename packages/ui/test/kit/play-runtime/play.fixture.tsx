import { z } from "zod";
import {
  sessionKey,
  sessionState,
  text,
  type Definition,
  type Meta,
  type Props,
  type ScreenLike,
} from "@lmthing/ui/catalog";
import {
  KitAction,
  KitCard,
  KitFlip,
  KitGrid,
  KitText,
  PartScope,
  useControlValue,
  useNestedControls,
  usePartContext,
} from "@lmthing/ui/kit";

const base = {
  group: "input",
  purpose: "Exercise optional controls.",
  pick: "A runtime fixture.",
  region: "body",
  weight: 1,
  tier: "phone",
  realPath: "Retain changes on the device.",
} as const;
const bound = { prop: "value", min: "min", max: "max", step: "step" } as const;
const counterMeta = {
  ...base,
  id: "CounterFixture",
  items: {
    key: "rows",
    parts: ["root", "life", "plus_1", "minus_1", "plus_2", "minus_2"],
    adjust: { "life.increment": { prop: "life", delta: 1, max: 20 } },
    reset: "reset",
    nested: {
      key: "counters",
      parts: { plus: { ...bound, action: "increment" }, minus: { ...bound, action: "decrement" } },
    },
  },
  actions: { parts: { reset: ["press"] }, items: { life: ["increment"] } },
} as const satisfies Meta;
const counterProps = z.strictObject({
  rows: z.array(
    z.strictObject({
      name: text(20),
      life: z.int().min(0).max(20),
      counters: z.array(
        z.strictObject({
          label: text(20),
          value: z.int().min(0).max(20),
          min: z.int(),
          max: z.int(),
          step: z.int(),
        }),
      ),
    }),
  ),
});
const revealMeta = {
  ...base,
  id: "RevealFixture",
  session: { kind: "rounds", items: "rows", hidden: ["secret"], reveal: "show", hide: "veil" },
  actions: { parts: { show: ["start", "stop"] } },
} as const satisfies Meta;
const revealProps = z.strictObject({ rows: z.array(z.strictObject({ name: text(20), secret: text(24) })) });
const def = (meta: Meta, props: Definition["props"]): Definition => ({
  meta,
  props,
  fallback: () => ({}),
  examples: [],
  probes: [],
});
export const defs = {
  CounterFixture: def(counterMeta, counterProps),
  RevealFixture: def(revealMeta, revealProps),
};
export const screen: ScreenLike = {
  id: "play",
  components: [
    {
      id: "counters",
      c: "CounterFixture",
      rows: [
        {
          name: "North",
          life: 7,
          counters: [
            { label: "Coins", value: 1, min: 1, max: 6, step: 3 },
            { label: "Stars", value: 8, min: 0, max: 12, step: 4 },
          ],
        },
        { name: "East", life: 9, counters: [{ label: "Coins", value: 0, min: 0, max: 4, step: 2 }] },
        { name: "South", life: 6, counters: [] },
      ],
    },
    {
      id: "handoff",
      c: "RevealFixture",
      rows: [
        { name: "First", secret: "Private alpha" },
        { name: "Second", secret: "Private beta" },
        { name: "Third", secret: "Private gamma" },
        { name: "Fourth", secret: "Private delta" },
      ],
    },
  ],
};

export function CounterFixture(input: Props<typeof counterProps, typeof counterMeta>) {
  const { controls } = useNestedControls(counterMeta, input);
  const context = usePartContext();
  return (
    <KitCard part="root">
      <KitGrid opposing={[1]} columns={3}>
        {input.rows.map((row, index) => (
          <PartScope key={row.id} {...context} item={row.id}>
            <KitCard {...(index === 0 ? { orientation: "opposing" as const } : {})} part="root">
              <KitText part="name">{row.name}</KitText>
              <KitAction part="life" label={String(row.life)} action="increment" />
              {controls
                .filter(({ target }) => target.startsWith(`${row.id}/`))
                .map(({ part, spec, disabled, item }) => (
                  <KitAction
                    key={part}
                    part={part}
                    label={`${part}: ${item[spec.prop]}`}
                    action={spec.action}
                    disabled={disabled}
                  />
                ))}
            </KitCard>
          </PartScope>
        ))}
      </KitGrid>
      <KitAction part="reset" label="Reset" />
    </KitCard>
  );
}

export function RevealFixture(input: z.output<typeof revealProps>) {
  const { screen, component } = usePartContext();
  const slot = useControlValue<unknown>(`${screen}/${component}/${sessionKey}`, undefined);
  const round = sessionState(revealMeta, input, () => slot);
  if (round?.kind !== "rounds" || round.complete) return <KitText part="root">Done</KitText>;
  return (
    <KitFlip
      target={{ part: "show" }}
      mode="hold"
      flipped={round.revealed}
      label="Hold to reveal"
      front={<KitText part="name">{String(round.item.name)}</KitText>}
      back={<KitText part="secret">{String(round.item.secret)}</KitText>}
    />
  );
}
