import * as c from "@lmthing/ui/catalog";
import type { z } from "zod";
import { renderExample, renderInstance } from "../../../../../test/render";

const def = c.components.Payroll;
const theme = { preset: "calm", mode: "light", accent: "moss" } as const;
type Input = z.input<typeof def.props>;

export function renderPayroll(input: Input, state: c.StateName, data?: c.DeviceData) {
  return renderInstance("Payroll", input, state, theme, { deviceData: data });
}

export function renderPayrollExample(input: Input, state: c.StateName) {
  return renderExample("Payroll", input, state, theme);
}
