import { expect, it, vi } from "vitest";
import { planAct, readScreen } from "@lmthing/ui/catalog";
import {
  createAgentAccess,
  createScreenController,
  type AuthenticateReveal,
  type PrivateResult,
} from "@lmthing/ui/kit";
import { copy, defs, fixturePin, generated, pad, rowCopy, screen, verify } from "./private-values.fixture";

function setup() {
  const requests: ((result: PrivateResult) => void)[] = [];
  const authenticateReveal = vi.fn<AuthenticateReveal>(
    () => new Promise((resolve) => requests.push(resolve)),
  );
  const writeClipboard = vi.fn();
  const copyPrivate = vi.fn(() => "approved" as const);
  const check = vi.fn((input: string): PrivateResult | Promise<PrivateResult> =>
    input === fixturePin ? "approved" : "denied",
  );
  const privateValues = {
    copy: { [copy.address]: copyPrivate, "home/vault/r1": copyPrivate },
    verify: { [verify.address]: check },
  };
  const onAction = vi.fn();
  const onChange = vi.fn();
  const secretOutput = "synthetic-generated-output";
  const options = {
    screen,
    defs,
    requireMounted: true,
    authenticateReveal,
    privateValues,
    writeClipboard,
    resolveClipboardText: (address: string) => (address === generated.address ? secretOutput : undefined),
    onAction,
    onChange,
  };
  const runtime = createScreenController(options);
  const unregister = [copy, rowCopy, verify, generated, { address: pad }].map(({ address }) =>
    runtime.registerPart(address),
  );
  const agent = createAgentAccess({ defs, current: () => screen, store: runtime.store, runtime });
  return {
    runtime,
    agent,
    authenticateReveal,
    copyPrivate,
    check,
    requests,
    unregister,
    options,
    onAction,
    onChange,
    writeClipboard,
    secretOutput,
  };
}

it("requires a fresh local authorization for each protected copy, even for addressed rows", async () => {
  const { runtime, agent, authenticateReveal, copyPrivate, requests, onAction } = setup();
  expect(agent.read()).toContain("[vault/copy copy !needs-ok]");
  expect(agent.read()).toContain("[vault/r1 copy !needs-ok]");
  for (const step of [copy, rowCopy]) {
    expect(planAct(screen, defs, {}, [step])).toMatchObject({ ok: false });
    expect(agent.act(step)).toMatchObject({ ok: false });
    expect(runtime.act([step, verify])).toMatchObject({ ok: false, at: 0 });
    expect(runtime.act({ ...step, value: fixturePin })).toMatchObject({ ok: false, code: "invalid_value" });
    expect(runtime.act(step, { dryRun: true })).toMatchObject({ ok: true, changed: "" });
    expect(runtime.press(step.address)).toMatchObject({ ok: true, changed: "" });
    expect(runtime.press(step.address)).toMatchObject({ ok: true });
    expect(runtime.privateStatus(step.address, "copy")).toBe("pending");
    expect(authenticateReveal).toHaveBeenLastCalledWith({
      action: "copy",
      address: step.address.replace(/\/root$/, ""),
      tier: "ok",
    });
    requests.shift()!("denied");
    await expect.poll(() => runtime.privateStatus(step.address, "copy")).toBe("denied");
    expect(copyPrivate).not.toHaveBeenCalled();
  }
  expect(authenticateReveal).toHaveBeenCalledTimes(2);
  runtime.press(rowCopy.address);
  requests.shift()!("approved");
  await expect.poll(() => runtime.privateStatus(rowCopy.address, "copy")).toBe("approved");
  expect(copyPrivate).toHaveBeenCalledOnce();
  expect(onAction).not.toHaveBeenCalled();
  expect(agent.log()).toEqual([]);
  expect(runtime.store.snapshot()).toEqual({});
});

it.each(["disable", "unmount", "rebind", "reset", "dispose"] as const)(
  "does not copy when approval arrives after %s",
  async (change) => {
    const { runtime, copyPrivate, requests, unregister, options } = setup();
    runtime.press(copy.address);
    const rebind = () =>
      (options.privateValues = { ...options.privateValues, copy: {} as typeof options.privateValues.copy });
    const interrupt = {
      disable: () => runtime.registerDisabledPart(copy.address),
      unmount: unregister[0]!,
      reset: runtime.reset,
      dispose: runtime.dispose,
      rebind,
    };
    interrupt[change]();
    requests.shift()!("approved");
    await Promise.resolve();
    expect(copyPrivate).not.toHaveBeenCalled();
    expect(runtime.privateStatus(copy.address, "copy")).not.toBe("approved");
  },
);

