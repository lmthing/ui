import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import {
  components,
  createRegistry,
  packReady,
  space,
  stampItemIds,
  themeName,
  type StateName,
} from "@lmthing/ui/catalog";
import { KitProvider, PartScope } from "@lmthing/ui/kit";
import { expect, it } from "vitest";
import { DateRows, SeatPlan, StageBoard, type DateGroup } from "../src/kit/renderers";
import { SeatingPlan } from "../src/packs/events/seating";
import { ApplicantLanes } from "../src/packs/hiring/applicant-pipeline";
import { pipelineWithClosed } from "../src/packs/hiring/tests/components/ApplicantPipeline.fixture";
import { CabinSeats, type CabinSeatsView } from "../src/packs/trips/cabin-seats";
import { addressedElements, config, elementAt, styleAt } from "./render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const prefix = "home/c1/";

function render(children: ReactNode, state: StateName = "filled") {
  return renderToStaticMarkup(
    <TamaguiProvider config={config} defaultTheme={themeName(theme)}>
      <KitProvider theme={theme} lang="en-US">
        <PartScope screen="home" component="c1" rev={1} state={state}>
          {children}
        </PartScope>
      </KitProvider>
    </TamaguiProvider>,
  );
}

const partText = (html: string, part: string) =>
  addressedElements(html).get(`${prefix}${part}`)?.text.join("");

const cabin: CabinSeatsView = {
  cabin: "Cabin A",
  columns: ["A", "", "B"],
  rows: Array.from({ length: 6 }, (_, index) => ({
    row: index + 1,
    exit: index === 3,
    seats: [
      {
        col: "A",
        status: index === 3 ? "extra" : "open",
        fee: 0,
        target: { item: `r${index * 2 + 1}`, part: "root" },
      },
      { col: "B", status: "occupied", target: { item: `r${index * 2 + 2}`, part: "root" } },
    ],
  })),
  confirmPart: "confirm",
};

it("draws a single cabin preview with its fee and preserves targets in the compact window", () => {
  const html = render(<CabinSeats {...cabin} style="compact" selection={{ row: 4, col: "A" }} />);
  expect(html).toContain('aria-colcount="4"');
  expect(html).toContain('aria-rowcount="3"');
  expect(partText(html, "fee_label")).toBe("Upgrade fee");
  expect(partText(html, "fee")).toBe("$0");
  expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
  expect(elementAt(html, `${prefix}r7/root`).attributes).toContain(
    "4A · Selected · Extra legroom · Exit row",
  );
  expect(elementAt(html, `${prefix}confirm`).attributes).not.toContain("aria-disabled");
  expect(html).toContain('aria-label="4B · Occupied · Exit row"');
  const parts = addressedElements(html);
  for (const row of ["r1", "r8", "r11"]) expect(parts.has(`${prefix}${row}/root`)).toBe(false);
});

it("does not confirm an occupied seat or create a new Writer entry", () => {
  const html = render(<CabinSeats {...cabin} selection={{ row: 4, col: "B" }} />);
  expect(html).not.toMatch(/aria-selected="true"|Upgrade fee:/);
  expect(elementAt(html, `${prefix}confirm`).attributes).toContain('aria-disabled="true"');
  const loading = render(<CabinSeats {...cabin} />, "loading");
  expect(loading).toContain('aria-busy="true"');
  expect([...addressedElements(loading).keys()]).toEqual([`${prefix}root`]);
  const registry = createRegistry({ packs: ["trips"] });
  expect(registry.ids).toContain("Itinerary");
  expect(registry.ids.includes("CabinSeats")).toBe(packReady("trips"));
});

it.each([
  ["filled", true],
  ["loading", false],
] as const)("makes every seat-plan slot inert when %s with loading=%s", (state, loading) => {
  const seat = { id: "r1", label: "A", kind: "free" as const, target: { part: "root" } };
  const html = render(
    <SeatPlan
      kind="grid"
      part={null}
      loading={loading}
      sections={[{ id: "map", label: "Map", rows: [{ label: "1", seats: [seat] }] }]}
      total={{ text: "Total", part: "total" }}
      action={{ part: "confirm", label: "Confirm" }}
    />,
    state,
  );
  expect(addressedElements(html).size).toBe(0);
  expect(html).not.toMatch(/role="(?:button|gridcell)"/);
});

