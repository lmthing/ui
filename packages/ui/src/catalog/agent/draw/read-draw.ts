import type { DrawState } from "./draw";

export function readDraw(state: DrawState | undefined): string[] {
  if (state?.kind === "pick")
    return [
      ...(state.index === undefined ? [] : [`index=${state.index}`]),
      `used=${JSON.stringify(state.used)}`,
      `remaining=${state.remaining}`,
    ];
  if (state?.kind === "faces" && state.faces.length)
    return [`faces=${JSON.stringify(state.faces)}`, `held=${JSON.stringify(state.held)}`];
  if (state?.kind === "partition" && state.teams.length) return [`teams=${JSON.stringify(state.teams)}`];
  if (state?.kind === "deck")
    return [
      ...(state.drawn.length ? [`drawn=${JSON.stringify(state.drawn)}`] : []),
      `remaining=${state.remaining}`,
      `discard=${state.discard.length}`,
    ];
  return [];
}
