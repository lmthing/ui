import { describe, expect, it } from "vitest";
import { affordancesOf, components, readComponent } from "@lmthing/ui/catalog";
import { KitCard, KitContent, KitEmpty } from "@lmthing/ui/kit";
import { Empty } from "./Empty";

const { props, meta, examples } = components.Empty;

describe("Empty view", () => {
  it.each(examples)("draws the standalone kit empty state with a root address", (example) => {
    const parsed = props.parse(example);
    const view = Empty(parsed);
    expect(view.type).toBe(KitCard);
    expect(view.props).toMatchObject({ style: "plain", part: "root" });
    const [empty] = [view.props.children].flat();
    const { title, sub, icon } = parsed;
    if (parsed.kind !== "none") {
      expect(empty.type).toBe(KitContent);
      expect(empty.props.children[0].props.children).toBe(title);
      expect(empty.props.children[1].props.children).toBe(sub);
      return;
    }
    expect(empty.type).toBe(KitEmpty);
    expect(empty.props).toEqual({
      title,
      ...(sub ? { sub } : {}),
      ...(icon ? { icon } : {}),
      announce: "status",
      fill: true,
    });
  });
  it.each(examples)("reads the shown content and offers a retry only after a failure", (example) => {
    const parsed = props.parse(example);
    const read = readComponent(components.Empty, example, "e1").join("\n");
    expect(read).toContain(`"${parsed.title}"`);
    if (parsed.sub) expect(read).toContain(`"${parsed.sub}"`);
    expect(affordancesOf(meta, parsed, "e1")).toEqual(
      parsed.kind === "none" ? [] : [{ address: "e1/retry", part: "retry", action: "press", detail: "" }],
    );
  });
});

describe("Empty kinds", () => {
  it.each([
    { title: "Nothing here yet", kind: "weird" },
    { title: "Nothing here yet", retryable: true },
  ])("rejects an unknown kind or a written retry flag", (input) =>
    expect(props.safeParse(input).success).toBe(false),
  );
  it("draws a retry button with a default icon for a failure or offline", () => {
    for (const kind of ["error", "offline"] as const) {
      const view = Empty(props.parse({ title: "Oops", kind }));
      const content = view.props.children;
      const retry = content.props.children.at(-1);
      expect(content.props.lead.props.name).toBe(kind === "error" ? "alert" : "wifi");
      expect(retry.props).toMatchObject({ part: "retry", kind: "secondary", full: true });
    }
    const quiet = Empty(props.parse({ title: "Nothing" }));
    expect([quiet.props.children].flat().filter(Boolean)).toHaveLength(1);
  });
});
