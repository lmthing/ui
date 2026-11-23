import { expect, it } from "vitest";
import { checkScreen, components, sortByRegion } from "@lmthing/ui/catalog";

const header = { id: "header", c: "Header", title: "My plants" };
const note = { id: "note", c: "Note", text: "Water when the soil is dry." };
const primary = { id: "primary", c: "Button", label: "Log watering" };
const quiet = { id: "quiet", c: "Button", label: "Care guide", emphasis: "quiet" };
const tabs = { id: "tabs", c: "TabBar", ...components.TabBar.examples[0] };

it("orders quiet actions with scroll content and keeps the primary above the tabs", () => {
  const entries = [tabs, header, note, primary, quiet];
  expect(sortByRegion(entries, components)).toEqual([header, note, quiet, primary, tabs]);
  expect(checkScreen({ id: "plants", components: entries }, components)).toEqual([]);
  expect(
    checkScreen({ id: "plants", components: [...entries, { ...primary, id: "other" }] }, components).map(
      ({ code }) => code,
    ),
  ).toContain("S.two_primaries");
});
