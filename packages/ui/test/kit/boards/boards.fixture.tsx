import React, { useState, type ComponentProps } from "react";
import { createRoot } from "react-dom/client";
import { TamaguiProvider } from "tamagui";
import { z } from "zod";
import { type Definition } from "@lmthing/ui/catalog";
import { createScreenController, KitCellGrid, KitProvider, KitSeatGrid, PartScope } from "@lmthing/ui/kit";
import { config } from "../../render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Sections = ComponentProps<typeof KitSeatGrid>["sections"];
type Cells = ComponentProps<typeof KitCellGrid>["cells"];
const target = { part: "root" };
const sections: Sections = [
  {
    id: "front",
    label: "Front",
    rows: [
      {
        label: "A",
        seats: [
          { id: "r1", label: "A1", kind: "free", target },
          { id: "aisle", label: "Not a seat", kind: "aisle", target },
          { id: "r2", label: "A2", kind: "taken", target },
          { id: "display-only", label: "A3", kind: "free", target },
          ...Array.from({ length: 11 }, (_, col) => ({
            id: `display-${col}`,
            label: `A${col + 4}`,
            kind: "free" as const,
          })),
          { id: "selected-seat", label: "A15", kind: "selected", target: { item: "r3", part: "root" } },
        ],
      },
      {
        label: "B",
        seats: [
          { id: "b1", label: "B1", kind: "free" },
          { id: "b2", label: "B2", kind: "free" },
          { id: "b3", label: "B3", kind: "free" },
        ],
      },
    ],
  },
  { id: "rear", label: "Rear", rows: [{ label: "C", seats: [{ id: "c1", label: "C1", kind: "free" }] }] },
];

const cells: Cells = [
  { id: "r1", row: 0, col: 0, value: "G", state: "given", target },
  {
    id: "r2",
    row: 0,
    col: 1,
    clue: "12",
    notes: ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    state: "draft",
    target,
  },
  { id: "correct", row: 0, col: 2, value: "C", state: "correct" },
  { id: "present", row: 0, col: 3, value: "P", state: "present" },
  { id: "absent", row: 0, col: 4, value: "A", state: "absent" },
  { id: "r3", row: 0, col: 5, value: "X", notes: ["0"], state: "conflict", selected: true, target },
  { id: "r4", row: 8, col: 8, state: "empty", target },
  { id: "outside", row: 9, col: 0, value: "Outside grid", state: "given" },
];

const markedSeats: Sections = sections.map((section, index) =>
  index
    ? section
    : {
        ...section,
        rows: section.rows.map((row) => ({
          ...row,
          mark: { icon: "flag", label: "Exit row" },
          seats: row.seats.map((seat) =>
            seat.id === "r2" ? { ...seat, seatClass: { icon: "star", label: "Premium" } } : seat,
          ),
        })),
      },
);
const markedCells: Cells = [
  ...cells.filter((cell) => cell.id !== "correct" && cell.id !== "r4"),
  { id: "r4", row: 0, col: 2, state: "blocked", target },
  { id: "marked", row: 0, col: 6, state: "correct", mark: { icon: "flag", label: "Flagged" } },
];

const definition = {
  meta: {
    id: "BoardSeatFixture",
    group: "input",
    tier: "phone",
    weight: 1,
    region: "body",
    purpose: "Choose a cell or seat.",
    pick: "Board test fixture.",
    realPath: "Updates locally.",
    items: { key: "items", parts: ["root"] },
    select: { prop: "on", value: "index", mode: "flags" },
    actions: { items: { root: ["toggle"] } },
  },
  props: z.strictObject({ items: z.array(z.strictObject({ on: z.boolean() })), at: z.int().optional() }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} as const satisfies Definition;
const cellDef = {
  ...definition,
  meta: {
    ...definition.meta,
    id: "BoardCellFixture",
    select: { prop: "at", value: "index" },
    actions: { items: { root: ["select"] } },
  },
} as const satisfies Definition;
const controller = createScreenController({
  defs: { BoardSeatFixture: definition, BoardCellFixture: cellDef },
  screen: {
    id: "test",
    components: [
      { id: "seats", c: definition.meta.id, items: Array.from({ length: 3 }, () => ({ on: false })) },
      { id: "cells", c: cellDef.meta.id, items: Array.from({ length: 4 }, () => ({ on: false })) },
    ],
  },
  requireMounted: true,
});

declare global {
  interface Window {
    boardPresses: { address: string; ok: boolean }[];
  }
}
window.boardPresses = [];
const press = controller.press;
controller.press = (address) => {
  const result = press(address);
  window.boardPresses.push({ address, ok: result.ok });
  return result;
};

function Fixture() {
  const [mode, setMode] = useState<"filled" | "loading" | "empty" | "compact" | "marked">("filled");
  const marked = mode === "marked";
  const clues = Array.from({ length: 9 }, (_, at) => (at === 0 ? "2 1" : null));
  return (
    <TamaguiProvider config={config} defaultTheme="kit_calm_light_moss">
      <button type="button" onClick={() => setMode("loading")}>
        Loading
      </button>
      <button type="button" onClick={() => setMode("filled")}>
        Filled
      </button>
      <button type="button" onClick={() => setMode("empty")}>
        Empty
      </button>
      <button type="button" onClick={() => setMode("compact")}>
        Compact
      </button>
      <button type="button" onClick={() => setMode("marked")}>
        Marked
      </button>
      <KitProvider theme={theme} controller={controller} interactive>
        <PartScope screen="test" component="seats" rev={1} state="filled">
          <KitSeatGrid
            part="map"
            screenLabel="Screen"
            sections={mode === "empty" ? [] : marked ? markedSeats : sections}
            loading={mode === "loading"}
          />
        </PartScope>
        <PartScope screen="test" component="cells" rev={1} state="filled">
          <KitCellGrid
            part="board"
            rows={mode === "compact" ? 4 : 9}
            cols={mode === "compact" ? 4 : 9}
            cells={mode === "empty" ? [] : marked ? markedCells : cells}
            {...(marked ? { clues: { rows: clues, columns: clues } } : {})}
            loading={mode === "loading"}
          />
        </PartScope>
      </KitProvider>
    </TamaguiProvider>
  );
}

createRoot(document.getElementById("root")!).render(<Fixture />);
