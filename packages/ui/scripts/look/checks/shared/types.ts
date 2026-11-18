export type LookIssue = { kind: string; frame: string; part: string; detail: string };
export type AddIssue = (kind: string, frame: string, el: Element, detail: string) => unknown;
export type FrameCheck = { frameEl: Element; frame: string; box: DOMRect; add: AddIssue };
export type ElementCheck = {
  el: Element;
  rect: DOMRect;
  style: CSSStyleDeclaration;
  frame: string;
  add: AddIssue;
};
export type TextBox = { el: Element; rect: DOMRect };
