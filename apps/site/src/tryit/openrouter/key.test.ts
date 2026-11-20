import { describe, expect, it } from "vitest";
import { looksLikeKey, maskKey } from "./key";

describe("key", () => {
  it("masks all but the prefix and the last four characters", () => {
    expect(maskKey("sk-or-v1-0123456789abcdefwxyz")).toBe("sk-or-v1-…wxyz");
    expect(maskKey("other-key-1234")).toBe("…1234");
  });
  it("accepts only plausible OpenRouter keys", () => {
    expect(looksLikeKey(" sk-or-v1-0123456789abcdef0123 ")).toBe(true);
    expect(looksLikeKey("sk-ant-0123456789abcdef0123")).toBe(false);
    expect(looksLikeKey("sk-or-short")).toBe(false);
  });
});
