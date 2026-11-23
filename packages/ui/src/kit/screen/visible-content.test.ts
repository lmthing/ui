import { expect, it } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { filterVisibleContent } from "./visible-content";

it("filters undrawable filled slots without rewriting saved content or leaving state feedback out", () => {
  const screen: ScreenLike = {
    id: "home",
    components: [
      { id: "one", c: "Photo", photo: "local:3" },
      { id: "two", c: "Gallery", photos: [{ photo: "lib:fern" }, { photo: "local:4" }] },
      { id: "three", c: "Scale", style: "stars", readonly: true },
      { id: "four", c: "Scale", style: "stars", readonly: false, value: 0 },
      { id: "five", c: "Photo", photo: "local:5", state: "error" },
      { id: "six", c: "Photo", photo: "local:6", state: "loading" },
    ],
  };
  const ids = (view: ScreenLike) => view.components.map(({ id }) => id);
  expect(ids(filterVisibleContent(screen, components, undefined))).toEqual(["four", "five", "six"]);
  expect(
    ids(filterVisibleContent(screen, components, (ref) => (ref === "lib:fern" ? "fern-uri" : undefined))),
  ).toEqual(["two", "four", "five", "six"]);
  expect(ids(screen)).toEqual(["one", "two", "three", "four", "five", "six"]);
});
