import { expect, it } from "vitest";
import { component, editorial, kitStyleOf, paper } from "../../../catalog";
import { fieldFinish, fieldType } from "./field-finish";

it("uses a single bottom rule in notebook and editorial treatments", () => {
  expect(fieldFinish("ruled")).toEqual({
    backgroundColor: "transparent",
    borderColor: "$muted",
    borderWidth: component.base.none,
    borderBottomWidth: component.base.borderWidth,
  });
  expect(fieldFinish("ruled", true).backgroundColor).toBe("$line");
  expect(fieldFinish("serifRule")).toEqual(fieldFinish("ruled"));
  expect(fieldType(kitStyleOf(editorial))).toMatchObject({
    fontFamily: expect.stringContaining("Fraunces"),
    fontWeight: "600",
  });
  expect(fieldType(kitStyleOf(paper))).toEqual({ fontFamily: expect.stringContaining("Source Serif 4") });
});

it("can outline fields instead of using the default raised fill", () => {
  expect(fieldFinish("filled").backgroundColor).toBe("$raised");
  expect(fieldFinish("filled", false, true).backgroundColor).toBe("$surface");
  expect(fieldFinish("filled", false, false, true).backgroundColor).toBe("$surface");
  expect(fieldFinish("outlined").backgroundColor).toBe("$surface");
  expect(fieldFinish("ink")).toMatchObject({ backgroundColor: "$surface", borderColor: "$text" });
});
