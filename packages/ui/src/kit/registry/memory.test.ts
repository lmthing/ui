import { expect, it } from "vitest";
import { createMemoryParts } from "./index";

it("keeps replacement parts when an older revision unmounts", () => {
  const parts = createMemoryParts();
  const entry = {
    screen: "home",
    rev: 1,
    address: "home/l1/root",
    rect: { x: 0, y: 0, width: 44, height: 44 },
  };
  parts.register(entry);
  parts.register({ ...entry, rev: 2 });
  parts.unregister(entry);
  expect(parts.snapshot()).toHaveLength(1);
  parts.unregister({ ...entry, rev: 2 });
  expect(parts.snapshot()).toHaveLength(0);
});
