import { describe, expect, it } from "vitest";
import { doorReading, doorSummary, projectDoor } from "../../copy";

const ticket = { instance: "door1", id: "r4", name: "Imani Cole" };
const data = {
  doorScanner: ["door1"],
  doorTickets: [
    ticket,
    { ...ticket, name: "Duplicate" },
    { ...ticket, id: "r6", name: "Imani Fox", arrivedAt: 8 },
    { ...ticket, id: "r7", name: "Inez Ray", arrivedAt: 9 },
    { ...ticket, id: "r8", name: "Invalid", arrivedAt: -1 },
    { ...ticket, id: "r0", name: "Invalid address" },
    { ...ticket, instance: "other", id: "r9", name: "Other event" },
  ],
};

describe("Door copy", () => {
  it("counts valid tickets only and sorts the last arrivals without renumbering search results", () => {
    expect(projectDoor({ query: "  IMANI " }, "door1", data)).toMatchObject({
      expected: 3,
      arrived: 2,
      recent: ["Inez Ray", "Imani Fox"],
      scannerReady: true,
      results: [
        { id: "r4", name: "Imani Cole", available: true },
        { id: "r6", name: "Imani Fox", available: false },
      ],
    });
    expect(projectDoor({ query: "" }, "door1", data).results.map(({ id }) => id)).toEqual(["r4"]);
    expect(projectDoor({}, "other", data)).toMatchObject({ expected: 1, scannerReady: false });
    expect(projectDoor({ query: "" }, "door1", {}).results).toEqual([]);
  });

  it("bounds results and recent arrivals and keeps trusted feedback separate from the search", () => {
    const doorTickets = Array.from({ length: 25 }, (_, i) => ({
      ...ticket,
      id: `r${i + 1}`,
      ...(i < 6 ? { arrivedAt: i } : {}),
    }));
    const live = projectDoor({}, "door1", {
      doorTickets,
      doorFeedback: [{ instance: "door1", reason: "already_in" }],
    });
    expect(live.recent).toHaveLength(3);
    expect(live.results.map(({ id }) => id)).toEqual(["r7", "r8", "r9", "r10"]);
    expect(doorSummary(live, "error")).toMatchObject({
      arrivals: "6 of 25",
      feedback: "Guest already checked in",
    });
    expect(doorSummary({ ...live, detail: "brief" }, "filled").recent).toBeUndefined();
    expect(doorReading(live, "filled").join()).toContain("r7: Imani Cole · Check in");
  });
});
