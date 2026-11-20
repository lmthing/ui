import { expect, it } from "vitest";
import { components, planAct, readComponent, readScreen, type ScreenLike } from "@lmthing/ui/catalog";
import { checkMatchScore } from "..";

it("reads the stamped player and tie identities next to their available actions", () => {
  const lineup = components.Lineup;
  const players = readComponent(lineup, lineup.examples[0], "l1");
  expect(players[0]).toContain("r2: Green #4");
  expect(players[2]).toContain("[l1/r2 press");
  const bracket = components.Bracket;
  const ties = readComponent(bracket, bracket.examples[0], "b1");
  expect(ties[0]).toContain("r3: Final, Ledge Rovers · Oakfield");
  expect(ties[3]).toContain("[b1/r3 press");
});

it("uses the brief's points rules and preserves the input address when the ranks change", () => {
  const table = components.Standings;
  const rows = [
    { team: "First", won: 0, drawn: 2, lost: 0, for: 2, against: 2, form: [] },
    { team: "Second", won: 1, drawn: 0, lost: 0, for: 3, against: 0, form: [] },
  ];
  expect(readComponent(table, { rows }, "s1")[0]).toContain("r2: Second · 1 · 1 · 1 · 0 · 0 · 3 · 3");
  const custom = readComponent(table, { rows, scoring: { win: 1, draw: 1 } }, "s1");
  expect(custom[0]).toContain("r1: First · 1 · 2 · 0 · 2 · 0 · 0 · 2");
  expect(custom[1]).toContain("[s1/r1 press");
});

it("rejects invalid replies and projects a reply and a coach check without touching the seeds", () => {
  const seed = components.Squad.examples[0]!;
  const screen: ScreenLike = { id: "club", components: [{ id: "s1", c: "Squad", ...seed }] };
  const reply = (value: string) => [{ address: "s1/r1/answer", action: "select", value }];
  const invalid = planAct(screen, components, {}, reply("later"), null, "planner");
  expect(invalid.ok).toBe(false);
  const result = planAct(
    screen,
    components,
    {},
    [...reply("yes"), { address: "s1/r2/picked", action: "check", value: true }],
    null,
    "planner",
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const reading = readScreen(screen, components, result.values);
  expect(reading).toContain("2 of 5");
  expect(reading).toContain("Ella: yes");
  expect(reading).toContain("[s1/r2/picked check:done");
  expect(seed.players[0]!.answer).toBe("none");
  expect(seed.players[1]!.picked).toBe(false);
});

it("rejects an empty squad as a validation error", () => {
  expect(components.Squad.props.safeParse({ needed: 5, players: [] }).success).toBe(false);
});

it("checks match scores against only goals on the corresponding side", () => {
  const feed = components.MatchFeed.examples[0];
  const score = { ...components.Scoreboard.examples[0], homeScore: 1, awayScore: 0 };
  const screen: ScreenLike = {
    id: "match",
    components: [
      { id: "s1", c: "Scoreboard", ...score },
      { id: "m1", c: "MatchFeed", ...feed },
    ],
  };
  expect(checkMatchScore(screen)).toEqual([]);
  expect(checkMatchScore({ ...screen, components: [screen.components[0]!] })).toEqual([]);
  expect(
    checkMatchScore({
      ...screen,
      components: [{ ...screen.components[0]!, homeScore: 0, awayScore: 1 }, screen.components[1]!],
    }),
  ).toEqual([
    "Home score does not match the seeded home goals.",
    "Away score does not match the seeded away goals.",
  ]);
});
