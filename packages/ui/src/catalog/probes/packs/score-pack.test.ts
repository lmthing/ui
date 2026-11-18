import { expect, it } from "vitest";
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
