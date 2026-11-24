import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { isWeb, type TamaguiElement, type Text } from "tamagui";
import type { Issue } from "../../catalog";

export const labelSelector = "[data-report-clipped]";
export const choiceClipIssue = (address: string): Issue => ({
  code: "clipped_text",
  address,
  message: "Choice label does not fit",
});
const scrolls = (overflow: string) => overflow === "auto" || overflow === "scroll";
const clips = (overflow: string) => overflow === "hidden" || overflow === "clip";
const outside = (start: number, end: number, low: number, high: number, tolerance = 1) =>
  start < low - tolerance || end > high + tolerance;

function clipsLabel(label: HTMLElement, root: HTMLElement) {
  const view = root.ownerDocument.defaultView;
  if (!view || !label.getClientRects().length || view.getComputedStyle(label).visibility !== "visible")
    return false;
  const range = root.ownerDocument.createRange();
  range.selectNodeContents(label);
  const runs = Array.from(range.getClientRects());
  let horizontal = true;
  let vertical = true;
  for (let node: HTMLElement | null = label; node; node = node.parentElement) {
    const { overflowX, overflowY } = view.getComputedStyle(node);
    horizontal &&= !scrolls(overflowX);
    vertical &&= !scrolls(overflowY);
    const clipX = horizontal && clips(overflowX);
    const clipY = vertical && clips(overflowY);
    if (clipX || clipY) {
      const box = node.getBoundingClientRect();
      if (
        runs.some(
          ({ left, right, top, bottom, height }) =>
            (clipX && outside(left, right, box.left, box.right)) ||
            (clipY && outside(top, bottom, box.top, box.bottom, height / 4)),
        )
      )
        return true;
      if (node === label && clipY && label.scrollHeight > label.clientHeight + 1) return true;
      if (node === label && clipX && label.scrollWidth > label.clientWidth + 1) return true;
    }
    if (node === root || (!horizontal && !vertical)) break;
  }
  return false;
}

/** Report text loss, not the intentional viewport boundary of a scroller. */
export function clippedText(root: HTMLElement): Issue[] {
  return Array.from(root.querySelectorAll<HTMLElement>(labelSelector)).flatMap((label) => {
    const address = label.dataset.testid ?? label.dataset.reportClipped;
    return address && clipsLabel(label, root) ? [choiceClipIssue(address)] : [];
  });
}

type Size = { width: number; height: number };
type Line = Size & { x: number; y: number; text?: string };
type Axes = { x: boolean; y: boolean };
type ClipBounds = Size & { offsetX: number; offsetY: number; axes: Axes };
type NativeTextSample = { box?: Size; lines?: readonly Line[]; clips?: readonly ClipBounds[] };
const continuousText = (text: string) => text.replace(/[\s\u00ad]+/g, "");
const bothAxes = { x: true, y: true };

function clippedLines(lines: readonly Line[], { width, height, offsetX, offsetY, axes }: ClipBounds) {
  return lines.some(
    (line) =>
      (axes.x && outside(line.x + offsetX, line.x + offsetX + line.width, 0, width)) ||
      (axes.y &&
        outside(line.y + offsetY, line.y + offsetY + line.height, 0, height, Math.max(1, line.height / 4))),
  );
}

/** React Native may return either the full layout or only the drawn lines for a line cap. */
export function nativeTextIssue(
  { box, lines, clips }: NativeTextSample,
  label: string,
  address: string,
  limit?: number,
): Issue | undefined {
  if (!lines?.length) return;
  const reported = continuousText(lines.map(({ text }) => text).join(""));
  const expected = continuousText(label);
  const omittedText = lines.every(({ text }) => text !== undefined) && reported.length < expected.length;
  const ellipsis = limit !== undefined && /(?:…|\.{3})$/.test(reported) && expected !== reported;
  const ownBox = box && clippedLines(lines, { ...box, offsetX: 0, offsetY: 0, axes: bothAxes });
  const masked = clips?.some((clip) => clippedLines(lines, clip));
  if (omittedText || ellipsis || ownBox || masked || (limit !== undefined && lines.length > limit))
    return choiceClipIssue(address);
}

