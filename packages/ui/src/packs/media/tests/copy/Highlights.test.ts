import { describe, expect, it } from "vitest";
import { highlightQuote } from "../../copy";
import { mediaWordsFor, registerMediaWords } from "../../lang";

describe("highlightQuote", () => {
  it("marks an excerpt without changing the author's words", () => {
    expect(highlightQuote("Don't rush.")).toBe("“Don't rush.”");
  });

  it("uses the requested dictionary and falls back to English when unregistered", () => {
    const en = mediaWordsFor("en");
    registerMediaWords("fr", { ...en, highlights: { ...en.highlights, quote: (text) => `« ${text} »` } });
    expect(highlightQuote("Bonjour", "fr")).toBe("« Bonjour »");
    expect(highlightQuote("Hello", "de")).toBe("“Hello”");
  });
});
