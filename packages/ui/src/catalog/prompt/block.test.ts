import { expect, it } from "vitest";
import { createRegistry } from "@lmthing/ui/catalog";
import { registryOf } from "../registry";
import type { Definition } from "../probes";
import type { PackId } from "../meta";
import { buildBlock, estimateTokens } from "./index";

const core = createRegistry({ includeDrafts: true });
const coreDefs: readonly Definition[] = core.defs;
const block = buildBlock(core, "core");

it("snapshots the real core block", () => {
  expect(block).toMatchInlineSnapshot(`
    "- Header: Name the screen and offer one optional shortcut. Pick: The title at the top of a screen. Not a label above a group (SectionTitle) or the screen's main message (Hero).
    - SectionTitle: Label a group of content and offer one optional link to more. Pick: A short label just above a group within a screen. Not the screen's title at the top (Header) or its main message (Hero).
    - Steps: Know your current place in a short ordered flow. Pick: Show the current position in a short setup or booking flow. Not independent jobs to tick off (Checklist) or progress toward a numeric goal (Progress).
    - Article: Read a long piece with headings, paragraphs, quotes and links. Pick: A long article, guide, or policy with several paragraphs and structured text. Not one short supporting sentence (Note), expandable answers (List), a community post (Post), or terms to sign (Agreement).
    - Banner: Something important to notice now, with an optional link to act. Pick: A separate warning or status strip above the main content, such as a closure or cancellation. Not the screen's main headline even when it counts what needs attention (Hero), a supporting sentence (Note) or a panel with more detail (Sheet).
    - Bubbles: A conversation between you and someone else, with each person's messages kept distinct. Pick: Show an exchange between you and another person, keeping who said each message clear. Not things to browse and tap (List) or one supporting sentence without a reply (Note).
    - Card: One thing with a little detail, optionally tappable to open it. Pick: A compact preview of one thing, with a title and short detail, optionally opening it. Not several separate things to scan (List) or the screen's main headline (Hero).
    - Empty: A calm message on a screen that has no content yet. Pick: Only when there is no content or no results yet, explaining their absence. Not the screen's main statement about what exists or needs attention (Hero), a separate warning or status notice (Banner), or a supporting sentence (Note).
    - FileList: Show attached files and let people preview, download, or remove them. Pick: One to six non-image file attachments with names, formats and sizes, for example PDFs, contracts, spreadsheets, ZIPs or audio files. Not photos (Gallery or Photo), general list records (List), a file explorer (DriveTree or FileBrowser), or an ID vault (Documents).
    - Gallery: Browse several pictures together, optionally opening one. Pick: Several pictures to browse together, in a grid or sideways strip. Not one picture on its own (Photo) or text-led rows of separate things (List).
    - Hero: The screen's main statement or headline number, including what needs attention today. Pick: The focal message of the whole screen: its main headline, photo-led introduction or headline number. A count of things needing attention can be the main headline, not an alert. Not a separate warning above other content (Banner), a supporting sentence (Note), several numbers (Stats) or one sum of money (Amount).
    - KeyValue: Label and value details of one single thing, like its room or schedule. Pick: Any need about one thing's details or settings. Not several separate things (List) or summary numbers (Stats).
    - List: Several things of the same kind, each one tappable. Pick: The person's separate records of one kind, in tappable rows to scan by name and open one. Photos can support the rows. Not browsing the photos themselves (Gallery), one featured thing (Card), details of one record (KeyValue), or jobs to tick off (Checklist).
    - Note: One short sentence of supporting information. Pick: Add a short supporting sentence. Not something to notice now (Banner), the screen's main statement (Hero) or text the person writes (Composer).
    - PassCard: Keep a membership, coupon, or transit pass ready to show and scan. Pick: A digital membership card, coupon, insurance ID or transit fare pass with a code to show or scan. Not ordinary details of one record without a pass (KeyValue), an event admission ticket (Ticket or EventPass), a travel itinerary (Reservation), or a full tier and reward wallet (RewardsWallet).
    - People: Who else is involved, with their names and roles. Pick: A plain roster of people: several participants, teammates, clients or family members, with names and optional photos or roles. Choose this even for just names and photos, without roles, links or turn controls. Not general non-person records (List) or one person's identity block (Profile).
    - Photo: Show one picture, with an optional caption. Pick: One picture on its own, optionally captioned. Not several pictures (Gallery) or a photo-led main message with a headline (Hero).
    - Player: Listen to or watch one recording, with play, skip and a scrubber. Pick: One recording to listen to or watch now, such as a meditation, a lesson, an episode, an exercise video or a voice memo. Not a list of recordings to choose from (List), one picture (Photo), or timing an activity with no recording (Timer).
    - Profile: Identify the person, pet or plant whose screen this is. Pick: An identity block with a name, short detail and optional portrait. Not a screen title or navigation (Header), or a summary to open another thing (Card).
    - Review: See what people rated and wrote about a service, item, book, or film. Pick: Customer, visitor, reader, or viewer feedback as an average with five bars or authored reviews and replies. Not logging one's own feeling or rating (Scale) or community comments (Comments).
    - SwipeStack: Choose between things one at a time, swiping the current one to keep or skip. Pick: Decide which of several things to keep or skip, one at a time. Swipe only the top choice. Not browsing several captioned pictures together (Gallery) or opening a single featured preview (Card).
    - Amount: One sum of money written properly, with its period, old price or change. Pick: One sum of money is the point: a balance, a price, a total or what is owed. Not several figures side by side (Stats), the screen's headline in words (Hero), or the price on each row of a list (List).
    - Bars: Compare counts or amounts across days or categories, using the actual counted or measured unit. Pick: Compare one amount across days or categories. Not a few separate summary numbers (Stats), a trend with its latest value (Sparkline) or progress toward targets (Progress).
    - Calendar: See which dates have something planned and open a day. Pick: Days of a week or month, with dates marked for planned activity or a check-in and check-out range. Not events with times in order (Timeline) or separate things to browse (List).
    - Counter: Increase or decrease one running count by a fixed step with each tap. Pick: One count whose plus button increments and minus button decrements the number by a fixed step. Not several read-only summary numbers (Stats) or a number entered in a form (Field).
    - MapPins: See where nearby places are and open a place. Pick: Places positioned on a map, with matching numbered labels and optional links. Not places visited in travel order (Route) or things to browse without their locations on a map (List).
    - Progress: See measured progress toward one or more targets. Pick: One or more measured amounts against their own targets, whether bars or a single circular goal. Not concentric daily goals (ActivityRings), amounts compared with each other (Bars), independent summary numbers (Stats), or position in an ordered flow (Steps).
    - Route: Follow a path between places, from the first stop to the last. Pick: Show places visited in travel order, with an optional total distance. Not events ordered by time (Timeline) or locations positioned on a map without a visiting order (MapPins).
    - Sparkline: See how one measurement is changing, alongside its latest value. Pick: One latest value with its recent rise or fall. Not separate amounts per day or category to compare (Bars), or several summary numbers (Stats).
    - Stats: Two to four independent summary numbers, with labels, units and optional change arrows. Pick: Several independent summary measurements shown together, with an optional change arrow on each. Not amounts compared across days or categories (Bars), one latest measurement with its recent line (Sparkline), one record's details (KeyValue), one headline number (Hero), or one sum of money (Amount).
    - Streak: How many days in a row you kept a habit, with this week's completed days. Pick: Consecutive days of a habit with daily completion this week. Not several independent totals (Stats) or your position in an ordered flow (Steps).
    - Timeline: Events in time order, or activities sized by duration on an hour rail. Pick: Dated or timed events in order. Use hours when start/end times, duration and free gaps matter. Not choosing dates (Calendar), things without times to browse (List), or independent jobs (Checklist).
    - Timer: Measure time remaining or elapsed, with controls to start and stop. Pick: Time remaining until an activity ends or elapsed since it began. Not a number manually nudged up or down (Counter) or an amount completed toward a goal (Progress).
    - Checklist: Things to do, with each job ticked off when done. Pick: Tick off independent jobs. Not browsing and opening things (List) or following an ordered sequence (Steps).
    - Chips: Narrow a list by toggling visible labels, or pick one value from a few choices. Pick: One row of short options to tap directly: toggle several filters independently or choose one value. Not search with named filter pickers (FilterBar), switching views (Segmented), ticking off jobs (Checklist) or options that each need a sentence (Choice).
    - Choice: Choose among two to five options that each need a sentence to explain. Pick: Choosing among a few options that each carry a short explanation, such as a plan, an answer to a question or a way of doing something. Not one-word filters (Chips), a short value inside a form (Field), switching views of one screen (Segmented), or keep-or-skip one at a time (SwipeStack).
    - Composer: Write several lines of text: an entry, a note, a review or a reply. Pick: Writing more than one line, such as a journal entry, a note, a review or a reply under a conversation. Not one short value on a form (Field), or finding something by name (Search).
    - Field: Enter or change one labelled piece of information on a form. Pick: Enter one named value, such as a name, date, amount or form choice. Not finding things by typing a query (Search), standalone collection filters and quick choices (Chips), several lines of writing (Composer) or options that each need a sentence (Choice).
    - FilterBar: Search records and narrow them by named fields, then clear the filters together. Pick: Search a list and filter it through named fields that each open their own option picker; show sort order and clear filters together. Not one row of visible labels toggled directly (Chips), switching views (Segmented) or search alone (Search).
    - Scale: Log a rating or feeling from one to five. Pick: Rate how something went, feels or looks on five ordered levels. Not switching views (Segmented) or entering information in a general input (Field).
    - Search: Find one thing among many by typing words from its name. Pick: Type a query above a list to find matching things. Not a few fixed filters (Chips), entering one piece of information (Field) or writing several lines (Composer).
    - Segmented: Switch between two to four views of the same screen. Pick: One active view of the same screen, such as today or week. Not filters or choices among values (Chips), or navigation between screens (TabBar).
    - Actions: Two to four shortcuts to different things the person can do next. Pick: Two to four separate navigation shortcuts together, such as logging, adding and viewing a schedule. Not independent jobs to tick off (Checklist), one main action (Button), or records to browse (List).
    - Button: A screen's main task action or a quiet secondary action. Pick: One labelled action to press. Not two to four shortcuts (Actions), a tappable summary (Card), or a shortcut to one item in a list.
    - Sheet: A panel over the screen for more detail, a longer pick or a few extra actions. Pick: More about one thing without leaving the screen, picking from six or more options, or a few extra actions behind the header. Not a message that stays on the screen (Banner), two to five options shown inline (Choice, Chips), or a whole new task (a new screen).
    - Success: Know an action worked, with its result and the saved item's details. Pick: A standalone moment after an action worked, with a result title and optional detail. Not an ongoing status or urgent warning at the top (Banner), or a screen with no content yet (Empty).
    - Camera: Aim at something to take a photo, record video, or scan it. Pick: Aim at a subject to take a new picture, record video, scan a code or capture both sides of a document. Not showing an existing picture (Photo), or adding a picture to a labelled form value (Field).
    - Canvas: An idea no existing component can express, such as a game or a drawing tool. Pick: Only choose Canvas for an idea no other component can express, such as an interactive game or a drawing tool. Not a message about missing content (Empty), or an existing image to display (Photo)."
  `);
});
it("keeps the real core under 3,500 estimated tokens", () => {
  expect(estimateTokens(block)).toBeLessThan(3500);
});

