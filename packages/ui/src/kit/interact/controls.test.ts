import { describe, expect, it, vi } from "vitest";
import { components, type ScreenLike } from "@lmthing/ui/catalog";
import { createScreenController } from "./controller";
import { createAgentAccess } from "./agent";
import { createInteractionStore } from "./store";
const screen: ScreenLike = {
  id: "controls",
  components: [
    { id: "c1", c: "Choice", options: [{ title: "Weekly" }, { title: "Single" }] },
    { id: "m1", c: "Choice", multi: true, options: [{ title: "A", on: true }, { title: "B" }] },
    { id: "f1", c: "Field", label: "Name", value: "Fern" },
    { id: "f2", c: "Field", label: "Repeat", kind: "repeat", repeat: "daily" },
    { id: "f3", c: "Field", label: "Remind", kind: "toggle", value: "on" },
    { id: "f4", c: "Field", label: "Level", kind: "slider", value: "5" },
    { id: "f5", c: "Field", label: "Date", kind: "date" },
    { id: "q1", c: "Checklist", items: [{ text: "Water", done: true }, { text: "Walk" }] },
    { id: "l1", c: "List", style: "expand", rows: [{ title: "Question", body: "An answer" }] },
    { id: "n1", c: "Counter", label: "Count", value: 2, step: 3 },
    { id: "t1", c: "Timer", style: "up", label: "Walk", seconds: 10 },
    { id: "s1", c: "Scale", label: "Mood", value: 3 },
    { id: "d1", c: "Calendar", style: "month", month: "June", marked: [], days: 30 },
    { id: "p1", c: "Segmented", options: [{ label: "Today" }, { label: "Week" }], at: 0 },
    { id: "h1", c: "Chips", style: "choose", items: [{ label: "A" }, { label: "B" }] },
    { id: "b1", c: "Bubbles", messages: [{ from: "them", text: "Hello" }] },
    { id: "r1", c: "Composer", style: "reply", hint: "Reply", max: 600 },
    { id: "w1", c: "SwipeStack", cards: [{ title: "A" }, { title: "B" }, { title: "C" }] },
    {
      id: "nav",
      c: "TabBar",
      tabs: [
        { icon: "home", label: "Home", goto: "home" },
        { icon: "mail", label: "Inbox", goto: "inbox", count: 3 },
      ],
    },
  ],
};
function setup() {
  let time = 1000;
  const links = vi.fn(),
    sent = vi.fn(),
    changed = vi.fn();
  const runtime = createScreenController({
    screen,
    defs: components,
    now: () => time,
    onLink: links,
    onSend: sent,
    onChange: changed,
  });
  const agent = createAgentAccess({ current: () => screen, defs: components, store: runtime.store, runtime });
  return {
    runtime,
    agent,
    links,
    sent,
    changed,
    advance: (ms: number) => {
      time += ms;
      runtime.tick();
    },
  };
}
const input = (runtime: ReturnType<typeof createScreenController>, id: string) =>
  runtime.snapshotScreen().components.find((entry) => entry.id === id)!;
