import * as c from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { describe, expect, it } from "vitest";
import type { z } from "zod";
import { renderPayroll, renderPayrollExample } from "./payroll-fixture";

const def = c.components.Payroll;
const { meta, props, examples } = def;
type Input = z.input<typeof props>;
const draft: Input = examples[0]!,
  paid: Input = examples[1]!;

describe("Payroll authoritative records", () => {
  it("does not authorize detached seed assertions or choose the first payee without a host selection", () => {
    const { deviceData } = renderPayrollExample(paid, "filled");
    const inputs = [
      undefined,
      {
        ...deviceData,
        books_payroll_runs: [
          { ...(deviceData?.books_payroll_runs?.[0] as object), activeEmployee: "absent" },
        ],
      },
    ];
    for (const data of inputs) {
      expect(renderPayroll(paid, "filled", data)).not.toContain("Sam Moss");
      expect(c.readComponent(def, paid, "c1", "filled", {}, undefined, data).join(" ")).not.toContain(
        "/send press",
      );
    }
    expect(c.readComponent(def, draft, "c1").join(" ")).not.toContain("/finalize press");
  });

  it("removes payment and finalisation on canonical refresh, with no return to Writer state", () => {
    const final: Input = { ...draft, finalizedAt: paid.finalizedAt };
    const next: Input = {
      ...final,
      payees: [{ ...draft.payees[0]!, paidAt: paid.payees[0]!.paidAt }, draft.payees[1]!],
    };
    const sample = (input: Input) => renderPayrollExample(input, "filled").deviceData;
    let data = sample(draft);
    const screen = { id: "home", components: [{ ...draft, id: "c1", c: meta.id }] };
    const control = createScreenController({
      screen,
      defs: { Payroll: def },
      get deviceData() {
        return data;
      },
    });
    try {
      expect(control.press("c1/finalize").ok).toBe(true);
      data = sample(final);
      expect(control.press("confirm/confirm").ok).toBe(false);
      expect(control.press("c1/finalize").ok).toBe(false);
      expect(control.press("c1/r1/record").ok).toBe(true);
      data = sample(next);
      expect(control.press("c1/r1/record").ok).toBe(false);
      expect(control.read()).toContain("[c1/r2/record press]");
      expect(control.read()).toContain("[c1/r1/send press !needs-service]");
    } finally {
      control.dispose();
    }
  });
});
