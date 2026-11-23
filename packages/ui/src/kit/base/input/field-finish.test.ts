import { expect, it } from "vitest";
import { component } from "../../../catalog";
import { fieldFinish } from "./field-finish";

it("uses a single bottom rule in notebook and editorial treatments", () => {
  expect(fieldFinish("ruled")).toEqual({
    backgroundColor: "transparent",
    borderColor: "$line",
    borderWidth: component.base.none,
    borderBottomWidth: component.base.borderWidth,
  });
  expect(fieldFinish("ruled", true).backgroundColor).toBe("$line");
});

it("can outline fields instead of using the default raised fill", () => {
  expect(fieldFinish("filled").backgroundColor).toBe("$raised");
  expect(fieldFinish("filled", false, true).backgroundColor).toBe("$surface");
  expect(fieldFinish("outlined").backgroundColor).toBe("$surface");
});
