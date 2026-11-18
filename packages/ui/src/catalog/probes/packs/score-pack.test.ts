import { expect, expectTypeOf, it } from "vitest";
import type { PackProbe } from "..";
import type { PackId } from "../../meta";
import { scorePack } from "./index";

it.each([
  ['["commerce","booking"]', ["booking", "commerce"], true],
  ["[]", [], true],
  ['["booking"]', [], false],
  ['["unknown"]', [], false],
  ['["booking","commerce","team","home"]', [], false],
  ['["booking"]', ["commerce"], false],
  ["booking", ["booking"], false],
  ['```json\n["booking"]\n```', ["booking"], true],
] as const)("scores %s", (reply, expected, pass) => {
  expect(scorePack(reply, ["booking", "commerce", "team", "home"], expected).pass).toBe(pass);
});

it("types optional additions as pack ids", () => {
  expectTypeOf<PackProbe["allow"]>().toEqualTypeOf<readonly PackId[] | undefined>();
});

it.each([
  ['["booking"]', ["booking"], ["customers"], true],
  ['["booking","customers"]', ["booking"], ["customers"], true],
  ['["customers","booking"]', ["booking"], ["customers"], true],
  ['["customers"]', ["booking"], ["customers"], false],
  ["[]", ["booking"], ["customers"], false],
  ['["booking","customers","books"]', ["booking"], ["customers"], false],
  ['["booking","team"]', ["booking"], ["customers"], false],
  ['["booking","customers"]', ["booking", "commerce"], ["customers"], false],
  ['["booking","commerce","customers"]', ["booking", "commerce"], ["customers"], true],
  ['["booking","customers"]', ["booking"], [], false],
  ['["booking","unknown"]', ["booking"], ["unknown"], false],
  ['["booking","customers","commerce","team"]', ["booking"], ["customers", "commerce", "team"], false],
  ['{"packs":["booking","customers"]}', ["booking"], ["customers"], false],
  ['["booking",3]', ["booking"], ["customers"], false],
  ['```json\n["booking","customers"]\n```', ["booking"], ["customers"], true],
  ['["booking","booking","customers"]', ["booking"], ["customers"], true],
  ['["customers"]', [], ["customers"], true],
  ["[]", [], ["customers"], true],
] as const)("scores optional additions in %s", (reply, expected, allowed, pass) => {
  expect(
    scorePack(reply, ["booking", "customers", "commerce", "team", "home", "books"], expected, allowed).pass,
  ).toBe(pass);
});
