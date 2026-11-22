import { expect, it } from "vitest";
import { clientBalanceLine, clientReading, contactLabels, nextLine, sinceLine, tagsLine } from "../../copy";

it("names a positive, settled, or credit balance", () => {
  expect(clientBalanceLine({ charged: 15.5, paid: 5 })).toBe("Owes $10.50");
  expect(clientBalanceLine({ charged: 0.1 + 0.2, paid: 0.3 })).toBe("No balance due");
  expect(clientBalanceLine({ charged: 0, paid: 4 })).toBe("$4 credit");
});

it("keeps contact actions, next details and static tags readable", () => {
  expect(contactLabels).toEqual({
    call: "Call",
    message: "Message",
    directions: "Directions",
    email: "Email",
  });
  expect(nextLine("Friday 09:00")).toBe("Next: Friday 09:00");
  expect(tagsLine([])).toBe("");
  expect(tagsLine(["Regular"])).toBe("Regular");
  expect(tagsLine(["Regular", "Key holder", "New"])).toBe("Regular · Key holder · New");
});

it("formats stored joining dates, including leap days, without device time zone shifts", () => {
  expect(sinceLine("2025-04-03")).toBe("Client since 3 Apr 2025");
  expect(sinceLine("2024-02-29")).toBe("Client since 29 Feb 2024");
  expect(sinceLine("2025-01-01")).toBe("Client since 1 Jan 2025");
});

it("reads optional summary copy and only available contact actions", () => {
  for (const phone of [false, true])
    for (const address of [false, true]) {
      expect(clientReading({ tags: [], phone, address })).toEqual([
        "Message",
        ...(phone ? ["Call"] : []),
        ...(address ? ["Directions"] : []),
      ]);
    }
  expect(
    clientReading({
      since: "2025-04-03",
      next: "Friday 09:00",
      tags: ["Regular"],
      phone: true,
      address: true,
    }),
  ).toEqual(["Client since 3 Apr 2025", "Next: Friday 09:00", "Regular", "Message", "Call", "Directions"]);
});
