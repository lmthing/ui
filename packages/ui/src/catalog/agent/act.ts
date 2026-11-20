export { planAct } from "./action-input";

export type ActStep = { address: string; action: string; value?: unknown };
export type Values = Record<string, unknown>;
export type SendDraft = { address: string; text: string; audience?: string };
type ActCode = "not_actionable" | "invalid_value" | "random_unavailable" | "max_active";
export type ActResult =
  | {
      ok: true;
      values: Values;
      changed: string[];
      links: { goto: string; address: string }[];
      sends?: SendDraft[];
    }
  | { ok: false; code: ActCode; at: number; hint?: string };
