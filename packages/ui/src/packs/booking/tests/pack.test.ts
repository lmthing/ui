import { selectedIds, selectedEntries } from "../../../../scripts/build";
import { describe, expect, it } from "vitest";
import {
  components,
  packs,
  packOf,
  packReady,
  packExamples,
  packArchetypes,
  archetypes,
  createRegistry,
  writerFormat,
  checkPacks,
  checkArchetypes,
  type CastLike,
  readComponent,
} from "@lmthing/ui/catalog";

describe("booking scaffold", () => {
  it("puts booking in the live registry exactly when every component is ready", () => {
    const ready = packReady("booking");
    const live = createRegistry({ packs: ["booking"] });
    if (!ready) expect(live.ids).toEqual(createRegistry().ids);
    const draft = createRegistry({ packs: ["booking"], includeDrafts: true });
    expect(Object.hasOwn(live.archetypes, "book")).toBe(ready);
    expect(draft.archetypes).toHaveProperty("book");
    expect(draft.defaultLines("book", "service", { things: [], items: [] }).components[1]?.c).toBe(
      "ServiceMenu",
    );
    const capacity = draft
      .defaultLines("schedule", "class", { things: [], items: [] })
      .components.find(({ c }) => c === "Progress");
    expect(capacity).toMatchObject({ density: "compact" });
    expect(capacity).not.toHaveProperty("style");
    const booking = Object.keys(packOf).filter((id) => packOf[id as keyof typeof packOf] === "booking");
    expect(draft.ids.filter((id) => booking.includes(id))).toHaveLength(6);
    const format = JSON.stringify(writerFormat(draft));
    const liveFormat = JSON.stringify(writerFormat(live));
    for (const id of selectedIds(booking)) {
      expect(format).toContain(`"const":"${id}"`);
      expect(liveFormat.includes(`"const":"${id}"`)).toBe(ready);
    }
  });
  it("validates metadata, archetypes and every worked-example line", () => {
    expect(checkPacks({ components, packs, packOf, packExamples, packArchetypes })).toEqual([]);
    expect(checkArchetypes({ components, packOf, packArchetypes, archetypes })).toEqual([]);
    const workedBooking = packExamples.booking
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
    for (const id of ["ServiceMenu", "Slots"] as const) {
      const { c: _c, id: _id, ...input } = workedBooking.find((line) => line.c === id);
      expect(input).not.toHaveProperty("style");
      expect(components[id].props.parse(input)).toMatchObject(
        id === "ServiceMenu" ? { surface: "card" } : { arrange: "grid" },
      );
    }
    const slots = readComponent(components.Slots, components.Slots.examples[0], "s1").join("\n");
    expect(slots).toContain("09:30 (taken)");
    expect(slots).toContain("[s1/r1 select");
    expect(slots).not.toContain("[s1/r2 select");
  });
  it("validates every draft's examples and neutral fallbacks and requires a core near miss", () => {
    const cast: CastLike = { things: [], items: [] };
    for (const [id, owner] of selectedEntries(packOf)) {
      if (owner !== "booking") continue;
      const def = components[id as keyof typeof components];
      for (const example of def.examples) expect(def.props.safeParse(example).success).toBe(true);
      expect(def.props.safeParse(def.fallback({ cast })).success).toBe(true);
      expect(
        def.probes.some(
          (probe) => probe.kind === "choose" && probe.expect !== id && !(probe.expect in packOf),
        ),
      ).toBe(true);
    }
  });
});

describe("booking draft schemas", () => {
  it("rejects draft schema boundary violations", () => {
    const invalid = {
      ServiceMenu: [
        { services: [] },
        { services: [{ name: "a".repeat(29), minutes: 30, goto: "time" }] },
        { services: [{ name: "Visit", minutes: 4, goto: "time" }] },
        { services: Array.from({ length: 13 }, () => ({ name: "Visit", minutes: 30, goto: "time" })) },
      ],
      Slots: [
        { times: [] },
        { times: [{ time: "25:00", taken: false }], minutes: 30 },
        { times: [{ time: "09:00", taken: true }], minutes: 30, at: "09:00" },
      ],
      Availability: [
        { days: [] },
        { days: Array.from({ length: 7 }, () => ({ day: "mon", on: true, from: "09:00", to: "17:00" })) },
      ],
      StaffPicker: [
        { staff: [] },
        { staff: [{ name: "a".repeat(21), photo: "local:1" }] },
        { staff: [{ name: "Sam", photo: "https://example.org/photo" }] },
      ],
      Appointment: [
        {
          service: "Visit",
          date: "2026-02-30",
          time: "09:00",
          minutes: 30,
          status: "confirmed",
          goto: "time",
        },
        { ...components.Appointment.examples[0], policy: "Cannot use policy in card" },
      ],
    };
    for (const [id, inputs] of selectedEntries(invalid))
      for (const input of inputs)
        expect(components[id as keyof typeof invalid].props.safeParse(input).success).toBe(false);
  });
});
