import { describe, expect, it } from "vitest";
import { climb, formatAddress, parseAddress } from "./index";

describe("address grammar", () => {
  it.each(["home", "home/l1", "home/l1/r2", "home/l1/r2/title", "home/l1/root", "home/~after:l1"])(
    "round-trips %s",
    (value) => {
      const parsed = parseAddress(value);
      expect(parsed).not.toBeNull();
      expect(formatAddress(parsed!)).toBe(value);
    },
  );
  it("round-trips combinations of screen, component, item and part", () => {
    for (const screen of ["home", "my_plants", "walks_2"]) {
      for (const component of ["l1", "plant_list"]) {
        for (const item of ["r1", "r20", "r999"]) {
          for (const part of ["root", "title", "trail"]) {
            const address = { screen, component, item, part };
            expect(parseAddress(formatAddress(address))).toEqual(address);
          }
        }
      }
    }
  });
  it.each([
    "",
    "/home",
    "home/",
    "Home/l1",
    "home/l1/",
    "home/l1/r1/title/extra",
    "home/~after:",
    "home/~after:l1/title",
    "home/l1/title/root",
    "home//title",
  ])("rejects malformed %s", (value) => expect(parseAddress(value)).toBeNull());
  it("climbs through every ancestor, including gaps and direct parts", () => {
    let address = parseAddress("home/l1/r2/title");
    const parents = [];
    while (address) {
      parents.push(formatAddress(address));
      address = climb(address);
    }
    expect(parents).toEqual(["home/l1/r2/title", "home/l1/r2", "home/l1", "home"]);
    expect(climb({ screen: "home", after: "l1" })).toEqual({ screen: "home" });
    expect(climb({ screen: "home", component: "l1", part: "root" })).toEqual({
      screen: "home",
      component: "l1",
    });
  });
  it("rejects ambiguous or invalid structured addresses", () => {
    expect(() => formatAddress({ screen: "home", part: "title" })).toThrow();
    expect(() => formatAddress({ screen: "home", component: "l1", part: "r1" })).toThrow();
    expect(() => formatAddress({ screen: "home", component: "l1", item: "fern" })).toThrow();
    expect(() => formatAddress({ screen: "home", component: "l1", after: "l2" })).toThrow();
  });
});
