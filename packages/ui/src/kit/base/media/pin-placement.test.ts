import { expect, it } from "vitest";
import { size } from "../../../catalog";
import { centerOf, nearestPin } from "./pin-placement";

it("aligns different pin styles to the same interior image point and bounds the edges", () => {
  const pin = { id: "r1", label: "Signal", x: 0.25, y: 0.75, target: { part: "pin" } };
  const avatar = { ...pin, mark: "avatar" } as const;
  expect(centerOf(pin, 320, 180, true)).toEqual({ x: 80, y: 135 });
  expect(centerOf(avatar, 320, 180, true)).toEqual({ x: 80, y: 135 });
  expect(centerOf(pin, 320, 180)).not.toEqual({ x: 80, y: 135 });
  const edge = { ...pin, id: "r2", x: 1, y: 0 };
  expect(centerOf(edge, 320, 180, true)).toEqual({ x: 320 - size.avatar.sm / 2, y: size.avatar.sm / 2 });
  expect(nearestPin({ x: 80, y: 135 }, [edge, pin], 320, 180, true)).toBe(pin);
});
