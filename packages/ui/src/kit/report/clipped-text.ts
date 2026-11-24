import { createContext, useContext, useEffect, useMemo, type ComponentProps } from "react";
import { isWeb, type Text } from "tamagui";
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
type NativeTextSample = { box?: Size; lines?: readonly Line[] };
const continuousText = (text: string) => text.replace(/[\s\u00ad]+/g, "");

/** React Native may return either the full layout or only the drawn lines for a line cap. */
export function nativeTextIssue(
  { box, lines }: NativeTextSample,
  label: string,
  address: string,
  limit?: number,
): Issue | undefined {
  if (!lines?.length) return;
  const reported = continuousText(lines.map(({ text }) => text).join(""));
  const expected = continuousText(label);
  const omittedText = lines.every(({ text }) => text !== undefined) && reported.length < expected.length;
  const ellipsis = limit !== undefined && /(?:…|\.{3})$/.test(reported) && expected !== reported;
  const outside =
    box &&
    lines.some(
      ({ x, y, width, height }) =>
        x < -1 || x + width > box.width + 1 || y + height > box.height + Math.max(1, height / 4),
    );
  if (omittedText || ellipsis || outside || (limit !== undefined && lines.length > limit))
    return choiceClipIssue(address);
}

type Publish = (key: symbol, issue?: Issue) => void;
export const RenderReportContext = createContext<Publish | undefined>(undefined);

export type TextObservation = Pick<ComponentProps<typeof Text>, "onLayout" | "onTextLayout" | "dataSet">;
export function withTextObservation(
  observation: TextObservation | undefined,
  register: (() => void) | undefined,
) {
  const observe = observation?.onLayout;
  if (!observe || !register) return observation;
  const onLayout: TextObservation["onLayout"] = (event) => {
    register();
    observe(event);
  };
  return { ...observation, onLayout };
}

export function useReportedText(
  address: string | undefined,
  label: string,
  limit: number | undefined,
): TextObservation | undefined {
  const publish = useContext(RenderReportContext);
  const observation = useMemo(
    () => (!isWeb && publish && address ? { key: Symbol(), sample: {} as NativeTextSample } : undefined),
    [address, label, limit, publish],
  );
  useEffect(
    () => () => {
      if (observation) publish?.(observation.key);
    },
    [publish, observation],
  );
  if (!address) return;
  if (isWeb) return { dataSet: { reportClipped: address } };
  if (!publish || !observation) return;
  const { key, sample } = observation;
  const report = () => publish(key, nativeTextIssue(sample, label, address, limit));
  return {
    onLayout: (event) => {
      sample.box = event.nativeEvent.layout;
      report();
    },
    onTextLayout: (event) => {
      sample.lines = event.nativeEvent.lines;
      report();
    },
  };
}
