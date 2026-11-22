import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine } from "@lmthing/ui/catalog";

const legacy = {
  c: "Player",
  id: "p1",
  state: "filled",
  style: "compact",
  media: "lib:voice_note",
  photo: "lib:plants",
  title: "Voice note",
  sub: "Anna",
  seconds: 38,
  at: 12,
};
const { props, meta } = components.Player;

it("migrates saved compact playback without losing its source, artwork, id or actions", () => {
  const migrated = migrateLine(legacy);
  expect(migrated).toMatchObject({ id: "p1", state: "filled", detail: "brief" });
  expect(migrated).not.toHaveProperty("style");
  const { c: _c, id, state: _state, ...saved } = migrated;
  const parsed = props.parse(saved);
  expect(parsed).toMatchObject({
    style: "audio",
    media: legacy.media,
    photo: legacy.photo,
    sub: legacy.sub,
    at: legacy.at,
  });
  expect(affordancesOf(meta, parsed, String(id))).toEqual(
    affordancesOf(meta, props.parse({ ...saved, detail: "full" }), "p1"),
  );
});

it("keeps explicit destinations and structural video", () => {
  const migrated = migrateLine({ ...legacy, density: "comfortable", detail: "full" });
  expect(migrated).toMatchObject({ detail: "full" });
  expect(migrated).not.toHaveProperty("density");
  const video = { ...legacy, style: "video" };
  expect(migrateLine(video)).toBe(video);
});
