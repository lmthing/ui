import { z } from "zod";
import {
  itemsOf,
  photo,
  placeholderTitle,
  probesFor,
  text,
  thingOf,
  titleOf,
  type FallbackInput,
  type Meta,
  type Probe,
} from "../../../catalog";

// Core first: Choice/multi cannot randomly divide everyone into balanced teams with locked placements.
export const meta = {
  id: "TeamPicker",
  status: "draft",
  group: "input",
  purpose: "Split players into balanced random teams while preserving optional locked placements.",
  pick: "Randomly allocate every player to balanced named teams with optional locks. Not deliberate selection (Choice[multi]), one random option (Spinner), or sports positions (Squad, Lineup).",
  writeHints: [
    "Write 2–12 players and 2–4 distinct team labels, no more teams than players. Optional player.team is a zero-based locked index. Never write unlocked assignments, sizes or feasibility; impossible locks are runtime errors, not uneven teams.",
  ],
  region: "body",
  weight: 3,
  dense: true,
  tier: "phone",
  confirmParts: ["remake"],
  realPath: "The device saves the roster, locked placements and a random balanced allocation.",
  items: { key: "players", parts: ["root", "name", "photo", "team"] },
  parts: ["root", "teams", "make", "remake"],
  states: ["empty", "filled", "loading", "success", "error"],
  actions: { parts: { make: ["press"], remake: ["press"] } },
  read: (input) => (input as z.output<typeof props>).teams.map((team) => team.label),
} as const satisfies Meta;
export const props = z
  .strictObject({
    players: z
      .array(
        z.strictObject({
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
    style: z.enum(["columns", "groups"]).default("columns"),
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
    style: "columns",
  },
  // Trot's four walkers split into pairs.
  {
    players: [{ name: "Jo" }, { name: "Lee" }, { name: "Kim" }, { name: "Sam" }],
    teams: [{ label: "North" }, { label: "South" }],
    style: "groups",
  },
] satisfies z.input<typeof props>[];
const { choose, write, read } = probesFor("TeamPicker");
export const probes = [
  choose("Randomly split all six players into three balanced teams, keeping two specified players together"),
  choose("Manually select several explained options from a small list, without random teams", "Choice"),
  write(
    "Randomly split Anna, Ben, Sam and Jo into Leaves and Roots; lock Anna into team zero. Group headings with player rows.",
  ),
  read("Make the random teams", { address: "t1/make", action: "press" }),
  read("Redraw the team grouping", { address: "t1/remake", action: "press" }),
] satisfies Probe[];
