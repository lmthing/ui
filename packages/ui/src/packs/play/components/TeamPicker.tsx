import { z } from "zod";
// prettier-ignore
import {
  drawKey, drawState, drawStatus, emptyLine, itemsOf, itemVariantProps, photo,
  placeholderTitle, probesFor, text, thingOf, titleOf, variantProps,
  type DrawState, type FallbackInput, type Meta, type Probe, type Props,
} from "../../../catalog";
import * as kit from "../../../kit";
import { teamPickerCopy, teamPickerReading } from "../copy";
import { playWordsFor } from "../lang";

// Core first: Choice/multi cannot randomly divide everyone into balanced teams with locked placements.
export const meta = {
  id: "TeamPicker",
  status: "ready",
  group: "input",
  purpose: "Split players into balanced random teams while preserving optional locked placements.",
  pick: "Randomly allocate every player to balanced named teams with optional locks. Not deliberate selection (Choice[multi]), one random option (Spinner), or sports positions (Squad, Lineup).",
  writeHints: [
    "Write 2–12 players and 2–4 distinct team labels, no more teams than players. Optional player.team is a zero-based locked index. Never write unlocked assignments, sizes or feasibility; impossible locks are runtime errors, not uneven teams.",
    'Use arrange "rows" for stacked teams with group headings. Leave unrequested axes null; locked placement is not a mark.',
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  confirmParts: ["remake"],
  realPath: "The device saves the roster, locked placements and a random balanced allocation.",
  items: {
    key: "players",
    parts: ["root", "name", "photo", "team"],
    variants: { mark: ["none", "highlight"] },
  },
  variants: { density: ["comfortable", "compact"], arrange: ["strip", "rows"] },
  parts: ["root", "teams", "make", "make_label", "remake", "remake_label", "empty", "error", "sub"],
  states: ["empty", "filled", "loading", "success", "error"],
  actions: { parts: { make: ["press"], remake: ["press"] } },
  emptyActions: ["make.press"],
  draw: {
    kind: "partition",
    press: "make",
    redraw: "remake",
    players: "players",
    teams: "teams",
    locked: "team",
  },
  read: (input, _state, lang): string[] => {
    const setup = input as z.output<typeof props> & { [drawKey]?: DrawState };
    return teamPickerReading(setup, setup[drawKey], lang);
  },
} as const satisfies Meta;
export const props = z
  .strictObject({
    ...variantProps(meta.variants),
    players: z
      .array(
        z.strictObject({
          ...itemVariantProps(meta.items.variants),
          name: text(24),
          photo: photo.optional(),
          team: z.int().min(0).max(3).optional(),
        }),
      )
      .min(2)
      .max(12),
    teams: z
      .array(z.strictObject({ label: text(16) }))
      .min(2)
      .max(4),
  })
  .refine(
    ({ players, teams }) =>
      teams.length <= players.length &&
      players.every((player) => player.team === undefined || player.team < teams.length) &&
      new Set(teams.map((team) => team.label.toLowerCase())).size === teams.length,
    {
      message: "Teams need distinct labels, at most one per player, and valid locked indices",
    },
  );
export function fallback({ cast, lang }: FallbackInput): z.input<typeof props> {
  const thing = thingOf(cast);
  const players = itemsOf(cast, 6).map((item, index) => ({
    name: titleOf(item, 24, thing) ?? placeholderTitle(index, lang),
  }));
  while (players.length < 2) players.push({ name: placeholderTitle(players.length, lang) });
  return { players, teams: [{ label: placeholderTitle(0, lang) }, { label: placeholderTitle(1, lang) }] };
}
export const examples = [
  // Ledge's friends keep two players together.
  {
    players: [
      { name: "Anna", photo: "lib:people", team: 0 },
      { name: "Ben", team: 0 },
      { name: "Sam" },
      { name: "Jo" },
      { name: "Lee" },
      { name: "Kim" },
    ],
    teams: [{ label: "Leaves" }, { label: "Roots" }, { label: "Seeds" }],
  },
  // Trot's four walkers split into pairs.
  {
    players: [{ name: "Jo" }, { name: "Lee" }, { name: "Kim" }, { name: "Sam" }],
    teams: [{ label: "North" }, { label: "South" }],
    arrange: "rows",
  },
  {
    players: [{ name: "Lee", mark: "highlight" }, { name: "Jo" }, { name: "Kim" }, { name: "Sam" }],
    teams: [{ label: "North" }, { label: "South" }],
    density: "compact",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("TeamPicker");
export const probes = [
  choose("Randomly split all six players into three balanced teams, keeping two specified players together"),
  choose("Manually select several explained options from a small list, without random teams", "Choice"),
  write(
    "Randomly split Anna, Ben, Sam and Jo into Leaves and Roots; lock Anna into team zero. Group headings with player rows.",
  ),
  {
    ...write(
      "Randomly put Anna, Ben, Sam and Jo into North and South. Stack the team groups vertically with a heading and player rows for each team.",
    ),
    variant: { axis: "arrange", value: "rows" },
  },
  read("Make the random teams", { address: "t1/make", action: "press" }),
  read("Redraw the team grouping", { address: "t1/remake", action: "press" }),
] satisfies Probe[];

type Setup = Props<typeof props, typeof meta>;
type Panels = ReturnType<typeof teamPickerCopy<Setup["players"][number]>>["panels"];

// prettier-ignore
function TeamColumns({ panels, arrange, density, loading, words }: {
  panels: Panels; arrange: Setup["arrange"]; density: Setup["density"]; loading: boolean;
  words: ReturnType<typeof playWordsFor>["teamPicker"];
}) {
  const columns = panels.map(({ players, ...panel }) => ({
    ...panel,
    children: players.map(({ id, name, photo, team, mark }) => (
      <kit.KitRow key={id} item={id} inset="none" inline={arrange === "rows" || density === "compact"} {...{ density, mark }}
        label={team === undefined ? name : words.lockedName(name)} leadingAlign="row"
        leading={<kit.KitPhoto {...(photo ? { photo } : { initials: Array.from(name)[0]! })}
          shape="round" part="photo" label={name} />}
      >
        <kit.KitRow inline label={name}
          trailing={team === undefined ? undefined : <kit.KitIcon part="team" name="lock" tone="muted" scale="sm" />}
        >
          <kit.KitText part="name" lines={1} density={density}>{name}</kit.KitText>
        </kit.KitRow>
      </kit.KitRow>
    )),
    ...(!players.length ? { summary: <kit.KitText role="label" tone="muted" part={null}>{words.noPlayers}</kit.KitText> } : {}),
  }));
  return <kit.KitColumns part="teams" style={arrange === "rows" ? "stack" : "columns"} {...{ columns, loading }} />;
}

// prettier-ignore
export function TeamPicker(setup: Setup) {
  const { screen, component } = kit.usePartContext();
  const source = kit.useComponentState();
  const thing = kit.useEmptyThing();
  const {
    lang,
    words: { teamPicker: words },
  } = kit.useWords(playWordsFor);
  const density = kit.useVariant("density", meta.variants.density, setup.density);
  const stored = kit.useControlValue<unknown>(`${screen}/${component}/${drawKey}`, undefined);
  const get = (part: string) => (part === drawKey ? stored : undefined);
  const state = drawStatus(meta, setup, source, get);
  const draw = drawState(meta, setup, get);
  const { status, action, panels } = teamPickerCopy(setup, draw, lang);
  const loading = state === "loading";
  const kind = action === "make" ? "primary" : "secondary";
  const button = loading ? <kit.KitSkeleton shape="control" label={words[action]} {...{ kind }} full />
    : <kit.KitAction part={action} action="press" label={words[action]} {...{ kind }} full />;
  return (
    <kit.KitCard part="root" padded {...{ density }}>
      {state === "error" ?
        <kit.KitEmpty part="error" icon="users" title={words.error} sub={words.errorDetail} decorativeIcon /> :
        state === "empty" ? <>
          <kit.KitEmpty part="empty" icon="users" title={thing ? emptyLine(thing, lang) : words.empty} decorativeIcon />
          {button}
        </> : <>
          <kit.KitContent inset={setup.arrange === "rows" ? "md" : "none"}>
            {loading ? <kit.KitSkeleton shape="figure" inset="none" content={[["heading", status]]} /> :
              <kit.KitText role="heading" tone={action === "remake" ? "accent" : "text"} part={null}>{status}</kit.KitText>}
          </kit.KitContent>
          {action === "make" && button}
          <TeamColumns arrange={setup.arrange} {...{ panels, density, loading, words }} />
          {action === "remake" && button}
        </>}
    </kit.KitCard>
  );
}
