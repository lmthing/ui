import { useCallback, useEffect, useState, type RefObject } from "react";
import { isWeb, type TamaguiElement } from "tamagui";
import { checkScreen, type Definition, type Issue, type ScreenLike } from "../../catalog";
import { clippedText, labelSelector } from "./clipped-text";

const layoutDelay = 150;
const mountLimit = 300;

function observeLabels(frame: HTMLElement, schedule: () => void) {
  const resize = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(schedule);
  let observed = new Set<HTMLElement>();
  const refresh = () => {
    const elements = new Set([frame]);
    for (const label of Array.from(frame.querySelectorAll<HTMLElement>(labelSelector))) {
      for (let node: HTMLElement | null = label; node && !elements.has(node); node = node.parentElement)
        elements.add(node);
    }
    for (const node of observed) if (!elements.has(node)) resize?.unobserve(node);
    for (const node of elements) if (!observed.has(node)) resize?.observe(node);
    observed = elements;
  };
  const mutations = new MutationObserver((records) => {
    if (
      records.some(
        ({ type, attributeName }) => type === "childList" || attributeName === "data-report-clipped",
      )
    )
      refresh();
    schedule();
  });
  refresh();
  mutations.observe(frame, {
    subtree: true,
    childList: true,
    characterData: true,
    attributeFilter: ["style", "class", "hidden", "data-report-clipped"],
  });
  const fonts = frame.ownerDocument.fonts;
  fonts?.addEventListener("loadingdone", schedule);
  return () => {
    resize?.disconnect();
    mutations.disconnect();
    fonts?.removeEventListener("loadingdone", schedule);
  };
}

export function useReport(
  screen: ScreenLike,
  defs: Record<string, Definition>,
  root: RefObject<TamaguiElement | null>,
  onReport: ((issues: Issue[]) => void) | undefined,
) {
  const [native, setNative] = useState(() => new Map<symbol, Issue>());
  const publish = useCallback((key: symbol, issue?: Issue) => {
    setNative((current) => {
      if (current.get(key)?.address === issue?.address) return current;
      const next = new Map(current);
      if (issue) next.set(key, issue);
      else next.delete(key);
      return next;
    });
  }, []);
  const fingerprint = JSON.stringify(screen);
  useEffect(() => {
    if (!onReport) return;
    const frame = isWeb ? (root.current as HTMLElement | null) : null;
    let timer: ReturnType<typeof setTimeout>;
    let limit: ReturnType<typeof setTimeout> | undefined;
    let data: Issue[] | undefined;
    const send = () => {
      clearTimeout(timer);
      clearTimeout(limit);
      limit = undefined;
      data ??= checkScreen(screen, defs, { hostItemIds: true });
      onReport([...data, ...(frame ? clippedText(frame) : native.values())]);
    };
    const schedule = () => {
      clearTimeout(timer);
      limit ??= setTimeout(send, mountLimit);
      timer = setTimeout(send, layoutDelay);
    };
    schedule();
    const stop = frame ? observeLabels(frame, schedule) : undefined;
    return () => {
      clearTimeout(timer);
      clearTimeout(limit);
      stop?.();
    };
  }, [fingerprint, defs, root, onReport, native]);
  return onReport && !isWeb ? publish : undefined;
}
