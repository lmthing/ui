import type { HostIntent } from "../../../../catalog";

const intents = new WeakMap<object, HostIntent>();
export const commandForConfirmation = (confirmation: object) => intents.get(confirmation);
export function bindCommandConfirmation(confirmation: object, intent: HostIntent) {
  intents.set(confirmation, intent);
}
