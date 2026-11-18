import { describe, expect, it } from "vitest";
import {
  checkScreen,
  components,
  createRegistry,
  packComposition,
  scoreComposition,
  type CastLike,
} from "@lmthing/ui/catalog";
import { appointments } from "./appointments";

describe("appointments/upcoming", () => {
  it("retains all four required slots and valid defaults with and without past records", () => {
    const registry = createRegistry({ packs: ["booking"] });
    const casts: CastLike[] = [
      { things: [], items: [] },
      {
        things: [{ type: "appointment", fields: ["service", "date"] }],
        items: [
          { id: "past_visit", type: "appointment", sample: true, service: "Visit", date: "2026-11-17" },
        ],
      },
    ];
    for (const cast of casts) {
      const screen = registry.defaultLines("appointments", "upcoming", cast);
      expect(screen.components.map(({ c }) => c)).toEqual(["Header", "Segmented", "Appointment", "List"]);
      expect(checkScreen(screen, registry)).toEqual([]);
      expect(
        scoreComposition(JSON.stringify(screen), packComposition(appointments), "upcoming", components)
          .issues,
      ).toEqual([]);
      const list = screen.components.find(({ c }) => c === "List")!;
      const { id: _id, c: _c, ...input } = list;
      const parsed = components.List.props.parse(input);
      expect(parsed.style).toBe("inset");
      expect(parsed.rows.every((row) => !row.me && !row.photo && !row.body)).toBe(true);
    }
  });
});
