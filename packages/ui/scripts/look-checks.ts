// Runs inside the page (serialised by Playwright). Finds layout and readability problems in every
// screen frame marked data-look-frame. Dependency-free: it is sent to the browser as text.
//
// kind      what it means                                                    threshold
// clipped   text cut off by its box                                          scrollWidth > clientWidth
// outside   an element leaves the screen frame                               any pixel
// overlap   two pieces of text overlap                                       > 2×2 px
// contrast  text against what is behind it (WCAG 1.4.3 AA)                    4.5:1, 3:1 if large
// graphic   icons and control borders against what is behind (WCAG 1.4.11)  3:1
// faint     loading bars that do not stand out from their card              1.25:1
// cramped   text nearer than 8 px to the edge of its own visible box         8 px
// wrap      text broken into lines of one or two words                       ≥ 2 lines, ≤ 2 words/line
// small     text smaller than 12 px                                          12 px
// target    a control smaller than 44×44 (plan rule)                         44 px
export type LookIssue = { kind: string; frame: string; part: string; detail: string };

export function findIssues(): LookIssue[] {
  const issues: LookIssue[] = [];
  type RGB = { r: number; g: number; b: number; a: number };
  const rgb = (value: string | null): RGB | null => {
    const m = value?.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = "1"] = m[1]!.split(/[ ,/]+/).filter(Boolean);
    return { r: +r!, g: +g!, b: +b!, a: +a };
  };
  const lum = ({ r, g, b }: RGB) => {
    const c = [r, g, b].map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const ratio = (a: RGB, b: RGB) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi! + 0.05) / (lo! + 0.05);
  };
  const ownBackground = (el: Element) => {
    const color = rgb(getComputedStyle(el).backgroundColor);
    return color && color.a > 0.5 ? color : null;
  };
  const backgroundOf = (el: Element | null): RGB => {
    for (let node = el; node; node = node.parentElement) {
      const color = ownBackground(node);
      if (color) return color;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };
  const boxOf = (el: Element): Element | null => {
    for (let node = el.parentElement; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hasAttribute("data-look-frame")) return null;
      if (ownBackground(node) || parseFloat(style.borderTopWidth) > 0) return node;
    }
    return null;
  };
  const partOf = (el: Element) => el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?";
  const add = (kind: string, frame: string, el: Element, detail: string) =>
    issues.push({ kind, frame, part: partOf(el).split("/").slice(2).join("/") || "root", detail });
  const label = (el: Element) => `"${(el.textContent ?? "").trim().slice(0, 24)}"`;

  for (const frameEl of Array.from(document.querySelectorAll("[data-look-frame]"))) {
    const frame = frameEl.getAttribute("data-look-frame")!;
    const box = frameEl.getBoundingClientRect();
    const texts: { el: Element; rect: DOMRect }[] = [];
    for (const el of Array.from(frameEl.querySelectorAll("*"))) {
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const style = getComputedStyle(el);
      if (rect.left < box.left - 1 || rect.right > box.right + 1) {
        add(
          "outside",
          frame,
          el,
          `x ${Math.round(rect.left - box.left)}..${Math.round(rect.right - box.left)} of ${Math.round(box.width)}`,
        );
      }
      if (el.tagName.toLowerCase() === "svg") {
        const stroke = rgb(style.stroke) ?? rgb(style.color);
        if (stroke && ratio(stroke, backgroundOf(el.parentElement)) < 3) {
          add("graphic", frame, el, `icon ${ratio(stroke, backgroundOf(el.parentElement)).toFixed(2)}:1`);
        }
        continue;
      }
      const role = el.getAttribute("role");
      if (role && ["checkbox", "switch"].includes(role) && parseFloat(style.borderTopWidth) > 0) {
        const border = rgb(style.borderTopColor);
        const fill = ownBackground(el);
        const behind = backgroundOf(el.parentElement);
        if (border && !fill && ratio(border, behind) < 3) {
          add("graphic", frame, el, `${role} border ${ratio(border, behind).toFixed(2)}:1`);
        }
      }
      if (
        role &&
        ["button", "link", "checkbox", "switch", "tab"].includes(role) &&
        (rect.height < 43.5 || rect.width < 43.5)
      ) {
        add(
          "target",
          frame,
          el,
          `${role} is ${Math.round(rect.width)}×${Math.round(rect.height)}, needs 44×44`,
        );
      }
      if (el.getAttribute("aria-label") === "Loading") {
        const behind = backgroundOf(el.parentElement);
        const bars = Array.from(el.querySelectorAll("*")).filter((node) => ownBackground(node));
        if (!bars.length) add("faint", frame, el, "loading state draws nothing visible");
        for (const bar of bars.slice(0, 3)) {
          const shown = ratio(ownBackground(bar)!, behind);
          if (shown < 1.25) add("faint", frame, bar, `loading bar ${shown.toFixed(2)}:1 against its card`);
        }
      }
      const ownText = Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent!.trim());
      if (!ownText) continue;
      texts.push({ el, rect });
      const he = el as HTMLElement;
      const size = parseFloat(style.fontSize);
      if (he.scrollWidth > he.clientWidth + 1 && style.overflow !== "visible") {
        add("clipped", frame, el, `${label(el)} needs ${he.scrollWidth}px, has ${he.clientWidth}px`);
      }
      if (size < 12) add("small", frame, el, `${label(el)} is ${size}px`);
      const fg = rgb(style.color);
      if (fg && style.visibility !== "hidden" && +style.opacity > 0.2) {
        const r = ratio(fg, backgroundOf(el));
        const large = size >= 18 || (size >= 14 && +style.fontWeight >= 700);
        if (r < (large ? 3 : 4.5)) add("contrast", frame, el, `${r.toFixed(2)}:1 for ${label(el)}`);
      }
      const holder = boxOf(el);
      if (holder) {
        const h = holder.getBoundingClientRect();
        const side = Math.min(rect.left - h.left, h.right - rect.right);
        const end = Math.min(rect.top - h.top, h.bottom - rect.bottom);
        // Pills (badges, chips) may be tight above and below; boxes need room on every side.
        const pill = parseFloat(getComputedStyle(holder).borderTopLeftRadius) >= h.height / 2 - 1;
        if (side < 7.5 || end < (pill ? 2.5 : 7.5)) {
          const where = `${Math.max(0, Math.round(side))}px at the sides, ${Math.max(0, Math.round(end))}px above/below`;
          add("cramped", frame, el, `${label(el)} has ${where} inside its ${pill ? "pill" : "box"}`);
        }
      }
      const lineHeight = parseFloat(style.lineHeight) || size * 1.3;
      const lines = Math.round(rect.height / lineHeight);
      const words = (el.textContent ?? "").trim().split(/\s+/).length;
      if (lines >= 2 && words / lines <= 2)
        add("wrap", frame, el, `${label(el)} wraps into ${lines} lines of ≤2 words`);
    }
    // Same-named parts of different items (r1/label, r2/label, …) should line up: in one row they share
    // a top edge, and across rows they start at a few shared x positions (one per column).
    const byPart = new Map<string, DOMRect[]>();
    for (const el of Array.from(frameEl.querySelectorAll("[data-testid]"))) {
      const m = el.getAttribute("data-testid")!.match(/\/r\d+\/([a-z_]+)$/);
      const rect = el.getBoundingClientRect();
      if (m && m[1] !== "root" && rect.width) byPart.set(m[1]!, [...(byPart.get(m[1]!) ?? []), rect]);
    }
    for (const [part, rects] of byPart) {
      const lefts = [...new Set(rects.map((r) => Math.round(r.left / 3)))];
      const rights = [...new Set(rects.map((r) => Math.round(r.right / 3)))];
      const rows = new Map<number, number[]>();
      for (const r of rects)
        rows.set(Math.round(r.top / 24), [...(rows.get(Math.round(r.top / 24)) ?? []), r.top]);
      const columns = Math.max(...[...rows.values()].map((tops) => tops.length));
      if (lefts.length > columns && rights.length > columns) {
        add(
          "align",
          frame,
          frameEl,
          `${part} starts at ${lefts.length} different x positions for ${columns} column(s)`,
        );
      }
      for (const r of rects) {
        const sameRow = rects.filter((o) => o !== r && o.bottom > r.top && o.top < r.bottom);
        if (sameRow.some((o) => Math.abs(o.top - r.top) > 2)) {
          add("align", frame, frameEl, `${part} tops differ within one row`);
          break;
        }
      }
    }
    const roots = Array.from(frameEl.querySelectorAll("[data-testid]"))
      .filter((el) => /\/r\d+\/root$/.test(el.getAttribute("data-testid")!))
      .map((el) => el.getBoundingClientRect())
      .sort((a, b) => a.top - b.top);
    const gaps = roots
      .slice(1)
      .map((r, i) => r.top - roots[i]!.bottom)
      .filter((g) => g >= 0);
    if (gaps.length >= 2 && Math.max(...gaps) - Math.min(...gaps) > 6) {
      add(
        "rhythm",
        frame,
        frameEl,
        `gaps between items vary from ${Math.round(Math.min(...gaps))} to ${Math.round(Math.max(...gaps))}px`,
      );
    }
    for (let i = 0; i < texts.length; i++) {
      for (let j = i + 1; j < texts.length; j++) {
        const [a, b] = [texts[i]!, texts[j]!];
        if (a.el.contains(b.el) || b.el.contains(a.el)) continue;
        const w = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
        const h = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
        if (w > 2 && h > 2) add("overlap", frame, a.el, `overlaps ${label(b.el)}`);
      }
    }
  }
  return issues;
}
