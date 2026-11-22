import { expect, it } from "vitest";
import { projectSessions, sessionCapacity, sessionsReading, sessionTrackChoices } from "../../copy";

const row = {
  id: "r1",
  title: "Opening panel",
  track: "Talks",
  start: "09:00",
  end: "09:30",
  room: "Hall",
  saved: true,
};

it("labels available, sold-out and unknown capacities without making up availability", () => {
  expect(sessionCapacity({ booked: 3, capacity: 5 }, "ar-u-nu-arab")).toBe("٢ left");
  expect(sessionCapacity({ booked: 5, capacity: 5 })).toBe("Full");
  expect(sessionCapacity({ capacity: 0 })).toBe("Full");
  expect(sessionCapacity({ capacity: 1 })).toBe("1 seat");
  expect(sessionCapacity({ capacity: 5 })).toBe("5 seats");
  expect(sessionCapacity({ booked: 3 })).toBeUndefined();
});

it("falls back to the authored selection if a prior track has been removed", () => {
  expect(
    projectSessions({
      tracks: ["Talks", "Other"],
      selectedTrack: "Talks",
      activeTrack: "track:Removed",
      sessions: [row],
    }),
  ).toMatchObject({ activeTrack: "track:Talks", sessions: [{ visible: true }] });
});

it("keeps the all-tracks filter distinct from a track whose authored label matches it", () => {
  expect(sessionTrackChoices(["Talks", "All tracks"])).toEqual([
    { value: "all", label: "All tracks" },
    { value: "track:Talks", label: "Talks" },
    { value: "track:All tracks", label: "Track: All tracks" },
  ]);
});

it("marks overlaps only among saved sessions and treats touching endpoints as separate", () => {
  const input = {
    style: "mine",
    tracks: ["Talks"],
    sessions: [
      { ...row, id: "r3", title: "Last panel", start: "10:00", end: "10:30" },
      row,
      { ...row, id: "r2", title: "Middle panel", start: "09:15", end: "10:00" },
      { ...row, id: "r4", start: "10:15", end: "10:45", saved: false },
    ],
  };
  const projected = projectSessions(input);
  expect(projected.sessions.map(({ id, conflict }) => [id, conflict])).toEqual([
    ["r3", false],
    ["r1", true],
    ["r2", true],
    ["r4", false],
  ]);
  expect(
    sessionsReading({ ...input, ...projected }, "success").filter((line) => line.startsWith("r")),
  ).toEqual([
    "r1 · 09:00–09:30 · Opening panel · Talks · Hall · Time conflict",
    "r2 · 09:15–10:00 · Middle panel · Talks · Hall · Time conflict",
    "r3 · 10:00–10:30 · Last panel · Talks · Hall",
  ]);
});
