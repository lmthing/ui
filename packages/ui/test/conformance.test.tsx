// Every ready component, every example and state, in each selected preset and mode:
// renders, stamps its root and item addresses once, and draws empty and loading the shared way.
import { describe, expect, it } from "vitest";
import {
  accents,
  components,
  emptyLine,
  isDeviceDataVisible,
  loadingLabel,
  presets,
  stampItemIds,
  themeName,
  themeRoles,
  visibleItems,
  type ComponentName,
  type Definition,
  type DeviceData,
  type Meta,
  type StateName,
} from "@lmthing/ui/catalog";
import { kitThemes, renderers } from "@lmthing/ui/kit";
import { addressedElements, config, exampleDeviceData, renderExample } from "./render";
import { selectedIds } from "../scripts/build";
import { conformanceThemes, modes } from "./themes";
import {
  decode,
  derivedItemIds,
  derivedItemIssues,
  peekForExample,
  renderedAddresses,
  visibleTexts,
} from "./variants";

const ready = selectedIds(Object.keys(renderers) as ComponentName[], import.meta.url);
const themes = conformanceThemes(presets, accents[0].id);

function stampExampleItems(meta: Meta, props: Record<string, unknown>) {
  const { draw, items } = meta;
  if (draw?.kind === "faces" && items) {
    // The Writer gives the number of dice, not item rows.
    const rows = Array.from({ length: Number(props[draw.count]) }, () => ({}));
    props = { ...props, [items.key]: rows };
  }
  return stampItemIds(meta, props);
}

const domainEmpty: Readonly<Record<string, string>> = {
  CannedReplies: "No saved replies yet",
  CreditScore: "No credit report available",
  LeaveBalance: "No leave balances assigned",
  PassReveal: "Add at least three players to start",
  PayStub: "No pay statements issued yet",
  TeamDirectory: "No teammates in the directory yet",
  Transcript: "No transcript available",
  TravelDocs: "No travel documents yet",
};

function expectEmptyCopy(meta: Meta, input: Record<string, unknown>, html: string, data?: DeviceData) {
  const expected = domainEmpty[meta.id];
  if (expected) return expect(visibleTexts(html)).toContain(expected);
  // Explicit empty screen reads only the state header; use the declared copy hook here.
  const withEmptyReading =
    Boolean(data) || ["Flashcard", "BoxScore", "MatchStats", "MomentumChart", "Sessions"].includes(meta.id);
  const lines = withEmptyReading ? meta.read?.(input, "empty", undefined, data) : undefined;
  if (!lines?.length) return expect(html).toContain(emptyLine(meta.deviceDataVisible ? undefined : "walk"));
  const placeholders = [...addressedElements(html).values()].flatMap(({ tag, text, attributes }) => {
    if (tag !== "textarea" || text.length > 0 || attributes.includes('aria-hidden="true"')) return [];
    const placeholder = attributes.match(/\bplaceholder="([^"]+)"/)?.[1];
    return placeholder ? [decode(placeholder)] : [];
  });
  const visible = [...visibleTexts(html), ...placeholders].join(" ");
  for (const line of lines) expect(visible).toContain(line);
}

function isExampleHidden(meta: Meta, state: StateName, data?: DeviceData) {
  return (meta.selectionBinding?.requireSelection && state === "empty") || !isDeviceDataVisible(meta, data);
}

it("stamps runtime faces from the declared count without a Writer item array", () => {
  const meta: Meta = {
    ...components.List.meta,
    items: { key: "dice", parts: ["root", "hold"], prefix: "d" },
    draw: { kind: "faces", press: "roll", count: "quantity", sides: "sides", hold: "hold" },
  };
  expect(stampExampleItems(meta, { quantity: 3, sides: 6 }).dice).toEqual([
    { id: "d1" },
    { id: "d2" },
    { id: "d3" },
  ]);
  expect(stampExampleItems(components.List.meta, { rows: [{}, {}] }).rows).toEqual([
    { id: "r1" },
    { id: "r2" },
  ]);
});

