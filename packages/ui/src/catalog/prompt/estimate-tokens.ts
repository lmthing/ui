/** Approximate English prompt tokens as four Unicode code points each; no tokenizer or I/O. */
export function estimateTokens(text: string): number {
  return Math.ceil(Array.from(text).length / 4);
}
