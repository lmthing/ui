import { vi } from "vitest";
import { components, type ActStep, type ScreenLike, type Values } from "@lmthing/ui/catalog";
import { createControllerContext } from "../../runtime";
import type { ActionContext, ActionState } from "../index";
export function actionFixture(c: string, input: Values, action: ActStep) {
  const screen: ScreenLike = { id: "test", components: [{ id: "c1", c, ...input }] };
  const session = { play: vi.fn(), pause: vi.fn(), seek: vi.fn(), dispose: vi.fn() };
  const options = {
    screen,
    defs: components,
    media: { open: vi.fn(() => session) },
    onAction: vi.fn(),
    onLink: vi.fn(),
    onSend: vi.fn(),
    requestPhoto: vi.fn(),
  };
  const runtime = createControllerContext(options);
  const ctx: ActionContext = {
    screen,
    active: screen,
    entry: screen.components[0]!,
    input,
    defs: components,
    selected: action,
    links: [],
    at: 2,
    now: () => 1000,
    key: runtime.key,
    options,
    playMedia: vi.fn(),
    seekMedia: vi.fn(),
    requestPhoto: vi.fn(),
    mediaEffect: vi.fn(),
    attachmentReference: vi.fn(),
  };
  const state: ActionState = { values: {}, sheet: undefined, confirmation: undefined, changes: ["planned"] };
  return { ctx, state, options };
}
