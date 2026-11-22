import { expect, it, vi } from "vitest";
import { createDisabledParts, registerPart } from ".";

it("cleans up only its own address, even when called twice", () => {
  const other = Symbol("other");
  const parts = new Map([["other", other]]);
  const remove = registerPart(parts, "part");

  expect(parts.has("part")).toBe(true);
  remove();
  remove();
  expect(parts).toEqual(new Map([["other", other]]));
});

it("keeps a replacement when the stale registration cleans up", () => {
  const parts = new Map<string, symbol>();
  const removeFirst = registerPart(parts, "part");
  const first = parts.get("part");
  const removeSecond = registerPart(parts, "part");
  const second = parts.get("part");

  expect(second).toBeDefined();
  expect(second).not.toBe(first);
  removeFirst();
  expect(parts.get("part")).toBe(second);
  removeSecond();
  expect(parts.has("part")).toBe(false);
});

it("keeps a part disabled until the last owner releases it and reports only effective changes", () => {
  const registry = createDisabledParts();
  const listener = vi.fn();
  const stop = registry.subscribe(listener);
  const host = registry.register("cell");
  const loading = registry.register("cell");
  expect(listener).toHaveBeenCalledTimes(1);
  loading();
  loading();
  expect(registry.parts.has("cell")).toBe(true);
  expect(listener).toHaveBeenCalledTimes(1);
  host();
  expect(registry.parts.has("cell")).toBe(false);
  expect(listener).toHaveBeenCalledTimes(2);
  stop();
  registry.register("cell")();
  expect(listener).toHaveBeenCalledTimes(2);
});
