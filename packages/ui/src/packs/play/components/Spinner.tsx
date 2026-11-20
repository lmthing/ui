import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { spinnerLines } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Choice/default cannot draw an equal-probability random option or exhaust a draw pool.
export const meta = {
  id: "Spinner",
  status: "ready",
  group: "action",
  purpose: "Draw one named option at random, with or without repeats.",
  pick: "Pick one labelled option randomly. Not deliberate choices (Choice, Chips), numbered dice (Dice), balanced teams (TeamPicker), or votes (Poll).",
  writeHints: [
    "Write 2–6 distinct option labels. Never write selected index, used options, remaining count or stored draws.",
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  confirmParts: ["reset"],
  realPath: "Equal-probability draws are stored on the device; without repeats each option is used once.",
  variants: { density: ["comfortable", "compact"], surface: ["card", "plain", "outlined"] },
  items: { key: "options", parts: ["root", "label"] },
  parts: ["root", "wheel", "result", "empty", "spin", "spin_label", "reset", "reset_label"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { spin: ["press"], reset: ["press"] }, when: { reset: { repeat: false } } },
  emptyActions: ["spin.press"],
  draw: { kind: "pick", press: "spin", pool: "options", repeat: "repeat", reset: "reset" },
  read: (input, _state, lang) => {
    const {
      options,
      repeat,
      [c.drawKey]: result,
    } = input as z.output<typeof props> & {
      [c.drawKey]?: c.DrawState;
    };
    const { status, selected, spin, reset } = spinnerLines(options, repeat, result, lang);
    return [playWordsFor(lang).spinner.pool, status, selected, spin, reset].filter(
      (line) => line !== undefined,
    );
  },
} as const satisfies c.Meta;
export const props = z
  .strictObject({
    ...c.variantProps(meta.variants),
    options: z
      .array(z.strictObject({ label: c.text(24) }))
      .min(2)
      .max(6),
    repeat: z.boolean().default(true),
    style: z.enum(["wheel", "strip"]).default("wheel"),
  })
  .refine(
    ({ options }) => new Set(options.map((option) => option.label.toLowerCase())).size === options.length,
    {
      path: ["options"],
      message: "Option labels must be distinct",
    },
  );
export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast);
  const labels = c
    .itemsOf(cast, 6)
    .map((item, index) => c.titleOf(item, 24, thing) ?? c.placeholderTitle(index, lang));
  const options = [...new Map(labels.map((label) => [label.toLowerCase(), { label }])).values()];
  for (let index = 0; options.length < 2; index++) {
    const label = c.placeholderTitle(index, lang);
    if (!options.some((option) => option.label.toLowerCase() === label.toLowerCase()))
      options.push({ label });
  }
  return { options };
}
export const examples = [
  // Ledge's plant-themed random challenge.
  { options: [{ label: "Leaves" }, { label: "Flowers" }, { label: "Seeds" }], style: "wheel" },
  // Trot's game-night challenges are drawn once each.
  { options: [{ label: "Mime" }, { label: "Sketch" }, { label: "Riddle" }], repeat: false, style: "strip" },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Spinner");
export const probes = [
  choose("Spin to draw one named challenge randomly; remove it from the pool until reset"),
  choose("Let me deliberately choose a plan from three explained options, without randomness", "Choice"),
  write("A sliding strip draws Mime, Sketch or Riddle at random, without repeats"),
  read("Spin for a random option", { address: "s1/spin", action: "press" }),
  read("Restore all options to the draw pool", { address: "s1/reset", action: "press" }, 1),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type Lines = ReturnType<typeof spinnerLines>;

function SpinnerOptions({
  options,
  density,
  loading,
  title,
}: {
  options: (Setup["options"][number] & { disabled: boolean })[];
  density: Setup["density"];
  loading: boolean;
  title: string;
}) {
  const scope = kit.usePartContext();
  const bar = (label: string) => (
    <kit.KitSkeleton shape="figure" inset="none" content={[["caption", label, "center"]]} />
  );
  return (
    <kit.KitContent density={density}>
      {loading ? (
        bar(title)
      ) : (
        <kit.KitText part={null} role="caption" align="center">
          {title}
        </kit.KitText>
      )}
      <kit.KitGrid columns={options.length % 2 === 0 && options.length <= 4 ? 2 : 3} density={density}>
        {options.map(({ id, label, disabled }) => (
          <kit.PartScope key={id} {...scope} item={id}>
            {loading ? (
              bar(label)
            ) : (
              <kit.KitText part="label" role="caption" align="center" tone="muted" strike={disabled}>
                {label}
              </kit.KitText>
            )}
          </kit.PartScope>
        ))}
      </kit.KitGrid>
    </kit.KitContent>
  );
}

// prettier-ignore
function SpinnerResponse({ lines, loading, density, empty }: {
  lines: Lines; loading: boolean; density: Setup["density"]; empty?: string;
}) {
  const { selected, status, spin, reset, exhausted } = lines;
  const group = density === "compact" ? "content" : "response";
  return (
    <kit.KitContent {...{ group, density }}>
      {loading ? (
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", status, "center"]]} />
      ) : empty ? (
        <kit.KitContent group={group}>
          <kit.KitText part="empty" role="heading" align="center">{empty}</kit.KitText>
        </kit.KitContent>
      ) : (
        <>
          {selected && (
            <kit.KitText part="result" role="title" align="center">
              {selected}
            </kit.KitText>
          )}
          <kit.KitText part={null} tone="muted" role="caption" align="center">{status}</kit.KitText>
        </>
      )}
      <kit.KitContent {...{ group, density }}>
        {loading ? <kit.KitSkeleton shape="control" label={spin} full /> : (
          <kit.KitAction part="spin" action="press" label={spin} kind={selected ? "secondary" : "primary"} disabled={exhausted} full />
        )}
        {reset && !empty && (loading ? <kit.KitSkeleton shape="control" label={reset} kind="quiet" full /> : (
          <kit.KitAction part="reset" action="press" label={reset} kind="quiet" full />
        ))}
      </kit.KitContent>
    </kit.KitContent>
  );
}

export function Spinner(setup: Setup) {
  const { screen, component, thing } = kit.usePartContext();
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(playWordsFor);
  const density = kit.useVariant("density", meta.variants.density, setup.density);
  const saved = kit.useControlValue<unknown>(`${screen}/${component}/${c.drawKey}`, undefined);
  const draw = c.drawState(meta, setup, () => saved);
  const index = draw?.kind === "pick" ? draw.index : undefined;
  const used = draw?.kind === "pick" ? draw.used : [];
  const at = index === undefined ? undefined : setup.options[index]?.id;
  const options = setup.options.map((option, i) => ({ ...option, disabled: used.includes(i) }));
  const drawing = options.map((option) => (option.id === at ? { ...option, disabled: false } : option));
  const rotation = index === undefined ? 0 : setup.repeat ? index + 1 : used.length;
  const loading = state === "loading";
  const lines = spinnerLines(options, setup.repeat, draw, lang);
  return (
    <kit.KitCard part="root" padded {...{ density, surface: setup.surface }}>
      <SpinnerOptions {...{ options, density, loading }} title={words.spinner.pool} />
      <kit.KitWheel
        part="wheel"
        style={setup.style}
        options={drawing}
        {...{ loading, rotation }}
        {...(at && { at })}
      />
      <SpinnerResponse
        {...{ loading, lines, density }}
        {...(state === "empty" && { empty: thing ? c.emptyLine(thing, lang) : words.spinner.empty })}
      />
    </kit.KitCard>
  );
}
