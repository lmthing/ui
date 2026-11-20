import { expect, it, vi } from "vitest";
import { checkRhythm } from "./rhythm";

function node(
  parentElement: Element | null,
  top: number,
  bottom: number,
  attributes: Record<string, string> = {},
): Element {
  const el = {
    parentElement,
    localName: "div",
    getAttribute: (name: string) => attributes[name] ?? null,
    getBoundingClientRect: () => ({ top, bottom }),
    closest(selector: string) {
      const matches =
        selector === '[role="listitem"]' ? attributes.role === "listitem" : "data-look-timed" in attributes;
      return matches ? el : (parentElement?.closest(selector) ?? null);
    },
  };
  return el as unknown as Element;
}

function frame() {
  const roots: Element[] = [];
  const frameEl = Object.assign(node(null, 0, 800), {
    querySelectorAll: () => roots,
    contains(el: Element | null) {
      for (; el; el = el.parentElement) if (el === frameEl) return true;
      return false;
    },
  });
  const add = vi.fn();
  const root = (parent: Element, top: number, bottom: number, role?: string) =>
    roots.push(
      node(parent, top, bottom, {
        "data-testid": `screen/c1/r${roots.length + 1}/root`,
        ...(role && { role }),
      }),
    );
  const run = () => checkRhythm({ frameEl, frame: "screen", box: frameEl.getBoundingClientRect(), add });
  return { frameEl, root, run, add };
}

function deviceRoom(list: Element, root: ReturnType<typeof frame>["root"], lastTop: number) {
  const thermostat = node(list, 56, 340, { role: "listitem" });
  const humidity = node(list, 352, 502, { role: "listitem" });
  const lamp = node(list, lastTop, lastTop + 116, { role: "listitem" });
  root(node(thermostat, 56, 340), 116, 160, "switch");
  root(humidity, 352, 502, "group");
  root(node(lamp, lastTop, lastTop + 116), lastTop + 12, lastTop + 56, "switch");
}

it("measures Devices cards rather than their mixed switch and card roots", () => {
  const { frameEl, root, run, add } = frame();
  const room = node(frameEl, 56, 630, { role: "list" });
  deviceRoom(room, root, 514);
  root(node(frameEl, 660, 734), 666, 734, "group");
  run();
  expect(add).not.toHaveBeenCalled();
});

it("still reports a real uneven gap between sibling device cards", () => {
  const { frameEl, root, run, add } = frame();
  deviceRoom(node(frameEl, 56, 640, { role: "list" }), root, 521);
  run();
  expect(add).toHaveBeenCalledExactlyOnceWith(
    "rhythm",
    "screen",
    frameEl,
    "gaps between items vary from 12 to 19px",
  );
});

it("compares same-kind sibling roots with the original strict threshold", () => {
  const { frameEl, root, run, add } = frame();
  for (const top of [0, 48, 102]) root(frameEl, top, top + 44, "button");
  run();
  expect(add).not.toHaveBeenCalled();
  root(frameEl, 164, 208, "button");
  run();
  expect(add).toHaveBeenCalledExactlyOnceWith(
    "rhythm",
    "screen",
    frameEl,
    "gaps between items vary from 4 to 18px",
  );
});

it("does not compare different root kinds or separate sibling groups", () => {
  const { frameEl, root, run, add } = frame();
  for (const top of [0, 48, 96]) root(frameEl, top, top + 44, "button");
  for (const top of [200, 264, 328]) root(frameEl, top, top + 44, "group");
  const other = node(frameEl, 400, 800);
  for (const top of [400, 476, 552]) root(other, top, top + 44, "button");
  run();
  expect(add).not.toHaveBeenCalled();
});

it("checks list cells across presentational grid rows", () => {
  const { frameEl, root, run, add } = frame();
  const list = node(frameEl, 0, 164, { role: "list" });
  for (const top of [0, 48, 120]) {
    const row = node(list, top, top + 44, { role: "presentation" });
    const cell = node(row, top, top + 44, { role: "listitem" });
    root(cell, top, top + 44, "group");
  }
  run();
  expect(add).toHaveBeenCalledExactlyOnceWith(
    "rhythm",
    "screen",
    frameEl,
    "gaps between items vary from 4 to 28px",
  );
});

it("still ignores intentional gaps in timed layouts", () => {
  const { frameEl, root, run, add } = frame();
  const timed = node(frameEl, 0, 200, { "data-look-timed": "true" });
  for (const top of [0, 48, 120]) root(timed, top, top + 44);
  run();
  expect(add).not.toHaveBeenCalled();
});
