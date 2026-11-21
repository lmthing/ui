import type { InteractionStore } from "../index";
export { useCopyFeedback } from "./use-copy-feedback";

export type ClipboardWriter = (text: string) => void | Promise<void>;
export const copyStatusKey = (address: string) => `${address.replace(/^(.*\/.+)\/root$/, "$1")}/$copy`;

function browserWriter(): ClipboardWriter | undefined {
  const clipboard = globalThis.navigator?.clipboard;
  if (typeof clipboard?.writeText === "function") return clipboard.writeText.bind(clipboard);
}

export function clipboardRuntime(store: InteractionStore, disposed: () => boolean, host?: ClipboardWriter) {
  return {
    available: () => Boolean(host ?? browserWriter()),
    write(address: string, text: string) {
      const writer = host ?? browserWriter();
      if (!writer || disposed()) return;
      const key = copyStatusKey(address);
      const pending = Symbol();
      store.set(key, pending);
      const finish = (copied: boolean) => {
        if (!disposed() && store.get(key) === pending) store.set(key, copied);
      };
      try {
        Promise.resolve(writer(text)).then(
          () => finish(true),
          () => finish(false),
        );
      } catch {
        finish(false);
      }
    },
  };
}
