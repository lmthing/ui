import { describe, expect, it } from "vitest";
import { articleEdges, articleHeader, articleReading, parseArticleBody } from "./article";

describe("Article Markdown", () => {
  it("groups paragraphs and quotes, and keeps list order and inline runs", () => {
    const { blocks, links } = parseArticleBody(
      "## A heading\r\nA **strong** start\r\nand _soft_ finish.\r\n\r\n" +
        "> First line\u2028> Second line\n\n- First bullet\n+ Second bullet\n4. Fourth\n5. Fifth",
    );
    expect(
      blocks.map(({ kind, ordinal, runs }) => [kind, ordinal, runs.map(({ text }) => text).join("")]),
    ).toEqual([
      ["heading", undefined, "A heading"],
      ["paragraph", undefined, "A strong start and soft finish."],
      ["quote", undefined, "First line Second line"],
      ["bullet", undefined, "First bullet"],
      ["bullet", undefined, "Second bullet"],
      ["ordered", 4, "Fourth"],
      ["ordered", 5, "Fifth"],
    ]);
    expect(blocks[1]?.runs.filter(({ emphasis }) => emphasis)).toEqual([
      { text: "strong", emphasis: "strong" },
      { text: "soft", emphasis: "emphasis" },
    ]);
    expect(links).toEqual([]);
    expect(articleEdges(blocks[3]!)).toEqual(["• ", ""]);
    expect(articleEdges(blocks[5]!, "ar-EG-u-nu-arab")).toEqual(["٤. ", ""]);
  });

  it("addresses only internal links, including links inside emphasis and repeated destinations", () => {
    const ignored =
      `![image](screen:photo) \\[escaped](screen:skip) [web](https://example.org) ` +
      `[bad ID](screen:Bad) [too long](screen:${"a".repeat(65)}) [ ](screen:blank)`;
    const { blocks, links } = parseArticleBody(
      `**[First](screen:route_1)** then _[Second](screen:route_1)_ and ${ignored}`,
    );
    expect(links).toEqual([
      { title: "First", goto: "route_1" },
      { title: "Second", goto: "route_1" },
    ]);
    expect(blocks[0]?.runs.filter(({ link }) => link !== undefined)).toEqual([
      { text: "First", emphasis: "strong", link: 0 },
      { text: "Second", emphasis: "emphasis", link: 1 },
    ]);
    expect(blocks[0]?.runs.map(({ text }) => text).join("")).toContain(ignored.replace("\\[", "["));
  });
});

describe("Article reading copy", () => {
  const header = { title: "A guide", by: "Ada Reed", date: "2026-11-08", detail: "full" } as const;

  it("counts displayed words, not markup or link destinations", () => {
    const word = "Step ";
    const link = "[Next steps](screen:a_long_screen_id)";
    for (const [start, minutes] of [
      [198, 1],
      [199, 2],
    ] as const) {
      const { blocks } = parseArticleBody(`${word.repeat(start)}${link}`);
      expect(articleHeader({ ...header, blocks }).time).toBe(`${minutes} min read`);
    }
    expect(articleHeader({ ...header, blocks: [] }).time).toBe("1 min read");
  });

  it("localizes date and numbers, and reads only displayed header and body copy", () => {
    const { blocks } = parseArticleBody("## Start\n\n> A thought\n\n2. A [place](screen:there)");
    expect(articleHeader({ ...header, blocks }, "en-US")).toEqual({
      by: "By Ada Reed",
      date: "Nov 8, 2026",
      time: "1 min read",
    });
    expect(articleHeader({ ...header, blocks }, "ar-EG-u-nu-arab").time).toBe("١ min read");
    expect(articleReading({ ...header, blocks }, "en")).toEqual([
      "A guide",
      "By Ada Reed",
      "8 Nov 2026 · 1 min read",
      "Start",
      "“A thought”",
      "2. A place",
    ]);
    expect(articleReading({ ...header, detail: "brief", blocks }, "en")).toEqual([
      "Start",
      "“A thought”",
      "2. A place",
    ]);
  });
});
