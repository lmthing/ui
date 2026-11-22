export const barcodeQuiet = 10;

/** The module count for printable Code 128 B or a complete string of Code 128 C digit pairs. */
export function barcodeModules(value: string | undefined) {
  if (!value || /[^\x20-\x7E]/.test(value)) return;
  const pairs = value.length % 2 === 0 && !/\D/.test(value);
  const symbols = pairs ? value.length / 2 : value.length;
  return { pairs, side: 2 * barcodeQuiet + 11 * (symbols + 2) + 13 };
}
