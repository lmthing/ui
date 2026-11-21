import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { TamaguiProvider } from "tamagui";
import { components, readComponent, stampItemIds, themeName } from "@lmthing/ui/catalog";
import { createScreenController, KitProvider, PartScope, renderers } from "@lmthing/ui/kit";
import { addressedElements, config, elementAt, renderInstance } from "../../../../../test/render";

const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
const account = { name: "Everyday", kind: "card", balance: -45, swatch: "navy", goto: "card" };
const bill = { name: "Phone plan", amount: 12, repeat: "monthly", paid: false, icon: "phone" };
const entry = {
  date: "2026-11-19",
  payee: "Corner Shop",
  category: "Supplies",
  icon: "shopping_bag",
  amount: -24.5,
  goto: "groceries",
};
const loan = {
  name: "Equipment",
  principal: 100,
  rate: 0,
  payment: 30,
  firstDue: "2090-12-14",
  payments: [],
};

describe("money Wave 6 option contracts", () => {
  it("stacks the same addressed account cards and only adds supplied amounts, including zero", () => {
    const def = components.AccountCard;
    const original = { accounts: [account, { ...account, name: "Reserve", goto: "reserve" }] };
    const input = {
      ...original,
      arrange: "rows",
      accounts: [{ ...account, creditLimit: 2500, rewardsValue: 0 }, original.accounts[1]],
    };
    expect(def.props.safeParse(input).success).toBe(true);
    expect(def.props.safeParse({ ...original, arrange: "grid" }).success).toBe(false);
    for (const key of ["creditLimit", "rewardsValue"]) {
      expect(def.props.safeParse({ accounts: [{ ...account, [key]: -1 }] }).success).toBe(false);
    }
    const before = renderInstance("AccountCard", original, "filled", theme);
    const stacked = renderInstance("AccountCard", input, "filled", theme);
    expect(elementAt(before, "home/c1/root").children).toHaveLength(1);
    expect(elementAt(stacked, "home/c1/root").children).toHaveLength(2);
    expect(
      [...addressedElements(stacked).keys()]
        .filter((address) => !/credit_limit|rewards_value/.test(address))
        .sort(),
    ).toEqual([...addressedElements(before).keys()].sort());
    expect(elementAt(stacked, "home/c1/r1/credit_limit")).toBeDefined();
    expect(stacked).toContain("Credit limit: $2,500");
    expect(stacked).toContain("Rewards: $0");
    const read = readComponent(def, input, "c1").join("\n");
    expect(read).toContain("Credit limit: $2,500");
    expect(read).toContain("Rewards: $0");
    expect(read).toContain("[c1/r1 press→card]");
    expect(renderInstance("AccountCard", input, "loading", theme)).not.toContain("home/c1/r1/credit_limit");
  });

  it("keeps subscription management separate from the bill and paid actions after sorting", () => {
    const def = components.Bills;
    const plain = { ...bill, name: "Insurance", amount: 96 };
    const managed = { ...bill, trialEnds: "2090-12-01", manage: { goto: "manage_phone" } };
    const input = { bills: [managed, plain], style: "subscriptions" } as const;
    const manage = "home/c1/r1/manage";
    const html = renderInstance("Bills", input, "filled", theme);
    expect(html.indexOf("home/c1/r2/root")).toBeLessThan(html.indexOf("home/c1/r1/root"));
    expect(elementAt(html, manage).attributes).toContain('role="link"');
    expect(elementAt(html, "home/c1/r1/manage_label")).toBeDefined();
    expect(html).toContain("home/c1/r1/trial_ends");
    expect(html).not.toContain("home/c1/r2/manage");
    const onLink = vi.fn(),
      onAction = vi.fn();
    const controller = createScreenController({
      defs: components,
      onLink,
      onAction,
      screen: { id: "home", components: [{ id: "c1", c: "Bills", ...input }] },
    });
    expect(controller.read()).toContain("Trial ends 1 Dec 2090");
    expect(controller.read()).toContain("[c1/r1/manage press→manage_phone]");
    expect(controller.press("home/c1/r1")).toMatchObject({ ok: true });
    expect(onLink).not.toHaveBeenCalled();
    expect(controller.press(manage)).toMatchObject({ ok: true });
    expect(onLink).toHaveBeenCalledWith("manage_phone", manage);
    expect(controller.press("home/c1/r1/paid")).toMatchObject({ ok: true });
    expect(controller.read()).toContain("[c1/r1/paid check:done]");
    const due = { ...input, style: "due" };
    expect(def.props.safeParse(due).success).toBe(false);
    expect(def.props.safeParse({ bills: [{ ...managed, manage: { goto: "sheet" } }] }).success).toBe(false);
    expect(renderInstance("Bills", input, "empty", theme)).not.toContain(manage);
    expect(def.props.safeParse({ bills: [{ ...bill, trialEnds: "2090-02-29" }] }).success).toBe(false);
    expect(
      def.props.safeParse({ bills: [{ ...bill, manage: { goto: "https://example.com" } }] }).success,
    ).toBe(false);
  });

  it("uses the controller currency for balances, limits and rewards in the view and the reading", () => {
    const input = { accounts: [{ ...account, creditLimit: 2500, rewardsValue: 12.5 }] };
    const { AccountCard: def } = components;
    const controller = createScreenController({
      defs: components,
      currency: "GBP",
      lang: "en-GB",
      screen: { id: "home", components: [{ id: "c1", c: "AccountCard", ...input }] },
    });
    const props = stampItemIds(def.meta, def.props.parse(input));
    try {
      const view = createElement(
        PartScope,
        { screen: "home", component: "c1", rev: 1, state: "filled" },
        createElement(renderers.AccountCard, props),
      );
      const tree = createElement(KitProvider, { theme, controller, lang: "en-GB" }, view);
      const html = renderToStaticMarkup(
        createElement(TamaguiProvider, { config, defaultTheme: themeName(theme) }, tree),
      );
      for (const amount of ["£45", "Credit limit: £2,500", "Rewards: £12.50"]) {
        expect(html).toContain(amount);
        expect(controller.read()).toContain(amount);
      }
    } finally {
      controller.dispose();
    }
  });

  it("shows a transaction's optional metadata without changing its action or other entries", () => {
    const def = components.Transactions;
    const input = {
      entries: [{ ...entry, receipt: "local:1", status: "disputed", note: "Charged twice" }, entry],
    };
    const html = renderInstance("Transactions", input, "filled", theme);
    for (const part of ["receipt", "note", "status"]) {
      expect(elementAt(html, `home/c1/r1/${part}`)).toBeDefined();
      expect(html).not.toContain(`home/c1/r2/${part}`);
    }
    expect(html).not.toContain("home/c1/r1/icon");
    expect(html).toContain("home/c1/r2/icon");
    const read = readComponent(def, input, "c1").join("\n");
    for (const copy of ["Disputed", "Charged twice", "Receipt", "[c1/r1 press→groceries]"]) {
      expect(read).toContain(copy);
    }
    const loading = renderInstance("Transactions", input, "loading", theme);
    expect(loading).not.toContain("home/c1/r1/receipt");
    expect(loading).not.toContain("home/c1/r1/note");
    expect(readComponent(def, input, "c1", "loading").join("\n")).not.toContain("Charged twice");
    const noLead = { ...input, lead: "none" };
    expect(def.props.parse(noLead).entries[0]?.receipt).toBe("local:1");
    expect(renderInstance("Transactions", noLead, "filled", theme)).not.toContain("home/c1/r1/receipt");
    expect(readComponent(def, noLead, "c1").join("\n")).not.toContain("Receipt");
    for (const patch of [
      { receipt: "https://example.com/a" },
      { status: "cleared" },
      { note: "x".repeat(61) },
    ]) {
      expect(def.props.safeParse({ entries: [{ ...entry, ...patch }] }).success).toBe(false);
    }
    expect(def.props.safeParse({ entries: [{ ...entry, note: "x".repeat(60) }] }).success).toBe(true);
  });

  it("renders the calculated installment schedule and does not introduce a payment action", () => {
    const def = components.Loan;
    const input = { ...loan, style: "installments", cadence: "biweekly" };
    const html = renderInstance("Loan", input, "filled", theme);
    expect(html).toContain("Upcoming installments");
    expect(html).toContain("Payment every two weeks");
    expect(html).toContain("Payment: $10.00");
    expect(html).toContain("25 Jan 2091");
    expect(html).toContain("home/c1/schedule");
    expect(html).not.toContain("home/c1/next");
    expect(html).not.toContain("home/c1/edit");
    const read = readComponent(def, input, "c1").join("\n");
    expect(read).toContain("Upcoming installments");
    expect(read).toContain("$10.00");
    expect(read).not.toContain("press");
    expect(def.props.safeParse({ ...input, cadence: "daily" }).success).toBe(false);
    const record = (due: string) => ({ ...input, payments: [{ due, amount: 30 }] });
    expect(def.props.safeParse(record("2090-12-21")).success).toBe(false);
    expect(def.props.safeParse(record("2090-12-28")).success).toBe(true);
    expect(def.props.safeParse({ ...input, style: "schedule" }).success).toBe(false);
    const loading = renderInstance("Loan", input, "loading", theme);
    expect(loading).not.toContain("home/c1/schedule");
    expect(readComponent(def, input, "c1", "loading").join("\n")).not.toContain("$10.00");
  });
});
