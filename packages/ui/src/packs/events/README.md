# packs/events

Pack `events`: Organising one gathering: guests, RSVPs, seating, tickets, suppliers, gifts.

Built in step U7 (drafts in U3), wave 4 of the catalog plan. Read `docs/catalog/packs/events.md` (every component, archetype and the worked example) and plan 4.4 first.

Files (exactly these, plus `index.ts` as the folder's door unless it is listed):
- `pack.ts`, `example.jsonl` (a worked example app as JSON Lines, every line validates)
- `components/`: `GuestList.tsx` `RSVP.tsx` `Seating.tsx` `Vendors.tsx` `Ticket.tsx` `Door.tsx` `Registry.tsx` `FindDate.tsx`
- `archetypes/`: `plan-event.ts` `guests.ts` `suppliers.ts` `on-the-day.ts`

Rules:
- Each component's purpose, pick, props with limits, parts, actions, states and tier are in the catalog plan.
- Ids are PascalCase and equal the file names, unique across core and packs. Follow the pack rules in `docs/catalog/packs/README.md`.
- Each component ships with two examples, its renderer in its own file, and a part in the worked example.
