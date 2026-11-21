import { components, type ActStep, type DeviceData } from "@lmthing/ui/catalog";
import { createScreenController } from "@lmthing/ui/kit";
import { expect, it } from "vitest";

it("waits for the host at every stage and invalidates a draft when the original changes", () => {
  const definition = components.Signature;
  const input = definition.examples[0]!;
  const instance = "s1";
  const address = (part: string) => `home/${instance}/${part}`;
  const screen = { id: "home", components: [{ ...input, id: instance, c: "Signature" }] };
  const v1 = { instance, document: input.document, signer: input.signer, version: "v1" };
  const forms: unknown[] = [v1];
  const deviceData: DeviceData = { signatureForms: forms };
  const events: ActStep[] = [];
  const controller = createScreenController({
    screen,
    defs: { Signature: definition },
    deviceData,
    requireMounted: true,
    onAction: (event) => events.push(event),
  });
  for (const part of ["document", "review", "pad", "save"]) controller.registerPart(address(part));
  const mark = "local:synthetic_test";
  const pad = controller.registerPrivateMarkPart(address("pad"), (ref) => ref === mark);
  const press = (part: string) => controller.press(address(part)).ok;
  try {
    expect(press("review")).toBe(false);
    expect(press("document")).toBe(true);
    expect(press("review")).toBe(false);
    const opened = { ...v1, openedVersion: v1.version };
    forms[0] = opened;
    expect(press("review")).toBe(true);
    pad.capture(mark);
    expect(events.map(({ address }) => address)).toEqual([address("document"), address("review")]);

    const reviewed = { ...opened, reviewedVersion: v1.version };
    forms[0] = reviewed;
    pad.capture(mark);
    expect(events.at(-1)).toEqual({ address: address("pad"), action: "set", value: mark });
    expect(press("save")).toBe(false);
    const draft = { ...reviewed, draft: { version: v1.version, revision: "draft1", mark } };
    forms[0] = draft;
    expect(press("save")).toBe(true);
    expect(events.at(-1)).toEqual({ address: address("save"), action: "press" });

    forms[0] = { ...draft, version: "v2" };
    expect(press("save")).toBe(false);
    expect(press("review")).toBe(false);
    pad.capture(mark);
    expect(events).toHaveLength(4);
    expect(controller.read()).not.toMatch(/private mark|local:|lib:/);
  } finally {
    controller.dispose();
  }
});
