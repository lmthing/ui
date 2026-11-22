import { expect, it } from "vitest";
import { audioMatchRecordKind, projectRecognition } from "./audio-match-data";

const track = { title: "One track", artist: "An artist", url: "https://example.com/track" };
const row = { instance: "a1", recognition: { phase: "matched", track } };
const wire = { listening: true, match: track };

it("derives the track and URL only from a unique, valid record addressing this instance", () => {
  const withRows = (...rows: unknown[]) => projectRecognition(wire, "a1", { [audioMatchRecordKind]: rows });
  expect(withRows(row)).toMatchObject({
    phase: "matched",
    match: { title: track.title, artist: track.artist },
    recognitionUrl: track.url,
    listening: false,
  });
  expect(withRows(row).match).not.toHaveProperty("url");
  for (const rows of [[], [row, row], [{ ...row, instance: "a2" }]]) {
    expect(withRows(...rows)).toMatchObject({
      phase: "idle",
      match: undefined,
      recognitionUrl: undefined,
      listening: false,
    });
  }
});

it.each(["javascript:alert(1)", "http://example.com", "https://me:pw@example.com", "https://x\\@evil.test"])(
  "rejects an invalid external address %s",
  (url) => {
    const data = {
      [audioMatchRecordKind]: [{ ...row, recognition: { phase: "matched", track: { ...track, url } } }],
    };
    expect(projectRecognition(wire, "a1", data)).toMatchObject({ phase: "idle", recognitionUrl: undefined });
  },
);
