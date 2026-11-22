import { expect, it } from "vitest";
import { audioMatchReading } from "../../copy";

it("reads the visible recognition copy and identified track details", () => {
  expect(audioMatchReading({}, "empty")).toEqual(["Listen to identify music playing nearby"]);
  expect(audioMatchReading({ phase: "idle" }, "filled")).toEqual(["Identify music", "Start listening"]);
  expect(audioMatchReading({ phase: "error" }, "filled")).toEqual([
    "Could not identify the track",
    "Try again",
  ]);
  expect(audioMatchReading({ phase: "listening" }, "loading")).toEqual([
    "Listening for music",
    "Stop and identify",
  ]);
  expect(
    audioMatchReading(
      {
        phase: "matched",
        hasExternalTrack: true,
        match: { title: "Track", artist: "Artist", album: "Album" },
      },
      "success",
    ),
  ).toEqual(["Track identified", "Track · Artist · Album", "Open track", "Identify another"]);
});
