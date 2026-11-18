// What a model reads must match what a person sees, and every action it is offered must exist on
// screen with an accessible role that accepts it. Runs for every ready component and example.
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  readComponent,
  stampItemIds,
  type ComponentName,
} from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { existsSync } from "node:fs";
import { renderInstance } from "./render";

const ready = Object.keys(renderers) as ComponentName[];
const theme = { preset: "calm", mode: "light", accent: "moss" } as never;
const roles: Record<string, string[]> = {
  press: ["button", "link"],
  toggle: ["switch", "checkbox", "button"],
  check: ["checkbox"],
  select: ["radio", "tab", "button", "option", "radiogroup"],
  swipe: ["button"],
  increment: ["button"],
  decrement: ["button"],
  start: ["button"],
  stop: ["button"],
  dismiss: ["button"],
  type: ["textbox", "searchbox"],
  set: ["slider", "spinbutton"],
};

const decode = (text: string) =>
  text
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const voidTags = /^<(area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i;

/** Text a person sees: everything outside <style> and outside decorative (aria-hidden) subtrees. */
function visibleTexts(html: string): string[] {
  const body = html.replace(/<style[\s\S]*?<\/style>/g, "");
  const texts: string[] = [];
  let hidden = 0; // depth inside an aria-hidden element, 0 when visible
  for (const token of body.split(/(<[^>]+>)/)) {
    if (!token.startsWith("<")) {
      const text = decode(token).trim();
      if (text && hidden === 0) texts.push(text);
      continue;
    }
    // A text box shows its value: <input value="Fern"> is text on screen.
    const value = /^<input\b/i.test(token) ? token.match(/\bvalue="([^"]*)"/)?.[1] : undefined;
    if (value && hidden === 0) texts.push(decode(value).trim());
    const closing = token.startsWith("</");
    const selfClosing = token.endsWith("/>") || voidTags.test(token);
    if (hidden > 0) hidden += closing ? -1 : selfClosing ? 0 : 1;
    else if (!closing && !selfClosing && /aria-hidden="true"/.test(token)) hidden = 1;
  }
  return texts;
}

function labels(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => decode(m[1]!));
}

function roleAt(html: string, testId: string): { found: boolean; role: string | undefined } {
  const tag = html.match(new RegExp(`<[^>]*data-testid="${testId.replace(/\//g, "\\/")}"[^>]*>`))?.[0];
  return { found: Boolean(tag), role: tag?.match(/\brole="([^"]+)"/)?.[1] };
}

describe.each(ready)("%s reads as text and can be acted on", (id) => {
  const def = components[id];
  // An open problem listed in test/known/<Id>.md is expected to fail until it is fixed.
  const known = existsSync(`${import.meta.dirname}/known/${id}.md`);
  const test = known ? it.fails : it;
  test.each(def.examples.map((example, index) => ({ example, index })))("example $index", ({ example }) => {
    const html = renderInstance(id, example, "filled", theme);
    const read = readComponent(def, example, "c1").join("\n");
    const seen = visibleTexts(html);
    const named = labels(html);
    const quoted = [...read.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!.replace(/\\"/g, '"'));
    for (const text of seen) expect(read, `visible text missing from the read: "${text}"`).toContain(text);
    for (const text of quoted) {
      const shown = seen.some((s) => s.includes(text)) || named.includes(text);
      expect(shown, `read offers text that is not on screen: "${text}"`).toBe(true);
    }
    const props = stampItemIds(def.meta, def.props.parse(example) as Record<string, unknown>);
    for (const affordance of affordancesOf(def.meta, props, "c1")) {
      const testId = `home/${affordance.address}${affordance.part === "root" ? "/root" : ""}`;
      const { found, role } = roleAt(html, testId);
      expect(found, `${affordance.address} offers ${affordance.action} but is not on screen`).toBe(true);
      expect(roles[affordance.action] ?? [], `${affordance.address} has role ${role ?? "none"}`).toContain(
        role,
      );
    }
  });
});
