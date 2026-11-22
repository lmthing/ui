import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine } from "@lmthing/ui/catalog";

const cases = [
  ["Hero", "statement", { title: "Fern" }, { media: "none" }, {}],
  [
    "Hero",
    "photo",
    { title: "Fern", photo: "lib:plants" },
    { media: "cover", photo: "lib:plants" },
    { media: "none" },
  ],
  ["Header", "large", { title: "Fern" }, { emphasis: "normal" }, {}],
  [
    "Header",
    "inline",
    { title: "Fern", action: { icon: "plus", label: "Add", goto: "add" } },
    { emphasis: "quiet" },
    { emphasis: "normal" },
  ],
  ["Note", "body", { text: "Indirect light" }, { emphasis: "normal" }, {}],
  [
    "Note",
    "hint",
    { text: "Indirect light" },
    { emphasis: "quiet", icon: "lightbulb" },
    { emphasis: "normal" },
  ],
  [
    "Note",
    "quote",
    { text: "Indirect light", icon: "leaf" },
    { emphasis: "hero", icon: "leaf" },
    { emphasis: "quiet" },
  ],
] as const;

it.each(cases)(
  "migrates %s %s without losing addresses or explicit axes",
  (c, style, fields, expected, explicit) => {
    const original = { c, id: "first", state: "filled", style, ...fields };
    const line = migrateLine(original);
    const { c: name, id, state, ...input } = line;
    expect({ c: name, id, state }).toEqual({ c, id: "first", state: "filled" });
    expect(input).not.toHaveProperty("style");
    const def = components[c];
    const parsed = def.props.parse(input);
    expect(parsed).toMatchObject({ ...fields, ...expected });
    expect(affordancesOf(def.meta, parsed, "first")).toEqual(
      "action" in fields
        ? [{ address: "first/action", part: "action", action: "press", detail: "→add" }]
        : [],
    );
    const { c: _name, id: _id, state: _state, ...overridden } = migrateLine({ ...original, ...explicit });
    expect(def.props.parse(overridden)).toMatchObject(explicit);
    expect(migrateLine(line)).toEqual(line);
  },
);

it("keeps the structural number and back treatments", () => {
  expect(migrateLine({ c: "Hero", id: "h1", style: "number", title: "2" })).toMatchObject({
    style: "number",
  });
  const { c: _name, id, ...input } = migrateLine({ c: "Header", id: "h1", style: "back", title: "Fern" });
  expect(id).toBe("h1");
  expect(affordancesOf(components.Header.meta, components.Header.props.parse(input), "h1")).toEqual([
    { address: "h1/back", part: "back", action: "press", detail: "" },
  ]);
});

it.each(components.Photo.meta.variants.aspect)(
  "migrates a saved %s crop, preserving the ID and explicit aspect",
  (style) => {
    const old = { c: "Photo", id: "p1", style, photo: "lib:entry" };
    const { c, id, ...input } = migrateLine(old);
    expect({ c, id }).toEqual({ c: "Photo", id: "p1" });
    expect(components.Photo.props.parse(input)).toMatchObject({ photo: "lib:entry", aspect: style });
    const { c: _c, id: _id, ...overridden } = migrateLine({ ...old, aspect: "square" });
    expect(components.Photo.props.parse(overridden).aspect).toBe("square");
  },
);

it.each([
  [{ style: "row" }, { media: "thumb" }],
  [
    { style: "centered", photo: "lib:dogs" },
    { media: "thumb", photo: "lib:dogs" },
  ],
  [{ style: "centered" }, { media: "thumb" }],
  [{ style: "centered", align: "start" }, { media: "thumb" }],
  [{ style: "centered", media: "none" }, { media: "none" }],
] as const)("migrates %j with explicit axes winning", (fields, expected) => {
  const { c, id, ...input } = migrateLine({ c: "Profile", id: "p1", name: "Clover", ...fields });
  expect({ c, id }).toEqual({ c: "Profile", id: "p1" });
  expect(input).not.toHaveProperty("align");
  expect(components.Profile.props.parse(input)).toMatchObject({ name: "Clover", ...expected });
});
