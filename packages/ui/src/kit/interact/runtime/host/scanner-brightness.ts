/**
 * Raise brightness for the lifetime of the signal. On abort restore the previous level before
 * another lease touches the same display, even across controllers.
 */
export type ScannerBrightnessAdapter = (request: {
  address: string;
  tier: "ok";
  signal: AbortSignal;
}) => boolean | Promise<boolean>;

type DeviceBrightness = {
  read(): number | Promise<number>;
  write(level: number): void | Promise<void>;
};

function untilAbort(signal: AbortSignal) {
  if (signal.aborted) return;
  return new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve(), { once: true }));
}

async function leaseDisplay(
  display: DeviceBrightness,
  signal: AbortSignal,
  ready: (accepted: boolean) => void,
) {
  let restore: number | undefined;
  try {
    if (signal.aborted) {
      ready(false);
      return true;
    }
    const level = await display.read();
    if (signal.aborted || !Number.isFinite(level) || level < 0 || level > 1) {
      ready(false);
      return true;
    }
    restore = level;
    await display.write(1);
    ready(!signal.aborted);
    await untilAbort(signal);
  } catch {
    ready(false);
  }
  try {
    if (restore !== undefined) await display.write(restore);
    return true;
  } catch {
    return false;
  }
}

/** Share one adapter per display. Serialize acquisition behind the previous lease's restoration. */
export function createScannerBrightnessAdapter(display: DeviceBrightness): ScannerBrightnessAdapter {
  let restored = Promise.resolve(true);
  return ({ signal }) =>
    new Promise<boolean>((ready) => {
      restored = restored.then((available) => {
        if (available) return leaseDisplay(display, signal, ready);
        ready(false);
        return false;
      });
    });
}
