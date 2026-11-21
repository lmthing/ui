import type { ActStep, Definition, ScreenLike, SendDraft, Values } from "../../../catalog";
import type { ActReply } from "../index";
import type { Confirmation, ControllerContext } from "../runtime";
export type ActionState = {
  values: Values;
  sheet: string | undefined;
  confirmation: Confirmation | undefined;
  changes: string[];
};
export type ActionResult = {
  state: ActionState;
  effects: (() => void)[];
  error?: Extract<ActReply, { ok: false }>;
};
export type ActionContext = {
  screen: ScreenLike;
  active: ScreenLike;
  entry: ScreenLike["components"][number];
  input: Values;
  defs: Record<string, Definition>;
  selected: ActStep;
  links: { goto: string; address: string }[];
  send?: SendDraft | undefined;
  at: number;
  now: () => number;
  key: ControllerContext["key"];
  options: ControllerContext["options"];
  clipboard?: ControllerContext["clipboard"];
  playMedia(id: string, playing: boolean): void;
  seekMedia(id: string, target: number): void;
  requestPhoto(id: string, target: string): void;
};
export type ActionHandler = (state: ActionState, action: ActStep, ctx: ActionContext) => ActionResult;
export type ActionEvent = ActStep & { delivery?: SendDraft };
/** Read the admitted delivery from a host action callback, including PhoneScreen's ActStep callback. */
export function actionDelivery(action: ActStep): SendDraft | undefined {
  return (action as ActionEvent).delivery;
}
export type SendHandler = (text: string, address: string, audience?: string) => void;
export function deliverSend({ text, address, audience }: SendDraft, send?: SendHandler) {
  if (audience === undefined) send?.(text, address);
  else send?.(text, address, audience);
}
export const actionFailure = (at: number, code: string, hint: string): Extract<ActReply, { ok: false }> => ({
  ok: false,
  at,
  code,
  hint,
});
export const rejected = (state: ActionState, at: number, code: string, hint: string): ActionResult => ({
  state,
  effects: [],
  error: actionFailure(at, code, hint),
});
