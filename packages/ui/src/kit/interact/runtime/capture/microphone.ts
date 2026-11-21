export type MicCaptureSession = { close(reason: "stop" | "cancel"): void };
export type MicCaptureAdapter = {
  /** The host owns consent and all audio. No session means permission was not granted. */
  open(
    address: string,
    signal: AbortSignal,
  ): MicCaptureSession | undefined | Promise<MicCaptureSession | undefined>;
};
type Phase = "idle" | "pending" | "recording" | "unavailable";
type Capture = { address: string; request: AbortController; session?: MicCaptureSession };

function close(session: MicCaptureSession | undefined, reason: "stop" | "cancel") {
  try {
    session?.close(reason);
  } catch {
    // Host cleanup errors must not keep the kit in a recording state.
  }
}

function admitted(admit: () => boolean) {
  try {
    return admit();
  } catch {
    return false;
  }
}

export function createMicCapture(adapter: MicCaptureAdapter | undefined) {
  const listeners = new Set<() => void>();
  const unavailable = new Set<string>();
  let capture: Capture | undefined;
  const notify = () => listeners.forEach((listener) => listener());
  const release = (address: string, reason: "stop" | "cancel") => {
    if (capture?.address !== address) return false;
    const current = capture;
    capture = undefined;
    if (!current.session) current.request.abort();
    close(current.session, reason);
    notify();
    return Boolean(current.session);
  };
  async function start(address: string, admit: () => boolean) {
    if (!adapter || capture) return;
    const opening: Capture = { address, request: new AbortController() };
    capture = opening;
    unavailable.delete(address);
    notify();
    let session: MicCaptureSession | undefined;
    try {
      if (capture === opening) session = await adapter.open(address, opening.request.signal);
    } catch {
      // A rejected prompt or inaccessible device has the same safe fallback as no session.
    }
    if (capture !== opening) return close(session, "cancel");
    if (session && admitted(admit) && capture === opening) {
      opening.session = session;
      notify();
      return;
    }
    close(session, "cancel");
    if (capture !== opening) return;
    capture = undefined;
    if (!session) unavailable.add(address);
    notify();
  }
  return {
    available: Boolean(adapter),
    phase(address: string): Phase {
      if (!adapter || unavailable.has(address)) return "unavailable";
      if (capture?.address === address) return capture.session ? "recording" : "pending";
      return "idle";
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    start,
    release,
    reset() {
      unavailable.clear();
      if (capture) release(capture.address, "cancel");
      else notify();
    },
  };
}
