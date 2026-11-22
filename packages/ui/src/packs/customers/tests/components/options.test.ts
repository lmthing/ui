import { expect, it, vi } from "vitest";
import { components, readComponent } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { addressedElements, elementAt, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const client = { name: "Ben", photo: "local:1", tags: [], phone: false, address: false };
const payment = { amount: 60, date: "2026-11-18" };
const link = { style: "link", paymentLink: "https://example.com/pay/trot" };
const invoice = {
  number: "T-1",
  to: "Ben",
  date: "2026-11-18",
  status: "draft",
  lines: [{ item: "Walk", qty: 3, price: 12.5 }],
};
const reading = (id: "ClientCard" | "Invoice" | "PaymentStatus", input: unknown) =>
  readComponent(components[id], input, "c1").join("\n");
const partText = (html: string, part: string) =>
  addressedElements(html).get(`home/c1/${part}`)?.text.join("");

function control(c: string, input: Record<string, unknown>) {
  const onAction = vi.fn();
  const controller = createScreenController({
    screen: { id: "home", components: [{ c, id: "c1", ...input }] },
    defs: components,
    onAction,
  });
  return { controller, onAction };
}

it("keeps ClientCard additions optional and exposes only enabled email contact", () => {
  const { props } = components.ClientCard;
  for (const extra of [
    { company: "" },
    { company: "a".repeat(29) },
    { balance: 10 },
    { billing: { charged: 5, paid: -1 } },
    { billing: { charged: 5 } },
    { email: "yes" },
  ])
    expect(props.safeParse({ ...client, ...extra }).success).toBe(false);
  const input = { ...client, company: " Maple Studio ", billing: { charged: 120.5, paid: 80 }, email: true };
  const html = renderInstance("ClientCard", input, "filled", theme);
  for (const part of ["company", "balance", "email"]) {
    expect(elementAt(html, `home/c1/${part}`)).toBeDefined();
    expect(renderInstance("ClientCard", client, "filled", theme)).not.toContain(`home/c1/${part}`);
  }
  for (const text of ["Maple Studio", "Owes $40.50", "Email"]) {
    expect(html).toContain(text);
    expect(reading("ClientCard", input)).toContain(text);
  }
  expect(reading("ClientCard", input)).toContain("[c1/email press !needs-service]");
  const { controller, onAction } = control("ClientCard", input);
  expect(controller.press("c1/email")).toMatchObject({ ok: true });
  expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/email", action: "press" });
  controller.dispose();
  for (const extra of [{ email: false }, { email: true, state: "loading" }]) {
    const { controller } = control("ClientCard", { ...client, ...extra });
    expect(controller.press("c1/email")).toMatchObject({ ok: false });
    controller.dispose();
  }
});

it("keeps estimates unnumbered when requested and does not offer quote decisions", () => {
  const { props } = components.Invoice;
  const { number: _number, ...base } = invoice;
  for (const invalid of [base, { ...base, style: "quote" }, { ...base, style: "estimate", status: "paid" }])
    expect(props.safeParse(invalid).success).toBe(false);
  const input = { ...base, style: "estimate", due: "2020-02-02", status: "sent" };
  const html = renderInstance("Invoice", input, "filled", theme);
  expect(elementAt(html, "home/c1/estimate")).toBeDefined();
  expect(html).not.toMatch(/home\/c1\/(number|accept|decline)|Overdue/);
  expect(reading("Invoice", { ...input, number: "E-1" })).toContain("Estimate E-1");
});

it("computes invoice savings, discounted tax, and balance after deposit; cadence and download are opt-in", () => {
  const input = { ...invoice, tax: 10, discount: 2.25, deposit: 7.5, recurring: "quarterly", download: true };
  const html = renderInstance("Invoice", input, "filled", theme);
  const text = reading("Invoice", input);
  for (const [part, value] of [
    ["subtotal", "$37.50"],
    ["discount", "$2.25"],
    ["tax", "$3.53"],
    ["total", "$38.78"],
    ["deposit", "$7.50"],
    ["balance", "$31.28"],
    ["recurring", "Repeats quarterly"],
  ]) {
    expect(partText(html, part)).toBe(value);
    expect(text).toContain(value);
  }
  expect(text).toContain("[c1/download press !needs-service]");
  for (const state of ["filled", "success"] as const) {
    const { controller, onAction } = control("Invoice", { ...input, state });
    expect(controller.press("c1/download")).toMatchObject({ ok: true });
    expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/download", action: "press" });
    controller.dispose();
  }
  const legacy = renderInstance(
    "Invoice",
    { ...invoice, recurring: "none", download: false },
    "filled",
    theme,
  );
  expect(legacy).not.toMatch(/home\/c1\/(discount|deposit|balance|recurring|download)/);
  for (const extra of [
    { discount: 38 },
    { discount: -1 },
    { deposit: 40 },
    { deposit: 1.005 },
    { recurring: "yearly" },
    { download: "yes" },
  ])
    expect(components.Invoice.props.safeParse({ ...invoice, ...extra }).success).toBe(false);
});

it("shows a QR and both service actions only for an outstanding linked payment", () => {
  const input = { ...payment, ...link };
  const html = renderInstance("PaymentStatus", input, "filled", theme);
  expect(elementAt(html, "home/c1/code").attributes).toContain('aria-label="Scan to pay"');
  expect(html).toContain("<path");
  expect(html).not.toContain(link.paymentLink);
  const text = reading("PaymentStatus", input);
  expect(text).not.toContain(link.paymentLink);
  expect(text).toContain("[c1/copy copy !needs-service]");
  expect(text).toContain("[c1/share press !needs-service]");
  const { controller, onAction } = control("PaymentStatus", input);
  expect(controller.press("c1/share")).toMatchObject({ ok: true });
  expect(onAction).toHaveBeenLastCalledWith({ address: "home/c1/share", action: "press" });
  controller.dispose();
  for (const [data, state] of [
    [payment, "filled"],
    [{ ...input, paid: 60 }, "filled"],
    [input, "success"],
  ] as const) {
    expect(renderInstance("PaymentStatus", data, state, theme)).not.toMatch(/home\/c1\/(code|copy|share)/);
  }
  const { props } = components.PaymentStatus;
  for (const invalid of [
    { style: "link" },
    { paymentLink: link.paymentLink },
    ...[
      "http://example.com/pay",
      "https://user@example.com/pay",
      "javascript:alert(1)",
      "https://example.com/pa th",
    ].map((paymentLink) => ({ style: "link", paymentLink })),
  ])
    expect(props.safeParse({ ...payment, ...invalid }).success, JSON.stringify(invalid)).toBe(false);
});

it("retains addressed installment rows and derives settlement without double counting", () => {
  const installments = [
    { date: "2026-11-17", amount: 12.45 },
    { date: "2026-11-18", amount: 9.85 },
  ];
  const input = { ...payment, amount: 22.3, installments };
  const html = renderInstance("PaymentStatus", input, "filled", theme);
  expect(partText(html, "paid")).toBe("Received $22.30");
  expect(partText(html, "r1/date")).toBe("17 Nov 2026");
  expect(partText(html, "r2/amount")).toBe("$9.85");
  expect(reading("PaymentStatus", input)).toContain("Installment history");
  expect(reading("PaymentStatus", input)).toContain("17 Nov 2026");
  expect(reading("PaymentStatus", input)).not.toContain("c1/mark");
  expect(reading("PaymentStatus", { ...input, paid: 20 })).toContain("Received $20");
  expect(reading("PaymentStatus", { ...input, paid: 20 })).toContain("c1/mark");
  expect(renderInstance("PaymentStatus", input, "success", theme)).toContain("home/c1/r2/amount");
  for (const rows of [
    [],
    [{ ...installments[0], amount: 0 }],
    [{ ...installments[0], date: "yesterday" }],
    Array.from({ length: 7 }, () => installments[0]),
  ])
    expect(components.PaymentStatus.props.safeParse({ ...payment, installments: rows }).success).toBe(false);
});
