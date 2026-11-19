import { describe, expect, it } from "vitest";
import { parseRoute } from "./router";

describe("parseRoute", () => {
  it("reads component and pack routes, and treats anything else as home", () => {
    expect(parseRoute("#/c/List")).toEqual({ name: "component", id: "List" });
    expect(parseRoute("#/p/booking")).toEqual({ name: "pack", id: "booking" });
    expect(parseRoute("#packs")).toEqual({ name: "home" });
    expect(parseRoute("")).toEqual({ name: "home" });
  });
});
