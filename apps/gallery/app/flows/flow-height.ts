import { component, size, space, type FlowFrame, type ScreenLike } from "@lmthing/ui/catalog";

export function flowHeight(screen: ScreenLike, frame: FlowFrame) {
  const hasFooter = screen.components.some(({ c }) => c === "Button");
  const hasStatus = screen.components.some(({ c }) => c === "Banner");
  const rows = screen.components.reduce((total, entry) => {
    const items = entry.c === "KeyValue" ? entry.pairs : entry.c === "List" ? entry.rows : [];
    return total + (Array.isArray(items) ? items.length : 0);
  }, 0);
  const textOnly = screen.components.every(({ c }) => c === "Header" || c === "Note" || c === "Button");
  const baseline = component.Gallery.flowHeight;
  if (frame.demoInputs?.length) {
    const extraRows = frame.demoInputs.length - 1 + (frame.choiceButtons ? frame.forward.length - 1 : 0);
    return baseline + extraRows * (size.control.md + space.md);
  }
  if (screen.components.some(({ c }) => c === "Waitlist")) return baseline + 3 * space.lg;
  if (textOnly) return baseline - (hasFooter ? 6 : 8) * space.lg;
  if (hasStatus) return baseline - (screen.components.some(({ c }) => c === "List") ? 4 : 3) * space.lg;
  const choices = screen.components.find(({ id }) => id === "choices");
  const hasChoices = Array.isArray(choices?.rows);
  return baseline + Math.max(0, rows - 2) * size.control.md - (hasFooter || hasChoices ? 0 : 4 * space.lg);
}
