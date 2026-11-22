import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { components, createRegistry, stampItemIds, themeName, type StateName } from "@lmthing/ui/catalog";
import { KitProvider, PartScope } from "@lmthing/ui/kit";
import { expect, it } from "vitest";
import { DateRows, StageBoard, type DateGroup } from "../src/kit/renderers";
import { SeatingPlan } from "../src/packs/events/seating";
import { ApplicantLanes } from "../src/packs/hiring/applicant-pipeline";
import { CabinSeats, type CabinSeatsView } from "../src/packs/trips/cabin-seats";
import { addressedElements, config, elementAt } from "./render";

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
  expect(html.includes("Upgrade fee: $0<")).toBe(true);
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
  expect(createRegistry({ packs: ["trips"], includeDrafts: true }).ids).not.toContain("CabinSeats");
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
  for (const part of ["root", "tray", "r1/root", "r1/label", "r5/root"]) {
    expect(addressedElements(next).has(`${prefix}${part}`)).toBe(true);
    expect(next.split(`data-testid="${prefix}${part}"`)).toHaveLength(2);
  }
});

it("keeps terminal applicants out of counted lanes and preserves the active address", () => {
  const { meta, props, examples } = components.ApplicantPipeline;
  const input = stampItemIds(meta, props.parse(examples[0])) as Parameters<typeof ApplicantLanes>[0];
  const html = render(<ApplicantLanes {...input} style="stack" />);
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
      lanes={[
        { id: "open", label: "Open", count: "2" },
        { id: "done", label: "Done", count: "0" },
      ]}
      cards={[
        {
          id: "r2",
          column: 0,
          label: "Earlier",
          goto: "earlier",
          lines: [{ part: "title", text: "Earlier" }],
        },
        { id: "r1", column: 0, label: "Later", goto: "later", lines: [{ part: "title", text: "Later" }] },
      ]}
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
      { item: "r1", label: "Reply", indent: 1, body: { part: "body", text: "Reply" } },
    ],
  },
];

it("keeps date, time and accessory addresses distinct and introduces no actions when loading", () => {
  const html = render(<DateRows groups={groups} />);
  const parts = addressedElements(html);
  expect([...parts.keys()]).toEqual(
    ["day", "r2/root", "r2/author", "r2/time", "r2/body", "r2/react", "r1/root", "r1/body"].map(
      (part) => `${prefix}${part}`,
    ),
  );
  expect(parts.get(`${prefix}r2/time`)?.text).toEqual(["All day"]);
  expect(parts.get(`${prefix}r2/root`)?.attributes).toContain('role="link"');
  expect(parts.get(`${prefix}r2/root`)?.text).not.toContain("Like");
  expect(parts.get(`${prefix}r2/react`)?.attributes).toContain('role="button"');
  const loading = render(<DateRows groups={groups} />, "loading");
  expect(addressedElements(loading).size).toBe(0);
  expect(loading).not.toMatch(/role="(?:link|button)"/);
});
