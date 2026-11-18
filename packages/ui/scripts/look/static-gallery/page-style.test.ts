import { expect, it } from "vitest";
import { pageStyle } from "./page-style";

it("keeps theme roles, explicit hidden states, responsive navigation and visible keyboard focus", () => {
  const css = pageStyle();
  expect(css).toContain("prefers-color-scheme:dark");
  expect(css).toContain(':root[data-theme="dark"]');
  expect(css).toContain("color:var(--text)");
  expect(css).toContain("[hidden]{display:none!important}");
  expect(css).toContain("@media(min-width:1000px)");
  expect(css).toContain("top:var(--header-height)");
  expect(css).toContain(":focus-visible");
  expect(css).toContain('body[data-view="compact"]');
  expect(css).toContain('article[data-status="draft"] .thumb{opacity:.55}');
});
