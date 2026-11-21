import { z } from "zod";
import * as c from "../catalog";
import * as kit from "../kit";

export const meta = {
  id: "PassCard",
  status: "ready",
  group: "content",
  purpose: "Keep a membership, coupon, or transit pass ready to show and scan.",
  pick: "A digital membership card, coupon, insurance ID or transit fare pass with a code to show or scan. Not ordinary details of one record without a pass (KeyValue), an event admission ticket (Ticket or EventPass), a travel itinerary (Reservation), or a full tier and reward wallet (RewardsWallet).",
  writeHints: [
    'Use style "coupon" for a voucher with an expiry, "code" for a centered QR-only presentation, or "transit" for a fare pass; otherwise use style null for a membership card. If a code is supplied, copy the exact value and use codeKind "qr". Never invent issuer credentials, member IDs, balances, or codes.',
    'Use detail "brief" only if asked to hide the summary facts; keep the supplied facts in the data. Use null for unrequested axes and [] when there are no summary facts.',
  ],
  region: "body",
  weight: 2,
  tier: "phone",
  realPath: "An issuer-supplied pass saved on the device, not a way to issue credentials.",
  variants: { density: ["comfortable", "compact"], detail: ["full", "brief"] },
  variantParts: { "detail.brief": { hides: ["root", "label", "value"] } },
  // prettier-ignore
  parts: [
    "root", "frame", "issuer", "title", "member_name", "member_id", "reveal", "reveal_icon", "reveal_label",
    "balance", "expiry", "status", "code", "code_icon", "code_label", "qr", "bright", "bright_label", "message",
  ],
  items: { key: "facts", parts: ["root", "label", "value"], visibleWhen: { detail: "full" } },
  states: ["filled", "empty", "loading", "error"],
  actions: {
    parts: { root: ["press"], reveal: ["toggle"], code: ["copy"], bright: ["toggle"] },
    when: { reveal: { canReveal: true }, code: { scannable: true }, bright: { scannable: true } },
    credentialToggles: { reveal: "memberId" },
  },
  read: (value, _state, lang): string[] => {
    const input = value as z.output<typeof props>;
    const { balance, pointsLabel, expiresAt, style, used, memberId } = input;
    const { canReveal, scannable } = passControls(input);
    const words = c.wordsFor(lang).passCard;
    return [
      ...(balance === undefined ? [] : [c.numberLine(balance, lang), pointsLabel ?? words.balance]),
      ...(expiresAt ? [c.passExpiryLine(expiresAt, lang)] : []),
      ...(used ? [words.used] : style === "transit" && scannable ? [words.ready] : []),
      ...(canReveal && memberId ? [c.maskedPassId(memberId, lang), words.reveal] : []),
      ...(scannable ? [words.copy, words.brighten] : []),
    ];
  },
} as const satisfies c.Meta;

// prettier-ignore
export const props = z.strictObject({
  ...c.variantProps(meta.variants),
  issuer: c.text(28), title: c.text(32), memberName: c.text(24).optional(),
  memberId: c.text(24).meta({ kind: "secret", max: 24 }).optional(), masked: z.boolean().default(true),
  code: c.secret(64).min(1).meta({ kind: "secret", max: 64 }).optional(), codeKind: z.enum(["qr"]).default("qr"),
  balance: z.number().optional(), pointsLabel: c.text(20).optional(),
  facts: z.array(z.strictObject({ label: c.text(16), value: c.text(24) })).min(0).max(4).default([]),
  expiresAt: c.isoDate.optional(), used: z.boolean().default(false),
  style: z.enum(["card", "coupon", "code", "transit"]).default("card"),
}).overwrite((value) => ({
  ...value, ...passControls(value),
  reveal: { value: "off" }, bright: { value: "off" },
  pointsLabel: value.balance === undefined ? undefined : value.pointsLabel,
}));

// prettier-ignore
function passControls({ code, used, masked, memberId }: Pick<PassProps, "code" | "used" | "masked" | "memberId">) {
  const invalid = code !== undefined && !used && (!code.trim() || /[\uD800-\uDFFF]/u.test(code));
  return {
    canReveal: masked && !!memberId,
    scannable: !!code && !used && !invalid,
    ...(invalid ? { state: "error" as const } : {}),
  };
}

