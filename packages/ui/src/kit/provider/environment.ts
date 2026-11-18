export type Insets = { top: number; right: number; bottom: number; left: number };
export type Environment = {
  insets: Insets;
  keyboardHeight: number;
  reduceMotion: boolean;
  agentMode: boolean;
  signature?: string;
  cue?: number;
};
/** A native host connects its keyboard, safe-area and accessibility modules here. */
export type NativeHost = {
  snapshot(): { insets: Insets; keyboardHeight: number; reduceMotion: boolean };
  subscribe(listener: () => void): () => void;
  listenBack?(listener: () => void): () => void;
  focusModal?(element: unknown): (() => void) | void;
  ensureVisible?(element: unknown): void;
};
export const defaultEnvironment: Environment = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  keyboardHeight: 0,
  reduceMotion: false,
  agentMode: false,
};
