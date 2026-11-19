import { expect, it } from "vitest";
import { defaultLang, languageLookup, localeOf } from ".";

it("picks an exact locale, then the base language, then English", () => {
  const lookup = languageLookup({ save: "Save" });
  const removeBase = lookup.register("de", { save: "Speichern" });
  const removeRegion = lookup.register("de-AT", { save: "[Speichern]" });
  expect(lookup.words("de-at").save).toBe("[Speichern]");
  removeRegion();
  expect(lookup.words("de-AT").save).toBe("Speichern");
  removeBase();
  expect(lookup.words("de-AT").save).toBe("Save");
  expect(localeOf("not_a_tag")).toBe(defaultLang);
});
