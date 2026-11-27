import { component, size, space, type ScreenLike } from "@lmthing/ui/catalog";

export function flowHeight(screen: ScreenLike) {
  const hasFooter = screen.components.some(({ c }) => c === "Button");
  const hasStatus = screen.components.some(({ c }) => c === "Banner");
  const rows = screen.components.reduce((total, entry) => {
    const items = entry.c === "KeyValue" ? entry.pairs : entry.c === "List" ? entry.rows : [];
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
  const textOnly = screen.components.every(({ c }) => c === "Header" || c === "Note" || c === "Button");
  const baseline = component.Gallery.flowHeight;
  const rowGrowth = Math.max(0, rows - 2) * size.control.md + (rows >= 4 ? 3 * space.lg : 0);
  if (screen.components.some(({ c }) => c === "Composer")) return baseline + 7 * space.lg;
  if (screen.components.some(({ c }) => c === "FilterBar")) return baseline + 5 * space.lg;
  if (screen.components.some(({ c }) => c === "HandoffReceipt"))
    return baseline + (screen.components.some(({ id }) => id === "choices") ? 9 : 3) * space.lg;
  if (screen.components.some(({ c }) => c === "Waitlist")) return baseline + 3 * space.lg;
  if (textOnly) return baseline - (hasFooter ? 6 : 8) * space.lg;
  if (hasStatus) return baseline + rowGrowth - (rows < 3 ? 3 * space.lg : 0);
  const choices = screen.components.find(({ id }) => id === "choices");
  const hasChoices = Array.isArray(choices?.rows);
  const stacked = screen.components.filter(({ c }) => c === "Steps" || c === "Profile").length;
  return baseline + rowGrowth + stacked * 4 * space.lg - (hasFooter || hasChoices ? 0 : 4 * space.lg);
}
