import { expect, it } from "vitest";
import { affordancesOf, components, migrateLine, stampItemIds } from "@lmthing/ui/catalog";

it("replays a saved facts grid, preserving its id, addresses and explicit arrangement", () => {
  const pairs = [{ label: "Room", value: "Bathroom", icon: "home" }];
  const line = { c: "KeyValue", id: "fact", style: "grid", pairs };
  const { c, id, ...input } = migrateLine(line);
  const { meta, props } = components.KeyValue;
  const stamped = stampItemIds(meta, props.parse(input));
  expect({ c, id }).toEqual({ c: "KeyValue", id: "fact" });
  expect(stamped).toMatchObject({ arrange: "grid", pairs: [{ ...pairs[0], id: "r1" }] });
  expect(affordancesOf(meta, stamped, "fact")).toEqual([]);
  expect(migrateLine({ ...line, arrange: "rows" })).toEqual({ c, id, pairs, arrange: "rows" });
});
