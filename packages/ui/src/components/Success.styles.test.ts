import { describe, expect, it } from "vitest";
import { affordancesOf, components, readComponent } from "@lmthing/ui/catalog";
import { KitCard, KitEmpty } from "@lmthing/ui/kit";
import { Success } from "./Success";

const { props, meta, examples } = components.Success;

type ScreenView = {
  type: unknown;
  props: { children: { type: unknown; props: unknown }; [key: string]: unknown };
};

describe("Success view", () => {
  it("omits absent detail and preserves the default or a custom icon", () => {
    for (const icon of [undefined, "leaf"] as const) {
      const parsed = props.parse({ title: "Saved", icon });
      const view = Success(parsed) as ScreenView;
      expect(view.props.children.props).toEqual({
        title: "Saved",
        icon: icon ?? "circle_check",
        fill: true,
        tone: "good",
      });
    }
  });
  const screens = examples.filter((example) => !("style" in example));
  it.each(screens)("draws the centred good-toned kit state with a root address", (example) => {
    const parsed = props.parse(example);
    const view = Success(parsed) as ScreenView;
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({ style: "plain", part: "root" });
    expect(view.props.children.type).toBe(KitEmpty);
    const { title, sub, icon } = parsed;
    expect(view.props.children.props).toEqual({
      title,
      ...(sub ? { sub } : {}),
      icon,
      fill: true,
      tone: "good",
    });
  });
  it.each(screens)("reads the shown content without offering actions", (example) => {
    const parsed = props.parse(example);
    const read = readComponent(components.Success, example, "s1").join("\n");
    expect(read).toContain(`"${parsed.title}"`);
    if (parsed.sub) expect(read).toContain(`"${parsed.sub}"`);
    expect(affordancesOf(meta, parsed, "s1")).toEqual([]);
  });
  it("treats an undo as a toast, whatever style was written", () => {
    expect(props.parse({ title: "Saved", undo: true }).style).toBe("toast");
    expect(props.parse({ title: "Saved", style: "screen", undo: true }).style).toBe("toast");
  });
  it("offers undo and dismiss only on a toast", () => {
    const toast = props.parse({ style: "toast", title: "Walk cancelled", undo: true });
    expect(affordancesOf(meta, toast, "s1")).toEqual([
      { address: "s1/close", part: "close", action: "dismiss", detail: "" },
      { address: "s1/undo", part: "undo", action: "press", detail: "" },
    ]);
    const plain = props.parse({ style: "toast", title: "Walk cancelled" });
    expect(affordancesOf(meta, plain, "s1").map((a) => a.part)).toEqual(["close"]);
    expect(
      readComponent(components.Success, { style: "toast", title: "Done", undo: true }, "s1").join("\n"),
    ).toContain("Undo");
  });
});
