import { describe, expect, it } from "vitest";
import { affordancesOf, components, stampItemIds } from "@lmthing/ui/catalog";

const card = { name: "Alpha", photo: "local:1", tags: [], phone: false, address: false };
const invoice = {
  number: "1",
  to: "Alpha",
  date: "2026-11-18",
  lines: [{ item: "Visit", qty: 1, price: 0 }],
  status: "draft",
};
const review = { stars: 5, name: "Alpha", date: "2026-11-18", text: "Good" };
const summary = { average: 4, count: 1, bars: [0, 0, 0, 1, 0] };
const loyalty = { stamps: 0, of: 4, reward: "Reward" };
const agreement = { title: "Terms", terms: "Accept these terms", signed: false };

describe("customers contact actions", () => {
  it("offers only enabled buttons and retains the service tiers and quote confirmation", () => {
    const def = components.ClientCard;
    for (const phone of [false, true])
      for (const address of [false, true]) {
        const actions = affordancesOf(def.meta, def.props.parse({ ...card, phone, address }), "c1");
        expect(actions.map((action) => action.part)).toEqual([
          ...(phone ? ["call"] : []),
          "message",
          ...(address ? ["directions"] : []),
        ]);
      }
    expect(def.meta.partTiers).toEqual({
      call: "service",
      message: "service",
      directions: "service",
      email: "service",
    });
    expect(components.Invoice.meta.confirmParts).toEqual(["decline"]);
    expect(components.Invoice.meta.partTiers).toEqual({ send: "service", download: "service" });
    expect(components.PaymentStatus.meta.partTiers).toEqual({
      remind: "service",
      copy: "service",
      share: "service",
    });
  });
});

describe("customers conditional actions", () => {
  it("offers quote decisions only on quotes and review replies only in the list", () => {
    const def = components.Invoice;
    for (const style of ["invoice", "quote"] as const)
      expect(
        affordancesOf(def.meta, def.props.parse({ ...invoice, style }), "i1").map((a) => a.part),
      ).toEqual(style === "quote" ? ["send", "accept", "decline"] : ["send"]);
    const reviews = components.Review;
    const input = { ...summary, reviews: [review] };
    expect(affordancesOf(reviews.meta, stampItemIds(reviews.meta, reviews.props.parse(input)), "r1")).toEqual(
      [],
    );
    expect(
      affordancesOf(
        reviews.meta,
        stampItemIds(reviews.meta, reviews.props.parse({ ...input, style: "list" })),
        "r1",
      ),
    ).toMatchObject([{ address: "r1/r1/reply", action: "press" }]);
  });
  it("switches stamp to redeem only at capacity and locks signed agreements", () => {
    const def = components.Loyalty;
    for (let of = 4; of <= 12; of++)
      for (let stamps = 0; stamps <= of; stamps++)
        expect(
          affordancesOf(def.meta, def.props.parse({ ...loyalty, of, stamps }), "l1").map((a) => a.part),
        ).toEqual([stamps === of ? "redeem" : "stamp"]);
    const waiver = components.Agreement;
    expect(affordancesOf(waiver.meta, waiver.props.parse(agreement), "a1").map((a) => a.action)).toEqual([
      "check",
      "type",
    ]);
    expect(affordancesOf(waiver.meta, waiver.props.parse({ ...agreement, signed: true }), "a1")).toEqual([]);
  });
});
