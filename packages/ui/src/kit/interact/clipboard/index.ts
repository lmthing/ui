import type { InteractionStore } from "../index";
export { useCopyFeedback } from "./use-copy-feedback";

export type ClipboardWriter = (text: string) => void | Promise<void>;
export type ClipboardText = (address: string) => string | undefined;
const normalize = (address: string) => address.replace(/^(.*\/.+)\/root$/, "$1");
export const copyStatusKey = (address: string) => `${normalize(address)}/$copy`;

function browserWriter(): ClipboardWriter | undefined {
  const clipboard = globalThis.navigator?.clipboard;
  if (typeof clipboard?.writeText === "function") return clipboard.writeText.bind(clipboard);
}

export function clipboardRuntime(
  store: InteractionStore,
  disposed: () => boolean,
  host?: ClipboardWriter,
  resolveText?: ClipboardText,
) {
  const targets = new Map<string, { text: string; receipt: symbol }>();
  return {
    available: () => Boolean(host ?? browserWriter()),
    register(address: string, text: string) {
      const key = copyStatusKey(address);
      const target = { text, receipt: Symbol() };
      targets.set(key, target);
      return () => {
        if (targets.get(key) === target) targets.delete(key);
      };
    },
    copiedAt(address: string, text: string) {
      const key = copyStatusKey(address),
        target = targets.get(key);
      return target?.text === text && store.get(key) === target.receipt;
    },
    effectFor(address: string) {
      const writer = host ?? browserWriter();
      if (!writer) return;
      const key = copyStatusKey(address);
      const target = targets.get(key),
        text = target?.text ?? resolveText?.(normalize(address));
      if (text) return () => commitWrite(store, key, disposed, writer, text, target?.receipt);
    },
  };
}

function commitWrite(
  store: InteractionStore,
  key: string,
  disposed: () => boolean,
  writer: ClipboardWriter,
  text: string,
  receipt: symbol | undefined,
) {
  if (disposed()) return;
  const pending = Symbol();
  store.set(key, pending);
  const finish = (copied: boolean) => {
    if (!disposed() && store.get(key) === pending) store.set(key, copied ? (receipt ?? true) : false);
  };
  try {
    Promise.resolve(writer(text)).then(
      () => finish(true),
      () => finish(false),
    );
  } catch {
    finish(false);
  }
}
