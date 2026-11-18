/**
 * Set-of-Mark overlay: stamps every actionable part (button, link, checkbox, switch, tab) and every
 * item row with its address relative to its screen (`c1/r2/trail`), on a small badge at the part's
 * top-right corner, so reviewers and models can name exact parts. Runs in the page.
 */
export function drawMarks(): void {
  const layer = document.createElement("div");
  layer.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:2147483647";
  const marked = ["button", "link", "checkbox", "switch", "tab", "listitem"];
  for (const el of Array.from(document.querySelectorAll("[data-look-frame] [data-testid]"))) {
    const itemRoot = /\/r\d+\/root$/.test(el.getAttribute("data-testid")!);
    if (!marked.includes(el.getAttribute("role")!) && !itemRoot) continue;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const address = el
      .getAttribute("data-testid")!
      .split("/")
      .slice(1)
      .join("/")
      .replace(/\/root$/, "");
    const badge = document.createElement("span");
    badge.textContent = address;
    badge.style.cssText = [
      "position:absolute",
      `left:${rect.right + window.scrollX}px`,
      `top:${rect.top + window.scrollY}px`,
      "transform:translate(-100%,-40%)",
      "font:600 9px/1.2 monospace",
      "padding:1px 3px",
      "border-radius:3px",
      "color:rgb(255,255,255)",
      "background:rgba(214,0,110,.88)",
      "white-space:nowrap",
    ].join(";");
    layer.appendChild(badge);
  }
  document.body.appendChild(layer);
}
