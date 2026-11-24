import { component, size, space } from "../../../catalog";

// Conservative advances in ems, not measured text. Flex layout still uses the actual font
// metrics when wrapping, and an unusually wide label can always wrap inside its own chip.
function advance(char: string) {
  if (/^[\p{Mark}\u200d]$/u.test(char)) return 0;
  if (/^[\s'.,:;!ijltI]$/u.test(char)) return 0.45;
  if (/^[mwMW@%&]$/u.test(char)) return 1;
  if (/^[A-Z0-9]$/u.test(char)) return 0.8;
  return /^[\x20-\x7e]$/.test(char) ? 0.65 : 1.2;
}

export function segmentColumns(
  width: number | undefined,
  fontSize: number,
  labels: readonly { label: string; custom: boolean }[],
) {
  if (width === undefined || labels.length <= 1) return 1;
  const slot = labels.reduce((longest, { label, custom }) => {
    const text = Array.from(label).reduce((sum, char) => sum + advance(char) * fontSize, 0);
    const padding = space.sm * 2 + (custom ? space.xs * 2 : 0);
    return Math.max(longest, size.control.md, Math.ceil(text) + padding + 2 * component.base.strongBorder);
  }, 0);
  const capacity = Math.max(1, Math.floor((width - space.xs * 2) / slot));
  const rows = Math.ceil(labels.length / capacity);
  return Math.ceil(labels.length / rows);
}
