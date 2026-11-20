import { createElement } from "react";
import { expect, it } from "vitest";
import { emptyLine, size } from "@lmthing/ui/catalog";
import { KitBracket } from "@lmthing/ui/kit";
import { addressedElements, elementAt, styleAt } from "../../../../test/render";
import { renderDiagram } from "./diagram-test-render";

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
          { label: "Elm", score: "1" },
          { label: "Yew", score: "2" },
        ],
        winner: 1,
        selected: true,
        target: { item: "r4", part: "open" },
      },
      { id: "r3", sides: [{ label: "Maple", score: "1" }, { label: "Pine" }] },
    ],
  },
  { id: "final", label: "Final", ties: [{ id: "r5", sides: [{ label: "Yew" }, { label: "Cedar" }] }] },
] as const;
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
  expect(selected.children[2]!.attributes).toContain('aria-current="true"');
  expect(selected.children[0]!.attributes).not.toContain("aria-current");
  expect(styleAt(html, selected)).toContain(`height:${size.control.md * 2}px`);
  expect(html).toContain(">Maple<");
  expect(html).toContain(">Pine<");
  expect(html).toContain(">Final<");
  expect(html.match(/ d="M\d+ \d+H/g)).toHaveLength(2);
});

it("retains links in loading without exposing scores, ties or scroll focus", () => {
  const html = renderDiagram(createElement(KitBracket, { rounds, links, loading: true }));
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