type Publish = (key: symbol, issue?: Issue) => void;
export const RenderReportContext = createContext<Publish | undefined>(undefined);
type NativeRef = RefObject<TamaguiElement | null>;
type ClipFrame = { ref: NativeRef; size: Size; axes: Axes };
export const NativeClipFrames = createContext<readonly ClipFrame[]>([]);

type TextObservation = Pick<ComponentProps<typeof Text>, "onLayout" | "onTextLayout" | "dataSet">;
export function useNativeClipFrame(enabled: boolean, ref: NativeRef, register?: () => void) {
  const parents = useContext(NativeClipFrames);
  const tracking = Boolean(useContext(RenderReportContext)) && !isWeb && enabled;
  const [size, setSize] = useState<Size>();
  const frames = useMemo(
    () => (tracking && size ? [...parents, { ref, size, axes: bothAxes }] : parents),
    [parents, ref, size, tracking],
  );
  const onLayout: TextObservation["onLayout"] = tracking
    ? ({ nativeEvent: { layout } }) => {
        register?.();
        setSize((previous) =>
          previous?.width === layout.width && previous.height === layout.height ? previous : layout,
        );
      }
    : register;
  return { frames, onLayout, tracking };
}

export function useNativeScrollFrames(axis: "x" | "y", enabled = true) {
  const frames = useContext(NativeClipFrames);
  return useMemo(
    () =>
      enabled && frames.length
        ? frames.map((frame) => ({ ...frame, axes: { ...frame.axes, [axis]: false } }))
        : frames,
    [axis, enabled, frames],
  );
}

type Measurable = {
  measureLayout?: (ancestor: unknown, success: (x: number, y: number) => void, failure: () => void) => void;
};
function measureClip(node: Measurable | null, { ref, size, axes }: ClipFrame) {
  return new Promise<ClipBounds | undefined>((resolve) => {
    if (!node?.measureLayout || !ref.current || (!axes.x && !axes.y)) return resolve(undefined);
    node.measureLayout(
      ref.current,
      (offsetX, offsetY) => resolve({ ...size, offsetX, offsetY, axes }),
      () => resolve(undefined),
    );
  });
}

type Observation = TextObservation & { ref?: NativeRef };
function useNativeIssueEffect(
  run: { sample: NativeTextSample; key: symbol; revision: number } | undefined,
  frames: readonly ClipFrame[],
  ref: NativeRef,
  publish: Publish | undefined,
  read: (sample: NativeTextSample) => Issue | undefined,
) {
  const report = () => {
    if (!run || !publish || !run.sample.lines?.length) return;
    const revision = ++run.revision;
    const local = read(run.sample);
    if (local || !frames.length) return publish(run.key, local);
    const node = ref.current as Measurable | null;
    void Promise.all(frames.map((frame) => measureClip(node, frame))).then((clips) => {
      if (run.revision === revision)
        publish(run.key, read({ ...run.sample, clips: clips.filter((bounds) => bounds !== undefined) }));
    });
  };
  useEffect(() => {
    report();
    return () => {
      if (run) run.revision++;
    };
  }, [run, frames, ref]);
  return report;
}

export function useReportedText(
  address: string | undefined,
  label: string | undefined,
  limit: number | undefined,
  ref: NativeRef,
  register?: () => void,
): Observation | undefined {
  const publish = useContext(RenderReportContext);
  const frames = useContext(NativeClipFrames);
  const run = useMemo(
    () =>
      !isWeb && publish && address && label !== undefined
        ? { key: Symbol(), sample: {} as NativeTextSample, revision: 0 }
        : undefined,
    [address, label, limit, publish],
  );
  useEffect(
    () => () => {
      if (run) publish?.(run.key);
    },
    [publish, run],
  );
  const report = useNativeIssueEffect(run, frames, ref, publish, (sample) =>
    address && label !== undefined ? nativeTextIssue(sample, label, address, limit) : undefined,
  );
  if (!address || label === undefined) return;
  if (isWeb) return { dataSet: { reportClipped: address } };
  if (!run) return;
  return {
    ref,
    onLayout: (event) => {
      register?.();
      run.sample.box = event.nativeEvent.layout;
      report();
    },
    onTextLayout: (event) => {
      run.sample.lines = event.nativeEvent.lines;
      report();
    },
  };
}