it("keeps separate table and guest targets when owner-projected assignments change", () => {
  const { meta, props, examples } = components.Seating;
  const input = stampItemIds(meta, props.parse(examples[0])) as Parameters<typeof SeatingPlan>[0];
  const first = render(<SeatingPlan {...input} />);
  expect(partText(first, "r1/seats")).toBe("2 / 8");
  expect(partText(first, "r2/seats")).toBe("0 / 10");
  expect(partText(first, "r5/name")).toBe("Deepa Shah");
  expect(first).not.toContain("Move Deepa Shah");
  const entries = input.entries.map((entry) =>
    entry.kind === "guest" && entry.id === "r5" ? { ...entry, at: 1 } : entry,
  );
  const next = render(<SeatingPlan {...input} entries={entries} />);
  expect(partText(next, "r2/seats")).toBe("1 / 10");
  expect(partText(next, "r5/name")).toBe("DS");
  for (const part of ["root", "tray", "r1/root", "r1/label", "r5/root"])
    expect(next.split(`data-testid="${prefix}${part}"`)).toHaveLength(2);
});

it("keeps terminal applicants out of counted lanes and preserves the active address", () => {
  const { meta, props } = components.ApplicantPipeline;
  const input = stampItemIds(meta, props.parse(pipelineWithClosed())) as Parameters<typeof ApplicantLanes>[0];
  const html = render(<ApplicantLanes {...input} arrange="rows" />);
  const stripLabel = 'aria-label="Applied, Screening, Interview, Offer"';
  expect(html).not.toContain(stripLabel);
  expect(render(<ApplicantLanes {...input} />)).toContain(stripLabel);
  expect(partText(html, "r1/name")).toBe("Sam Patel");
  expect(partText(html, "outcomes")).toContain("Withdrawn: 1");
  expect(html).not.toMatch(/Riley Chen|home\/c1\/r2|Move to/);
  for (const part of ["applied", "screening", "interview", "offer", "r1/applied", "r1/next", "r1/next_at"])
    expect(addressedElements(html).has(`${prefix}${part}`)).toBe(true);
  expect([...addressedElements(render(<ApplicantLanes {...input} />, "loading")).keys()]).toEqual([
    `${prefix}root`,
  ]);
});

it("renders queue lanes in caller order without introducing move affordances", () => {
  const html = render(
    <StageBoard
      part="groups"
      style="stack"
      lanes={[{ id: "open", label: "Open", count: "2" }]}
      cards={["Earlier", "Later"].map((text, index) => ({
        id: `r${2 - index}`,
        column: 0,
        label: text,
        goto: text.toLowerCase(),
        lines: [{ part: "title", text }],
      }))}
    />,
  );
  expect(html.indexOf(`${prefix}r2/root`)).toBeLessThan(html.indexOf(`${prefix}r1/root`));
  expect(html).not.toContain('data-step-action="move"');
});

const groups: DateGroup[] = [
  { id: "empty", date: { part: "empty_day", text: "Empty" }, rows: [] },
  {
    id: "current",
    date: { part: "day", text: "Today", role: "meta" },
    rows: [
      {
        item: "r2",
        label: "Update",
        goto: "detail",
        author: { part: "author", text: "Ari" },
        time: { part: "time", text: "All day" },
        body: { part: "body", text: "Update" },
        accessories: [{ part: "react", label: "Like", action: "toggle" }],
      },
      {
        item: "r1",
        label: "Reply",
        indent: 1,
        body: { part: "body", text: "Reply" },
        accessories: [{ part: "respond", label: "Respond" }],
      },
    ],
  },
];

it("keeps date, time and accessory addresses distinct and introduces no actions when loading", () => {
  const html = render(<DateRows groups={groups} />);
  const parts = addressedElements(html);
  expect([...parts.keys()]).toEqual(
    "day r2/root r2/author r2/time r2/body r2/react r1/root r1/body r1/respond"
      .split(" ")
      .map((part) => `${prefix}${part}`),
  );
  expect(parts.get(`${prefix}r2/time`)?.text).toEqual(["All day"]);
  expect(parts.get(`${prefix}r2/root`)?.attributes).toContain('role="link"');
  expect(parts.get(`${prefix}r2/root`)?.text).not.toContain("Like");
  expect(parts.get(`${prefix}r2/react`)?.attributes).toContain('role="button"');
  const footer = html.match(/<div [^>]+>(?=<div data-testid="home\/c1\/r1\/respond")/)?.[0];
  expect(styleAt(html, { tag: "div", attributes: footer ?? "", children: [] })).toContain(
    `padding-left:${space.xl}px`,
  );
  const loading = render(<DateRows groups={groups} />, "loading");
  expect(addressedElements(loading).size).toBe(0);
  expect(loading).not.toMatch(/role="(?:link|button)"/);
});
