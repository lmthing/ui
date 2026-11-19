import { expect, it } from "vitest";
import { anyoneLabel } from "../../copy";

it("keeps the no-preference provider label unchanged", () => {
  expect(anyoneLabel).toBe("Anyone");
});
