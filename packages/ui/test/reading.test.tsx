// What a model reads must match what a person sees, and every action it is offered must exist on
// screen with an accessible role that accepts it. Runs for every ready component and example.
import { describe, expect, it } from "vitest";
import {
  affordancesOf,
  components,
  isDeviceDataVisible,
  readComponent,
  stampItemIds,
  type ComponentName,
} from "@lmthing/ui/catalog";
import { renderers } from "@lmthing/ui/kit";
import { existsSync } from "node:fs";
import { addressedElements, hasStepTarget, renderExample } from "./render";
import { selectedIds } from "../scripts/build";
import { decode, peekForExample, visibleTexts } from "./variants";

const ready = selectedIds(Object.keys(renderers) as ComponentName[]);
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
  send: ["button"],
  play: ["button"],
  pause: ["button"],
  seek: ["slider"],
  type: ["textbox", "searchbox"],
  set: ["slider", "spinbutton"],
};

function labels(html: string): string[] {
  return [...html.matchAll(/aria-label="([^"]*)"/g)].map((m) => decode(m[1]!));
}

describe.each(ready)("%s reads as text and can be acted on", (id) => {
  const def = components[id];
  // An open problem listed in test/known/<Id>.md is expected to fail until it is fixed.
  const known = existsSync(`${import.meta.dirname}/known/${id}.md`);
  const test = known ? it.fails : it;
  test.each(def.examples.map((example, index) => ({ example, index })))("example $index", ({ example }) => {
    const { html, deviceData, props: parsed } = renderExample(id, example, "filled", theme);
    const read = readComponent(def, example, "c1", "filled", {}, undefined, deviceData).join("\n");
    if (!isDeviceDataVisible(def.meta, deviceData)) {
      expect(read).toBe("");
      expect(addressedElements(html).size).toBe(0);
      return;
    }
    const seen = visibleTexts(html);
    const named = labels(html);
    const quoted = [...read.matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]!.replace(/\\"/g, '"'));
    for (const text of seen) expect(read, `visible text missing from the read: "${text}"`).toContain(text);
    for (const text of quoted) {
      const shown = seen.some((s) => s.includes(text)) || named.includes(text);
      expect(shown, `read offers text that is not on screen: "${text}"`).toBe(true);
    }
    const props = stampItemIds(def.meta, parsed);
    const { hidden, issues } = peekForExample(def.meta, props, html);
    expect(issues).toEqual([]);
    const addressed = addressedElements(html);
    for (const affordance of affordancesOf(def.meta, props, "c1")) {
      if (hidden.includes(affordance.address.split("/")[1]!)) continue;
      expect(read, `${affordance.address} is missing from the read`).toContain(
        `[${affordance.address} ${affordance.action}`,
      );
      const testId = `home/${affordance.address}${affordance.part === "root" ? "/root" : ""}`;
      const element = addressed.get(testId);
      expect(element, `${affordance.address} offers ${affordance.action} but is not on screen`).toBeDefined();
      if (element && hasStepTarget(element, affordance.action)) continue;
      const role = element?.attributes.match(/\brole="([^"]+)"/)?.[1];
      expect(roles[affordance.action] ?? [], `${affordance.address} has role ${role ?? "none"}`).toContain(
        role,
      );
    }
  });
});
