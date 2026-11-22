import { expect, it } from "vitest";
import { components } from "@lmthing/ui/catalog";
import { migrateLine } from "./index";

it.each(["Feed", "Post"] as const)(
  "moves %s style aliases to shared axes without losing explicit values",
  (id) => {
    const { examples, props } = components[id];
    const input = { ...examples[0]!, c: id, id: "posts" };
    for (const [style, expected] of [
      ["stream", {}],
      ["compact", { density: "compact" }],
      ["grid", { arrange: "grid" }],
    ] as const) {
      const migrated = migrateLine({ ...input, style });
      expect(migrated).toEqual({ ...input, ...expected });
      const { c: _c, id: _id, ...data } = migrated;
      expect(props.safeParse(data).success).toBe(true);
    }
    expect(migrateLine({ ...input, style: "compact", density: "comfortable" })).toEqual({
      ...input,
      density: "comfortable",
    });
  },
);