describe("live control state", () => {
  it("selects one choice, toggles multiple choices, and rejects contradictory item values", () => {
    const { runtime, agent } = setup();
    expect(agent.act({ address: "c1/r2", action: "select" }).ok).toBe(true);
    expect(input(runtime, "c1").at).toBe(1);
    expect(agent.act({ address: "c1/r1", action: "select", value: 1 })).toMatchObject({ ok: false });
    agent.act({ address: "m1/r1", action: "toggle" });
    expect((input(runtime, "m1").options as { on: boolean }[])[0]!.on).toBe(false);
    runtime.dispose();
  });
  it("edits, clears, chooses recurrence and toggles fields", () => {
    const { runtime, agent, changed } = setup();
    agent.act({ address: "f1/field", action: "type", value: "Basil" });
    expect(input(runtime, "f1").value).toBe("Basil");
    agent.act({ address: "f1/field", action: "type", value: "" });
    expect(input(runtime, "f1").value).toBeUndefined();
    agent.act({ address: "f2/field", action: "select", value: "Weekly" });
    expect(input(runtime, "f2").repeat).toBe("weekly");
    agent.act({ address: "f3/field", action: "toggle" });
    expect(input(runtime, "f3").value).toBe("off");
    agent.act({ address: "f4/field", action: "set", value: 7 });
    expect(input(runtime, "f4").value).toBe("7");
    expect(agent.act({ address: "f5/field", action: "type", value: "2026-02-30" }).ok).toBe(false);
    expect(changed).toHaveBeenCalled();
    runtime.dispose();
  });
  it("uses fixed counter steps, pauses timers at their current value and keeps batches atomic", () => {
    const { runtime, agent, advance } = setup();
    expect(agent.act({ address: "n1/minus", action: "decrement" })).toMatchObject({
      ok: false,
      code: "disabled",
    });
    agent.act({ address: "n1/plus", action: "increment" });
    expect(input(runtime, "n1").value).toBe(5);
    agent.act({ address: "n1/minus", action: "decrement" });
    expect(input(runtime, "n1").value).toBe(2);
    agent.act({ address: "t1/start", action: "start" });
    advance(3000);
    expect(input(runtime, "t1").seconds).toBe(13);
    agent.act({ address: "t1/stop", action: "stop" });
    advance(5000);
    expect(input(runtime, "t1").seconds).toBe(13);
    const before = runtime.store.snapshot();
    expect(
      agent.act([
        { address: "f1/field", action: "type", value: "Changed" },
        { address: "s1/l1", action: "select", value: 5 },
      ]).ok,
    ).toBe(false);
    expect(runtime.store.snapshot()).toEqual(before);
    runtime.dispose();
  });
  it("ticks a checklist, opens a row and updates calendar, scale, tabs and filters", () => {
    const { runtime, agent, links } = setup();
    expect(agent.read()).not.toContain("An answer");
    agent.act({ address: "q1/r1/check", action: "check" });
    expect((input(runtime, "q1").items as { done: boolean }[])[0]!.done).toBe(false);
    agent.act({ address: "l1/r1", action: "toggle" });
    expect(agent.read()).toContain("An answer");
    agent.act({ address: "d1/r12", action: "select" });
    expect(input(runtime, "d1").selected).toBe(12);
    agent.act({ address: "s1/l5", action: "select" });
    expect(input(runtime, "s1").value).toBe(5);
    agent.act({ address: "p1/r2", action: "select" });
    expect(input(runtime, "p1").at).toBe(1);
    agent.act({ address: "h1/r2", action: "select" });
    expect((input(runtime, "h1").items as { on: boolean }[]).map((row) => row.on)).toEqual([false, true]);
    agent.act({ address: "nav/r2", action: "select" });
    expect(input(runtime, "nav").at).toBe(1);
    expect(links).toHaveBeenLastCalledWith("inbox", "controls/nav/r2");
    runtime.dispose();
  });
  it("sends exact text, clears the draft and clips the displayed conversation to its schema", () => {
    const { runtime, agent, sent } = setup();
    expect(agent.act({ address: "r1/send", action: "send" })).toMatchObject({ ok: false, code: "disabled" });
    const text = "  Hello\n" + "a".repeat(130);
    agent.act({ address: "r1/field", action: "type", value: text });
    expect(agent.read()).toContain("\\n");
    agent.act({ address: "r1/send", action: "send" });
    expect(sent).toHaveBeenCalledExactlyOnceWith(text, "controls/r1/field");
    expect(input(runtime, "r1").value).toBeUndefined();
    const messages = input(runtime, "b1").messages as { text: string }[];
    expect(messages).toHaveLength(2);
    expect(messages[1]!.text.length).toBeLessThanOrEqual(120);
    expect(agent.read()).toContain("Bubbles");
    runtime.dispose();
  });
  it("keeps swipe ids stable and can consume a stack atomically", () => {
    const { runtime, agent } = setup();
    expect(
      agent.act([
        { address: "w1/r1", action: "swipe", value: "left" },
        { address: "w1/r2", action: "swipe", value: "right" },
      ]).ok,
    ).toBe(true);
    expect(agent.read()).toContain("r3");
    expect(agent.act({ address: "w1/r1", action: "swipe", value: "left" }).ok).toBe(false);
    agent.act({ address: "w1/r3", action: "swipe", value: "left" });
    expect(input(runtime, "w1").state).toBe("empty");
    runtime.dispose();
  });
  it("persists through a host store, resets only its screen, and refuses unmounted/preview actions", () => {
    const store = createInteractionStore({ "other/f1/field": "Keep" });
    const runtime = createScreenController({ screen, defs: components, store, requireMounted: true });
    expect(runtime.act({ address: "f1/field", action: "type", value: "Basil" })).toMatchObject({
      ok: false,
      code: "not_mounted",
    });
    const unmount = runtime.registerPart("controls/f1/field");
    runtime.act({ address: "f1/field", action: "type", value: "Basil" });
    const replacement = createScreenController({ screen, defs: components, store });
    expect(input(replacement, "f1").value).toBe("Basil");
    replacement.reset();
    expect(store.get("other/f1/field")).toBe("Keep");
    unmount();
    runtime.dispose();
    replacement.dispose();
    expect(
      createScreenController({ screen, defs: components, interactive: false }).act({
        address: "f1/field",
        action: "type",
        value: "x",
      }),
    ).toMatchObject({ ok: false, code: "not_interactive" });
  });
});
