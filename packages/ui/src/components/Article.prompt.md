## Purpose

Read a long piece with headings, paragraphs, quotes and links.

## Pick

A long article, guide, or policy with several paragraphs and structured text. Not one short supporting sentence (Note), expandable answers (List), a community post (Post), or terms to sign (Agreement).

## Writer

- Body uses headings, paragraphs, lists, quotes, > [!NOTE] callouts, bold, italic and [label](screen:screen_id) links. No HTML or external links.
- Use style "book" for a book page, "response" for a long answer with attribution at the end, or omit for a regular article. Set paper and fontScale only when requested.
- Copy this JSON body pattern: "## Heading\nFirst paragraph.\n\nSecond paragraph." Put each heading, quote and list item on its own line. Use JSON escapes, not tabs, spaces or invisible characters for line breaks. Keep headings short and paragraphs focused.
- For body-only reading with no header, set detail "brief". Keep title in the line; reading time is computed. Leave density null unless the brief explicitly asks for tighter spacing.
