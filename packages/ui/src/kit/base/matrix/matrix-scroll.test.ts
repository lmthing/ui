import { expect, it, vi } from "vitest";
import { revealMatrixAnchor } from "./matrix-scroll";

it("scrolls before asking the native host to move accessibility focus to its header", () => {
  const anchor = { focus: vi.fn() };
  const scrollTo = vi.fn();
  const ensureVisible = vi.fn();
  const focusAccessibility = vi.fn();
  revealMatrixAnchor(264, anchor, { scrollTo }, false, { ensureVisible, focusAccessibility });
  expect(scrollTo).toHaveBeenCalledWith({ x: 264, y: 0, animated: false });
  expect(ensureVisible).toHaveBeenCalledWith(anchor);
  expect(focusAccessibility).toHaveBeenCalledWith(anchor);
  expect(focusAccessibility.mock.invocationCallOrder[0]).toBeGreaterThan(
    scrollTo.mock.invocationCallOrder[0]!,
  );
  expect(anchor.focus).not.toHaveBeenCalled();
});
