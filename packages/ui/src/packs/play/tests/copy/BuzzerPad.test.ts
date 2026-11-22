import { expect, it } from "vitest";
import { buzzerPadCopy } from "../../copy";

it("reads the locked winner, rounds and localizes later taps, and keeps unused pads available", () => {
  const players = [
    { id: "r1", name: "A" },
    { id: "r2", name: "B" },
    { id: "r3", name: "C" },
  ];
  expect(buzzerPadCopy(players)).toMatchObject({
    status: "Ready to buzz",
    reset: "Reset buzzer",
    pads: players.map((player) => ({ ...player, used: false, first: false, delta: undefined })),
  });
  expect(buzzerPadCopy(players, { winner: "r2", deltas: { r2: 0, r3: 136.7 } }, "ar-EG")).toMatchObject({
    status: "B buzzed first",
    pads: [
      { used: false, first: false, delta: undefined },
      { used: true, first: true, delta: undefined },
      { used: true, first: false, delta: "١٣٧ ms later" },
    ],
  });
});