// Ten entries per fixture pack exercise the planned pack size using real component prose.
const packs: PackId[] = ["booking", "customers", "money", "places"];
const components: Record<string, Definition> = {};
const membership: Record<string, PackId> = {};
for (const pack of packs) {
  coreDefs
    .filter((def) => !def.meta.codeOwned)
    .slice(0, 10)
    .forEach((def, i) => {
      const id = `${pack}${i}`;
      components[id] = { ...def, meta: { ...def.meta, id } };
      membership[id] = pack;
    });
}
const registry = registryOf(components, { packs, includeDrafts: true }, membership);

it.each(packs)("keeps fixture pack %s under 1,200 estimated tokens", (pack) => {
  expect(estimateTokens(buildBlock(registry, pack))).toBeLessThan(1200);
});
it.each(packs)("keeps core plus every triple excluding %s under 7,000 tokens", (excluded) => {
  const combined = [
    block,
    ...packs.filter((pack) => pack !== excluded).map((pack) => buildBlock(registry, pack)),
  ].join("\n");
  expect(estimateTokens(combined)).toBeLessThan(7000);
});

it("scopes blocks and sorts by group then id without mutating definitions", () => {
  const base = coreDefs[0]!;
  const make = (id: string, group: Definition["meta"]["group"], codeOwned = false): Definition => ({
    ...base,
    meta: { ...base.meta, id, group, codeOwned },
  });
  const defs = [
    make("Zulu", "content"),
    make("Owned", "structure", true),
    make("Beta", "structure"),
    make("Alpha", "content"),
    make("Pack", "action"),
  ];
  const scoped = registryOf(
    Object.fromEntries(defs.map((def) => [def.meta.id, def])),
    { packs: ["booking"], includeDrafts: true },
    { Pack: "booking" },
  );
  const ids = (scope: "core" | PackId) =>
    buildBlock(scoped, scope)
      .split("\n")
      .map((line) => line.split(":")[0]);
  expect(ids("core")).toEqual(["- Beta", "- Alpha", "- Zulu"]);
  expect(ids("booking")).toEqual(["- Pack"]);
  expect(buildBlock(scoped, "money")).toBe("");
  expect(buildBlock({ ...scoped, defs: [...scoped.defs].reverse() }, "core")).toBe(
    buildBlock(scoped, "core"),
  );
  expect(scoped.defs).toEqual(defs);
  expect(buildBlock(registryOf(components), "booking")).toBe("");
});
