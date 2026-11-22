/** Inspect rendered markup without depending on React element trees or mocked kit hooks. */
export type RenderedElement = { tag: string; attributes: string; children: RenderedElement[] };
export type AddressedElement = Omit<RenderedElement, "children"> & {
  text: string[];
  children: AddressedElement[];
};

export function addressedElements(html: string): Map<string, AddressedElement> {
  const stack: AddressedElement[] = [];
  const addresses = new Map<string, AddressedElement>();
  const voids = new Set([
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
  ]);
  for (const match of html.matchAll(/<!--[\s\S]*?-->|<\/?([a-z][a-z0-9-]*)\b[^>]*>|([^<]+)/gi)) {
    if (match[2]) stack.at(-1)?.text.push(match[2]);
    if (!match[1]) continue;
    const attributes = match[0],
      tag = match[1].toLowerCase();
    if (attributes.startsWith("</")) {
      stack.pop();
      continue;
    }
    const node: AddressedElement = { tag, attributes, children: [], text: [] };
    stack.at(-1)?.children.push(node);
    const address = attributes.match(/\bdata-testid="([^"]+)"/)?.[1];
    if (address) addresses.set(address, node);
    if (!voids.has(tag) && !attributes.endsWith("/>")) stack.push(node);
  }
  return addresses;
}

export function elementAt(html: string, address: string): RenderedElement {
  const found = addressedElements(html).get(address);
  if (!found) throw new Error(`No rendered part at ${address}`);
  return found;
}
/** A shared-address stepper has one accessible button per direction within its addressed group. */
export function hasStepTarget(group: RenderedElement, action: string): boolean {
  if (!["increment", "decrement"].includes(action) || !/\brole="group"/.test(group.attributes)) return false;
  return group.children.some(
    ({ attributes }) =>
      /\brole="button"/.test(attributes) &&
      /\baria-label="[^"]+"/.test(attributes) &&
      !/\bdata-testid=/.test(attributes) &&
      attributes.includes(`data-step-action="${action}"`),
  );
}
