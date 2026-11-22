import React from "react";
import { z } from "zod";
import { dateSpanChoice, isoDate, type Definition } from "@lmthing/ui/catalog";
import { KitAction, KitDay, KitWeekGrid, PartScope, useLiveControls } from "@lmthing/ui/kit";

export const dateSpanDefinition = {
  meta: {
    id: "FareDateFixture",
    tier: "phone",
    group: "input",
    region: "body",
    weight: 1,
    purpose: "Pick travel dates.",
    pick: "Range fixture.",
    realPath: "Pick dates locally.",
    dateSpan: {
      start: "arrival",
      end: "departure",
      date: "date",
      available: "open",
      minNights: "min",
      clear: "clear",
      when: { prop: "mode", equals: "range" },
    },
    parts: ["clear", "mode"],
    select: { prop: "picked", value: "index" },
    selections: { mode: { prop: "mode", choices: ["single", "range"], runtime: true } },
    items: { key: "days", parts: ["root", "label"] },
    actions: {
      parts: { clear: ["press"], mode: ["select"] },
      items: { root: ["select"] },
      when: { root: { open: true }, clear: { mode: "range" } },
    },
  },
  props: z.strictObject({
    arrival: isoDate.optional(),
    departure: isoDate.optional(),
    min: z.int().min(1).max(30),
    mode: z.enum(["single", "range"]).default("single"),
    picked: z.int().optional(),
    days: z.array(z.strictObject({ date: isoDate, open: z.boolean() })),
  }),
  fallback: () => ({}),
  examples: [],
  probes: [],
} as const satisfies Definition;
const days = Array.from({ length: 7 }, (_, index) => ({
  date: `2026-04-0${index + 1}`,
  open: index !== 1,
}));
export const dateSpanEntry = { id: "dates", c: dateSpanDefinition.meta.id, days, min: 2 };
const stamped = { days: days.map((day, index) => ({ ...day, id: `r${index + 1}` })), min: 2, mode: "single" };

function Dates() {
  const live = useLiveControls(dateSpanDefinition.meta, stamped);
  const arrival = live.arrival as string | undefined;
  const departure = live.departure as string | undefined;
  const range = live.mode === "range";
  return (
    <>
      <output aria-label="Selected range">{[arrival, departure].filter(Boolean).join(" to ")}</output>
      <KitAction
        part="mode"
        action="select"
        value={range ? "single" : "range"}
        label={range ? "Single date" : "Date range"}
      />
      {range && arrival && <KitAction part="clear" label="Clear dates" />}
      <KitWeekGrid
        cells={stamped.days.map(({ date, id, open }, index) => (
          <KitDay
            key={id}
            item={id}
            label={String(index + 1)}
            name={`April ${index + 1}`}
            selected={date === arrival || date === departure}
            inSpan={Boolean(arrival && departure && date >= arrival && date <= departure)}
            disabled={range ? !dateSpanChoice(dateSpanDefinition.meta, live, date) : !open}
          />
        ))}
      />
    </>
  );
}

export function DateSpanFixture() {
  return (
    <PartScope screen="home" component="dates" rev={1} state="filled">
      <Dates />
    </PartScope>
  );
}
