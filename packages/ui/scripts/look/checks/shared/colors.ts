export type RGB = { r: number; g: number; b: number; a: number };
export const rgb = (value: string | null): RGB | null => {
  const m = value?.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b, a = "1"] = m[1]!.split(/[ ,/]+/).filter(Boolean);
  return { r: +r!, g: +g!, b: +b!, a: +a };
};
export const lum = ({ r, g, b }: RGB) => {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
};
export const ratio = (a: RGB, b: RGB) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};
export const ownBackground = (el: Element) => {
  const color = rgb(getComputedStyle(el).backgroundColor);
  return color && color.a > 0.5 ? color : null;
};
export const backgroundOf = (el: Element | null): RGB => {
  for (let node = el; node; node = node.parentElement) {
    const color = ownBackground(node);
    if (color) return color;
  }
  return { r: 255, g: 255, b: 255, a: 1 };
};