it("keeps bounded keypad edits out of reads, validation drafts, actions and snapshots", async () => {
  const { runtime, agent, check, onAction, onChange } = setup();
  expect(readScreen(screen, defs)).not.toContain("[vault/pad");
  expect(agent.read()).toContain("[vault/verify press !needs-ok]");
  const paste = { address: pad, action: "type", value: fixturePin };
  expect(agent.act(paste)).toMatchObject({ ok: false });
  expect(agent.act(verify)).toMatchObject({ ok: false });
  expect(runtime.edit(pad, fixturePin)).toMatchObject({ ok: false });
  expect(runtime.privateKeypadEdit(pad, fixturePin)).toBe(true);
  expect(runtime.privateKeypadLength(pad)).toBe(0);
  for (const digit of ["0", "x", "2", "0", "8"])
    expect(runtime.privateKeypadEdit(pad, { append: digit })).toBe(true);
  expect(runtime.privateKeypadLength(pad)).toBe(3);
  expect(runtime.act(verify, { dryRun: true })).toMatchObject({ ok: true, changed: "" });
  expect(check).not.toHaveBeenCalled();
  expect(runtime.press(verify.address)).toMatchObject({ ok: true, changed: "" });
  expect(runtime.privateKeypadLength(pad)).toBe(0);
  expect(check).toHaveBeenCalledExactlyOnceWith(fixturePin);
  await expect.poll(() => runtime.privateStatus(verify.address, "verify")).toBe("approved");
  runtime.privateKeypadEdit(pad, { append: "1" });
  runtime.press(verify.address);
  await expect.poll(() => runtime.privateStatus(verify.address, "verify")).toBe("denied");
  expect(runtime.store.snapshot()).toEqual({});
  expect(agent.log()).toEqual([]);
  expect(agent.read()).not.toContain(fixturePin);
  expect(onAction).not.toHaveBeenCalled();
  expect(onChange).not.toHaveBeenCalled();
});

it("leaves generated output on ordinary clipboard copy without reading or retaining the output", () => {
  const { agent, runtime, authenticateReveal, writeClipboard, secretOutput } = setup();
  expect(agent.act(generated)).toMatchObject({ ok: true, changed: "vault/generated copy" });
  expect(authenticateReveal).not.toHaveBeenCalled();
  expect(writeClipboard).toHaveBeenCalledExactlyOnceWith(secretOutput);
  expect(agent.read()).not.toContain(secretOutput);
  expect(JSON.stringify([runtime.store.snapshot(), agent.log()])).not.toContain(secretOutput);
});

it("hides disabled private offers and refuses the same addressed actions", () => {
  const { runtime, agent, authenticateReveal, check } = setup();
  for (const step of [copy, verify]) {
    const part = step.address.replace("home/", "");
    const label = `[${part} ${step.action} !needs-ok]`;
    expect(agent.read()).toContain(label);
    const enable = runtime.registerDisabledPart(step.address);
    expect(agent.read()).not.toContain(label);
    expect(runtime.act(step)).toMatchObject({ ok: false, code: "disabled" });
    enable();
    expect(agent.read()).toContain(label);
  }
  expect(authenticateReveal).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
});

it("rejects a second submission while checking without consuming its new draft", async () => {
  const { runtime, check } = setup();
  let finish!: (result: PrivateResult) => void;
  check.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  runtime.privateKeypadEdit(pad, { append: "1" });
  expect(runtime.act(verify)).toMatchObject({ ok: true });
  runtime.privateKeypadEdit(pad, { append: "2" });
  expect(runtime.act(verify)).toMatchObject({ ok: false, code: "not_actionable" });
  expect(check).toHaveBeenCalledExactlyOnceWith("1");
  expect(runtime.privateKeypadLength(pad)).toBe(1);
  finish("denied");
  await expect.poll(() => runtime.privateStatus(verify.address, "verify")).toBe("denied");
  expect(runtime.act(verify)).toMatchObject({ ok: true });
  expect(check).toHaveBeenLastCalledWith("2");
  expect(runtime.privateKeypadLength(pad)).toBe(0);
});
