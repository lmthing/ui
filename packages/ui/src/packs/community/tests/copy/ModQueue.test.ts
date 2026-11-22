import { expect, it } from "vitest";
import { modQueueCount, modQueueItems, modQueuePresentation, modQueueRowMeta } from "../../copy";

const join = {
  id: "ana_join",
  kind: "join",
  status: "pending",
  author: "Ana Reed",
  summary: "Wants to join",
  submittedAt: "2026-11-21T23:30:00-05:00",
  detail: "Lives nearby",
} as const;

it("keeps the submission's local day while formatting the date and count for the app language", () => {
  const { text } = modQueueRowMeta(join, "en-GB");
  expect(text).toBe("Join request · 21 Nov 2026, 23:30");
  expect(modQueueCount([join, { ...join, status: "approved" }], "en-GB")).toBe("1");
  expect(modQueueCount([join], "ar-EG-u-nu-arab")).toBe("١");
});

it("projects only a current rule draft and hides brief detail without changing the seed", () => {
  const [row] = modQueueItems({ items: [join], style: "joins", rules: ["Local residents only"] });
  const current = { ...row!, selectedRule: "ana_join:Local residents only" };
  const stale = { ...row!, selectedRule: "old_join:Local residents only" };
  const result = modQueuePresentation({ items: [current, stale], detail: "brief" }, "m1", {});
  expect(result).toMatchObject({
    items: [{ detail: undefined, selectedRule: current.selectedRule }, { selectedRule: undefined }],
  });
  expect(current.detail).toBe("Lives nearby");
});