it("supplies parsed props and state to fixtures, without leaking undeclared records", () => {
  const def: Definition = {
    ...components.List,
    meta: {
      ...components.List.meta,
      deviceData: ["allowed"],
      previewDeviceData: ({ input, state }) => ({ allowed: [input, state], other: ["hidden"] }),
    },
  };
  const parsed = def.props.parse({ rows: [{ title: " Fern " }] }) as Record<string, unknown>;
  expect(exampleDeviceData(def, parsed, "empty")).toEqual({
    allowed: [expect.objectContaining({ rows: [expect.objectContaining({ title: "Fern" })] }), "empty"],
  });
  expect(exampleDeviceData(components.List, parsed, "empty")).toBeUndefined();
});

it("validates noncontiguous derived IDs, their item roots, and declared parts", () => {
  const meta: Meta = { ...components.List.meta, items: { key: "derived", parts: ["root", "value"] } };
  const root = "home/c1/r2/root",
    value = "home/c1/r2/value";
  expect(derivedItemIds([root, value])).toEqual(["r2"]);
  expect(derivedItemIssues(meta, {}, [root, value])).toEqual([]);
  expect(derivedItemIssues(meta, {}, [value, value, "home/c1/r2/colour"])).toEqual([
    "Duplicate part address",
    "Undeclared item part: home/c1/r2/colour",
    "Missing item root: home/c1/r2/root",
  ]);
});

describe("themes", () => {
  it("generates every preset × mode × accent with all roles", () => {
    expect(Object.keys(kitThemes)).toHaveLength(presets.length * modes.length * accents.length);
    const css = config.getCSS();
    for (const name of Object.keys(kitThemes)) expect(css).toContain(`.t_${name}`);
    for (const preset of presets)
      for (const mode of modes)
        for (const accent of accents) {
          expect(kitThemes[themeName({ preset: preset.id, mode, accent: accent.id })]).toEqual(
            themeRoles(preset, accent, mode),
          );
        }
  });
});

describe.each(ready)("%s conformance", (id) => {
  const { meta, examples }: Definition = components[id];
  const states: readonly StateName[] = meta.states ?? ["filled"];
  const { items } = meta;

  it.each(themes)("renders every example and state in $preset $mode", (theme) => {
    let derivedExample = false,
      drawnRows = 0;
    for (const example of examples) {
      for (const state of states) {
        const {
          html,
          props: parsed,
          deviceData,
        } = renderExample(id, example, state, theme, { thing: "walk", previewSelection: true });
        if (isExampleHidden(meta, state, deviceData)) {
          expect(addressedElements(html).size).toBe(0);
          continue;
        }
        expect(html.match(/data-testid="home\/c1\/root"/g)).toHaveLength(1);
        if (state === "empty") expectEmptyCopy(meta, parsed, html, deviceData);
        if (state === "loading") expect(html).toContain(loadingLabel);
        if (
          items &&
          meta.deviceData?.length &&
          !Array.isArray(parsed[items.key]) &&
          meta.draw?.kind !== "faces"
        ) {
          const addresses = renderedAddresses(html);
          expect(derivedItemIssues(meta, parsed, addresses)).toEqual([]);
          if (state === "filled") {
            expect(deviceData, "Derived item examples need a declared device fixture").toBeDefined();
            derivedExample = true;
            drawnRows += derivedItemIds(addresses).length;
          }
          continue;
        }
        if (state === "filled" && items) {
          const props = stampExampleItems(meta, parsed);
          const rows = items.addressedWhen
            ? visibleItems<{ id: string }>(meta, props)
            : (props[items.key] as { id: string }[]);
          const { hidden, issues } = peekForExample(meta, props, html);
          expect(issues).toEqual([]);
          if (items.visible === "first")
            expect(html).not.toContain(`data-testid="home/c1/${items.prefix ?? "r"}2/root"`);
          const pageHidesRoots =
            props.overflow === "page" && meta.variantParts?.["overflow.page"]?.hides?.includes("root");
          for (const { id: row } of items.visible === "first" ? rows.slice(0, 1) : rows) {
            const root = `data-testid="home/c1/${row}/root"`;
            if (id === "MapList" && props.style === "map") expect(html).not.toContain(root);
            else if (!pageHidesRoots && !hidden.includes(row)) expect(html).toContain(root);
          }
        }
      }
    }
    if (derivedExample)
      expect(drawnRows, "At least one filled device fixture must render items").toBeGreaterThan(0);
  });
});
