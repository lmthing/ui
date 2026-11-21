import { createElement } from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { emptyLine, themeName } from "@lmthing/ui/catalog";
import { KitBracket, KitProvider, PartScope } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, styleAt } from "../../../../test/render";
import { bracketTieHeight } from "./bracket-layout";

function renderDiagram(view: ReturnType<typeof createElement>) {
  const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
  const scope = createElement(PartScope, {
    screen: "home",
    component: "c1",
    rev: 1,
    state: "filled",
    children: view,
  });
  const kit = createElement(KitProvider, { theme, children: scope });
  return renderToStaticMarkup(
    createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, kit),
  );
}

const rounds = [
  {
    id: "semi",
    label: "Semifinals",
    ties: [
      {
        id: "r1",
        sides: [
          { label: "Ash", score: "0" },
          { label: "Oak", score: "0" },
        ],
        target: { part: "open" },
      },
      {
        id: "r2",
        sides: [
          { label: "Elm", score: "3" },
          { label: "Yew", score: "2" },
        ],
        winner: 1,
        winnerLabel: "Yew advances",
        selected: true,
        target: { item: "r4", part: "open" },
      },
      { id: "r3", sides: [{ label: "Maple", score: "1" }, { label: "Pine" }] },
    ],
  },
  { id: "final", label: "Final", ties: [{ id: "r5", sides: [{ label: "Yew" }, { label: "Cedar" }] }] },
] as const;
const addressedRounds = rounds.map((round) => ({
  ...round,
  ties: round.ties.map((tie) => ({
    ...tie,
    roundPart: "round",
    sides: [
      { ...tie.sides[0], labelPart: "a", scorePart: "a_score" },
      { ...tie.sides[1], labelPart: tie.id === "r3" ? null : "b", scorePart: "b_score" },
    ] as const,
  })),
}));
const links = [
  { from: "r1", to: "r5" },
  { from: "r2", to: "r5" },
  { from: "unknown", to: "r5" },
];

it("draws unplayed, partial, tied and decided ties without computing winners", () => {
  const html = renderDiagram(createElement(KitBracket, { rounds, links, part: "rounds" }));
  expect([...addressedElements(html).keys()]).toEqual([
    "home/c1/rounds",
    "home/c1/r1/open",
    "home/c1/r4/open",
    "home/c1/r3/root",
    "home/c1/r5/root",
  ]);
  const tied = elementAt(html, "home/c1/r1/open");
  expect(tied.attributes).toContain('aria-label="Ash, 0, Oak, 0"');
  expect(tied.children[0]!.attributes).not.toContain("aria-current");
  expect(tied.children[2]!.attributes).not.toContain("aria-current");
  const selected = elementAt(html, "home/c1/r4/open");
  expect(selected.attributes).toContain('aria-current="true"');
  expect(selected.attributes).toContain('aria-label="Elm, 3, Yew, 2, Yew advances"');
  expect(selected.children[2]!.attributes).toContain('aria-current="true"');
  expect(selected.children[0]!.attributes).not.toContain("aria-current");
  expect(styleAt(html, selected)).toContain(`height:${bracketTieHeight}px`);
  expect(html).toContain(">Maple<");
  expect(html).toContain(">Pine<");
  expect(html).toContain(">Final<");
  expect(html.match(/ d="M\d+ \d+H/g)).toHaveLength(2);
});

it("addresses tie text and gives each tie an alias to its one visible round heading", () => {
  const html = renderDiagram(createElement(KitBracket, { rounds: addressedRounds, links }));
  const parts = addressedElements(html);
  const tie = elementAt(html, "home/c1/r4/open");
  expect(tie.attributes).toContain('aria-label="Elm, 3, Yew, 2, Yew advances"');
  expect(tie.attributes).toContain('role="button"');
  expect(parts.get("home/c1/r4/a")?.text).toEqual(["Elm"]);
  expect(parts.get("home/c1/r4/b")?.text).toEqual(["Yew"]);
  expect(parts.get("home/c1/r4/a_score")?.text).toEqual(["3"]);
  expect(parts.get("home/c1/r4/b_score")?.text).toEqual(["2"]);
  expect(parts.get("home/c1/r1/a_score")?.text).toEqual(["0"]);
  expect(parts.has("home/c1/r3/b")).toBe(false);
  expect(parts.has("home/c1/r3/b_score")).toBe(false);
  expect(parts.has("home/c1/r5/a_score")).toBe(false);
  expect(parts.has("home/c1/r5/b_score")).toBe(false);
  expect(parts.has("home/c1/r2/round")).toBe(false);
  for (const id of ["r1", "r4", "r3", "r5"]) {
    const alias = elementAt(html, `home/c1/${id}/round`);
    expect(alias.attributes).toContain('aria-hidden="true"');
    expect(alias.attributes).not.toMatch(/role=|tabindex=/);
    expect(styleAt(html, alias)).toContain("position:absolute");
    expect(styleAt(html, alias)).toContain("pointer-events:none");
  }
  expect(html.match(/>Semifinals</g)).toHaveLength(1);
  expect(html.match(/>Final</g)).toHaveLength(1);
});

it("retains links in loading without exposing scores, ties or scroll focus", () => {
  const html = renderDiagram(createElement(KitBracket, { rounds: addressedRounds, links, loading: true }));
  expect(html).toContain('aria-busy="true"');
  expect(html.match(/ d="M\d+ \d+H/g)).toHaveLength(2);
  expect([...addressedElements(html).keys()]).toEqual(["home/c1/root"]);
  expect(html).not.toMatch(/Yew|Elm|Cedar|Semifinals|role="button"|tabindex="0"/);
});

it("shows the shared empty state when rounds contain no ties", () => {
  const html = renderDiagram(
    createElement(KitBracket, { rounds: [{ id: "final", label: "Final", ties: [] }], links }),
  );
  expect(html).toContain(emptyLine(undefined));
  expect(html).not.toContain('role="region"');
});
