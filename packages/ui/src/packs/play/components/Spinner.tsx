import { z } from "zod";
import * as c from "../../../catalog";
import * as kit from "../../../kit";
import { spinnerLines } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Choice/default cannot draw an equal-probability random option or exhaust a draw pool.
// prettier-ignore
export const meta = {
  id: "Spinner", status: "ready", group: "action",
  purpose: "Draw one named option at random, with or without repeats.",
  pick: "Pick one labelled option randomly. Not deliberate choices (Choice, Chips), numbered dice (Dice), balanced teams (TeamPicker), or votes (Poll).",
  writeHints: [
    "Write 2–6 distinct option labels. Never write selected index, used options, remaining count or stored draws.",
    "To hide only the draw-pool legend write {\"detail\":\"brief\"}; keep every option label.",
  ],
  region: "body", weight: 2, tier: "phone",
  confirmParts: ["reset"],
  realPath: "Equal-probability draws are stored on the device; without repeats each option is used once.",
  variants: { detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["pool", "label"] } },
  items: { key: "options", parts: ["root", "label"] },
  parts: ["root", "pool", "wheel", "result", "empty", "spin", "spin_label", "reset", "reset_label"],
  states: ["empty", "filled", "loading", "success"],
  actions: { parts: { spin: ["press"], reset: ["press"] }, when: { reset: { repeat: false } } },
  emptyActions: ["spin.press"],
  draw: { kind: "pick", press: "spin", pool: "options", repeat: "repeat", reset: "reset" },
  read: (input, _state, lang): string[] => {
    const { options, repeat, detail, [c.drawKey]: result } = input as z.output<typeof props> & { [c.drawKey]?: c.DrawState };
    const { status, selected, spin, reset } = spinnerLines(options, repeat, result, lang);
    return [
      detail === "brief" ? undefined : playWordsFor(lang).spinner.pool,
      status,
      selected,
      spin,
      reset,
    ].filter((line) => line !== undefined);
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
const plantOptions = [{ label: "Leaves" }, { label: "Flowers" }, { label: "Seeds" }];
export const examples = [
  // Ledge's plant-themed random challenge.
  { options: plantOptions, style: "wheel" },
  // Trot's game-night challenges are drawn once each.
  { options: [{ label: "Mime" }, { label: "Sketch" }, { label: "Riddle" }], repeat: false, style: "strip" },
  { options: plantOptions, detail: "brief" },
  { options: plantOptions },
  { options: plantOptions },
  { options: plantOptions },
] satisfies z.input<typeof props>[];
const { choose, write, read } = c.probesFor("Spinner");
export const probes = [
  choose("Spin to draw one named challenge randomly; remove it from the pool until reset"),
  choose("Let me deliberately choose a plan from three explained options, without randomness", "Choice"),
  write("A sliding strip draws Mime, Sketch or Riddle at random, without repeats"),
  {
    ...write(
      "Spin a wheel for Mime, Sketch or Riddle. Only show the labels on the wheel, without a separate draw-pool legend.",
    ),
    variant: { axis: "detail", value: "brief" },
  },
  read("Spin for a random option", { address: "s1/spin", action: "press" }),
  read("Restore all options to the draw pool", { address: "s1/reset", action: "press" }, 1),
] satisfies c.Probe[];

type Setup = c.Props<typeof props, typeof meta>;
type Lines = ReturnType<typeof spinnerLines>;

// prettier-ignore
function SpinnerOptions({ options, density, loading, empty, title }: {
  options: (Setup["options"][number] & { disabled: boolean })[];
  density: c.ThemeDensity; loading: boolean; empty: boolean; title: string;
}) {
  const scope = kit.usePartContext();
  const bar = (label: string) => (
    <kit.KitSkeleton shape="figure" inset="none" content={[["caption", label, "center"]]} />
  );
  return (
    <kit.KitContent density={density} group={empty ? "response" : "content"}>
      {loading ? (
        bar(title)
      ) : (
        <kit.KitText part="pool" role="caption" align="center">
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
  lines: Lines; loading: boolean; density: c.ThemeDensity; empty: boolean;
}) {
  const { selected, status, spin, reset, exhausted } = lines;
  const group = density === "compact" ? "content" : "response";
  return (
    <kit.KitContent {...{ group, density }}>
      {loading ? (
        <kit.KitSkeleton shape="figure" inset="none" content={[["caption", status, "center"]]} />
      ) : !empty && (
        <>
          {selected && (
            <kit.KitText part="result" role="title" align="center">
              {selected}
            </kit.KitText>
          )}
          <kit.KitText part={null} tone="muted" role="caption" align="center">{status}</kit.KitText>
        </>
      )}
      <kit.KitContent group={empty ? "content" : group} density={density}>
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

// prettier-ignore
export function Spinner(setup: Setup) {
  const { screen, component, thing } = kit.usePartContext();
  const state = kit.useComponentState();
  const { lang, words } = kit.useWords(playWordsFor);
  const density = kit.useKit().density;
  const saved = kit.useControlValue<unknown>(`${screen}/${component}/${c.drawKey}`, undefined);
  const draw = c.drawState(meta, setup, () => saved);
  const index = draw?.kind === "pick" ? draw.index : undefined;
  const used = draw?.kind === "pick" ? draw.used : [];
  const at = index === undefined ? undefined : setup.options[index]?.id;
  const options = setup.options.map((option, i) => ({ ...option, disabled: used.includes(i) }));
  const drawing = options.map((option) => (option.id === at ? { ...option, disabled: false } : option));
  const rotation = index === undefined ? 0 : setup.repeat ? index + 1 : used.length;
  const loading = state === "loading";
  const empty = state === "empty";
  const lines = spinnerLines(options, setup.repeat, draw, lang);
  return (
    <kit.KitCard part="root" padded {...{ density, surface: "card" }}>
      {empty && (
        <kit.KitText part="empty" role="title" align="center">
          {thing ? c.emptyLine(thing, lang) : words.spinner.empty}
        </kit.KitText>
      )}
      {setup.detail !== "brief" && (
        <SpinnerOptions {...{ options, density, loading, empty }} title={words.spinner.pool} />
      )}
      <kit.KitWheel part="wheel" style={setup.style} options={drawing} {...{ loading, rotation }} {...(at && { at })} />
      <SpinnerResponse {...{ loading, lines, density, empty }} />
    </kit.KitCard>
  );
}
