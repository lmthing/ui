import { expect, it } from "vitest";
import { components, packOf } from "@lmthing/ui/catalog";
import type { Meta } from "../../meta";
import { checkDriveDeclaration } from "./declaration";

const driver: Meta = {
  ...components.List.meta,
  id: "ChaptersFixture",
  drives: "Player",
  items: { key: "chapters", parts: ["root"] },
  actions: { items: { root: ["press"] } },
};
const targets = { Player: components.Player, List: components.List };

it("validates every registered drives declaration against catalog pack ownership", () => {
  expect(
    Object.values(components).flatMap(({ meta }) => checkDriveDeclaration(meta, components, packOf)),
  ).toEqual([]);
});

it("accepts a core target or a target owned by the same pack", () => {
  expect(checkDriveDeclaration(driver, targets, { ChaptersFixture: "media" })).toEqual([]);
  expect(checkDriveDeclaration(driver, targets, { ChaptersFixture: "media", Player: "media" })).toEqual([]);
});

it("rejects missing, self, foreign-pack, and non-seeking targets", () => {
  expect(checkDriveDeclaration({ ...driver, drives: "Missing" }, targets, {})).toEqual([
    "ChaptersFixture: drives must name another catalog component",
  ]);
  expect(
    checkDriveDeclaration(
      { ...driver, drives: driver.id },
      { [driver.id]: { ...components.List, meta: driver } },
      {},
    ),
  ).toEqual(["ChaptersFixture: drives must name another catalog component"]);
  expect(checkDriveDeclaration(driver, targets, { ChaptersFixture: "media", Player: "mind" })).toEqual([
    "ChaptersFixture: drives target must be core or in the same pack",
  ]);
  expect(checkDriveDeclaration({ ...driver, drives: "List" }, targets, {})).toEqual([
    "ChaptersFixture: drives target must declare exactly one component seek part",
  ]);
});

it("rejects a source without an item root press and a target with ambiguous seeks", () => {
  expect(checkDriveDeclaration({ ...driver, actions: {} }, targets, {})).toEqual([
    "ChaptersFixture: drives requires an item root press",
  ]);
  const player = {
    ...components.Player,
    meta: { ...components.Player.meta, actions: { parts: { scrubber: ["seek"], elapsed: ["seek"] } } },
  } as const;
  expect(checkDriveDeclaration(driver, { Player: player }, {})).toEqual([
    "ChaptersFixture: drives target must declare exactly one component seek part",
  ]);
});
