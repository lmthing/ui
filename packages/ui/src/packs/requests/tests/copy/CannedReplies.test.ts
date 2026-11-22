import { expect, it } from "vitest";
import { cannedReplySnippet, projectCannedReplies, validReplyCategories } from "../../copy";

it("folds whitespace and shortens only long snippets at a word boundary", () => {
  expect(cannedReplySnippet("One line.\nSecond line.")).toBe("One line. Second line.");
  const short = cannedReplySnippet(
    "Please check the repair report and attach a photo of the whole mechanism before the visit.",
  );
  expect(short).toBe("Please check the repair report and attach a photo of the whole mechanism…");
  expect(cannedReplySnippet("a".repeat(90))).toBe(`${"a".repeat(78)}…`);
});

it("keeps uncategorized templates on All and projects visibility without dropping ids", () => {
  const templates = [
    { id: "r1", title: "One", body: "Pending" },
    { id: "r2", title: "Two", category: "Update", body: "Ordered" },
  ];
  expect(validReplyCategories({ categories: ["Update"], templates })).toBe(true);
  expect(projectCannedReplies({ templates, activeCategory: "Update", preview: "r2" })).toMatchObject({
    templates: [
      { id: "r1", visible: false, previewOpen: false },
      { id: "r2", visible: true, previewOpen: true },
    ],
  });
});