export function fallback({ cast, lang }: c.FallbackInput): z.input<typeof props> {
  const thing = c.thingOf(cast),
    [item] = c.itemsOf(cast, 1);
  return {
    title: (item && c.titleOf(item, 32, thing)) || c.placeholderTitle(0, lang),
    issuer: (item && c.detailOf(item, 28, thing)) || c.wordsFor(lang).placeholderDetail,
  };
}

// prettier-ignore
export const examples = [
  { issuer: "Ledge Plant Club", title: "Grower membership", memberName: "Mira Cole", memberId: "DEMO-0642",
    code: "DEMO:LEDGE-MEMBER", facts: [{ label: "Level", value: "Seedling" }, { label: "Home nursery", value: "West Greenhouse" }] },
  { issuer: "Trot", title: "First walk voucher", style: "coupon", code: "DEMO:TROT-OFFER",
    expiresAt: "2027-09-30", facts: [{ label: "Includes", value: "One park walk" }] },
  { issuer: "Ledge Seed Library", title: "Seed swap pickup", style: "code", code: "DEMO:SEED-SWAP" },
  { issuer: "Trot Shuttle", title: "Park shuttle pass", style: "transit", code: "DEMO:TROT-SHUTTLE",
    balance: 4, pointsLabel: "Rides left" },
  { issuer: "Ledge Plant Club", title: "Potting bench voucher", style: "coupon", code: "DEMO:LEDGE-USED", used: true },
] satisfies z.input<typeof props>[];

const { choose, write, read } = c.probesFor("PassCard");
// prettier-ignore
export const probes = [
  choose("Put my garden-centre member card on screen with its masked account number and the QR I show at checkout."),
  choose("Show the room and watering interval of my fern as two plain label-and-value facts.", "KeyValue"),
  write("Show a demo Pine Nursery loyalty membership titled Grower Club for Alex, member ID DEMO-1937 masked, with QR payload DEMO:PINE and 18 points."),
  { ...write("Show a demo Fern Society membership called Grower Club with QR payload DEMO:FERN. Keep the fact Level: Seedling but hide the summary facts from the display."),
    variant: { axis: "detail", value: "brief" } },
  read("Copy the QR payload to my clipboard.", { address: "c1/code", action: "copy" }),
] satisfies c.Probe[];

type PassProps = c.Props<typeof props, typeof meta>;
type Layout = { density: c.ThemeDensity; align: "start" | "center" };
// prettier-ignore
function PassDetails({ input, layout, revealed }: { input: PassProps; layout: Layout; revealed: boolean }) {
  const { lang, words: { passCard: words } } = kit.useWords();
  const loading = kit.useComponentState() === "loading";
  const { memberName, memberId, style, balance, pointsLabel, used, expiresAt, facts } = input;
  const { canReveal, scannable } = passControls(input);
  return <>
    {(memberName || memberId) && <kit.KitContent group="response" {...layout}>
      {loading ? <kit.KitSkeleton shape="figure" inset="none" density={layout.density}
        content={[["body", memberName], ["label", memberId && c.maskedPassId(memberId, lang)]]} /> : <>
      {memberName && <kit.KitText part="member_name" {...layout}>{memberName}</kit.KitText>}
      {memberId && <kit.KitText part="member_id" tone="muted" role="label" {...layout}>
        {!canReveal || revealed ? memberId : c.maskedPassId(memberId, lang)}
      </kit.KitText>}
      </>}
      {canReveal && (loading ? <kit.KitSkeleton shape="control" kind="quiet" label={words.reveal} />
        : <kit.KitAction part="reveal" action="toggle" value={!revealed} icon={revealed ? "lock" : "eye"}
          kind="quiet" label={revealed ? words.hide : words.reveal} />)}
    </kit.KitContent>}
    {(balance !== undefined || expiresAt || used || (style === "transit" && scannable)) &&
      <kit.KitContent group="response" {...layout}>
        {loading ? <kit.KitSkeleton shape="figure" inset="none" density={layout.density} /> : <>{balance !== undefined && <>
          <kit.KitText part="balance" role="number" numberScale={style === "transit" ? "display" : "compact"} {...layout}>
            {c.numberLine(balance, lang)}
          </kit.KitText>
          <kit.KitText part={null} role="label" tone="muted" {...layout}>{pointsLabel ?? words.balance}</kit.KitText>
        </>}
        {expiresAt && <kit.KitText part="expiry" role="label" tone="muted" {...layout}>{c.passExpiryLine(expiresAt, lang)}</kit.KitText>}
        {(used || (style === "transit" && scannable)) && <kit.KitText part="status" role="label" tone={used ? "muted" : "good"} {...layout}>
          {used ? words.used : words.ready}
        </kit.KitText>}</>}
      </kit.KitContent>}
    {input.detail === "full" && facts.length > 0 && <kit.KitContent group="response" {...layout}>
      <kit.KitGrid arrange="grid" density={layout.density}>
        {facts.map((fact) => loading ? <kit.KitSkeleton key={fact.id} shape="figure" inset="none" density={layout.density}
          content={[["label", fact.label], ["body", fact.value]]} />
          : <kit.KitRow item={fact.id} key={fact.id} label={fact.label} inline {...layout}>
          <kit.KitText part="label" role="label" tone="muted" {...layout}>{fact.label}</kit.KitText>
          <kit.KitText part="value" {...layout}>{fact.value}</kit.KitText>
        </kit.KitRow>)}
      </kit.KitGrid>
    </kit.KitContent>}
  </>;
}

