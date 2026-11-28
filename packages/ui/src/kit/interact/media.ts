import type { ReactNode } from "react";
import type { AttachmentIntent } from "../../catalog";

export type AttachmentCommand = {
  address: string;
  intent: Exclude<AttachmentIntent, "remove">;
  source?: string;
};
export type AttachmentHost = {
  /** Pure permission/availability check; both read and act use it. */
  canRun(command: AttachmentCommand): boolean;
  run(
    command: AttachmentCommand & { reference?: string; signal: AbortSignal },
  ): Promise<{ status: "accepted"; reference?: string } | { status: "rejected" }>;
};
export type PlaybackResolver = (address: string) => string | undefined;

/** Device adapters implement the same operations as the browser's local media element. */
export type MediaSession = {
  play(): void | Promise<void>;
  pause(): void;
  seek(seconds: number): void;
  dispose(): void;
  element?: HTMLMediaElement;
  /** A native host may draw its device player here instead of exposing a DOM element. */
  content?: ReactNode;
};
export type MediaAdapter = {
  open(
    reference: string,
    options: {
      video: boolean;
      at: number;
      onTime(seconds: number): void;
      onPlaying(playing: boolean): void;
      onError(message: string): void;
    },
  ): MediaSession;
};

/** References are resolved by the host, never interpreted as URLs supplied by the model. */
export function browserMediaAdapter(resolve: (reference: string) => string | undefined): MediaAdapter {
  return {
    open(reference, options) {
      const source = resolve(reference);
      if (!source) throw new Error(`No local recording for ${reference}`);
      const element = document.createElement(options.video ? "video" : "audio");
      element.src = source;
      element.preload = "metadata";
      element.setAttribute("playsinline", "");
      let pending = options.at;
      const metadata = () => {
        element.currentTime = pending;
      };
      const time = () => options.onTime(element.currentTime);
      const playing = () => options.onPlaying(!element.paused && !element.ended);
      const error = () => options.onError("The recording could not be loaded");
      element.addEventListener("loadedmetadata", metadata);
      element.addEventListener("timeupdate", time);
      element.addEventListener("play", playing);
      element.addEventListener("pause", playing);
      element.addEventListener("ended", playing);
      element.addEventListener("error", error);
      return {
        element,
        play: () => element.play(),
        pause: () => element.pause(),
        seek(seconds) {
          pending = seconds;
          if (element.readyState >= 1) element.currentTime = seconds;
        },
        dispose() {
          element.removeEventListener("loadedmetadata", metadata);
          element.removeEventListener("timeupdate", time);
          element.removeEventListener("play", playing);
          element.removeEventListener("pause", playing);
          element.removeEventListener("ended", playing);
          element.removeEventListener("error", error);
          element.pause();
          element.removeAttribute("src");
          element.load();
          element.remove();
        },
      };
    },
  };
}