// prettier-ignore
function ScannerSwitch({ label, density, align }: Layout & { label: string }) {
  const loading = kit.useComponentState() === "loading";
  const text = loading ? <kit.KitSkeleton shape="figure" inset="none" density={density} centered={align === "center"}
    content={[["label", label]]} /> : <kit.KitText part="bright_label" role="label" {...{ density, align }}>{label}</kit.KitText>;
  const toggle = <kit.KitTrail kind="toggle" part="bright" label={label} />;
  return align === "center" ? <kit.KitContent align={align} density={density}>{text}{toggle}</kit.KitContent>
    : <kit.KitRow part={null} label={label} inline density={density} trailing={toggle}>{text}</kit.KitRow>;
}

// prettier-ignore
export function PassCard(input: PassProps) {
  const { screen, component } = kit.usePartContext();
  const state = kit.useComponentState();
  const { scannable, state: invalid } = passControls(input);
  const reveal = kit.useControlValue<unknown>(`${screen}/${component}/reveal`, undefined);
  const bright = kit.useControlValue(`${screen}/${component}/bright`, false) && scannable;
  const { words: { passCard: words } } = kit.useWords();
  const density = kit.useVariant("density", meta.variants.density, input.density);
  const align = input.style === "code" ? "center" : "start";
  const layout = { density, align } as const;
  if (state === "empty" || state === "error" || (state === "filled" && invalid))
    return <kit.KitCard part="root"><kit.KitEmpty icon={state === "empty" ? "credit_card" : "alert"}
      part="message" {...(state !== "empty" && { title: words.invalid })} decorativeIcon /></kit.KitCard>;
  if (state === "loading") return <kit.KitCard padded part="root" density={density}>
    <kit.KitSkeleton shape="figure" content={[["label", input.issuer], ["heading", input.title]]} inset="none" centered={align === "center"} density={density} />
    <PassDetails input={input} layout={layout} revealed={false} />
    {scannable && <><kit.KitCode part={null} loading label={words.qr} />
      <kit.KitSkeleton shape="control" kind="quiet" {...(align === "center" && { label: words.copy, full: true })} />
      <ScannerSwitch label={words.brighten} {...layout} /></>}
  </kit.KitCard>;
  const qr = scannable && <kit.KitContent group={bright ? "content" : "response"} align="center" density={density}>
    <kit.KitCode part="qr" value={input.code!} label={words.qr} />
    <kit.KitAction part="code" action="copy" value={input.code!} copiedLabel={words.copied} kind="quiet"
      {...(align === "center" ? { label: words.copy, full: true } : { icon: "clipboard", a11y: words.copy })} />
  </kit.KitContent>;
  return <kit.KitCard part="frame" padded density={density} look={input.style === "coupon" && !input.used ? "tinted" : "surface"}
    {...(bright ? { swatch: "white" as const } : {})}>
    {bright && qr}
    <kit.KitRow part="root" role="button" label={input.title} inline density={density}>
      <kit.KitText part="issuer" role="label" tone="muted" {...layout}>{input.issuer}</kit.KitText>
      <kit.KitText part="title" role="heading" {...layout}>{input.title}</kit.KitText>
    </kit.KitRow>
    <PassDetails input={input} layout={layout} revealed={c.credentialToggleOn(reveal, input.memberId)} />
    {!bright && qr}
    {scannable && <ScannerSwitch label={words.brighten} {...layout} />}
  </kit.KitCard>;
}
