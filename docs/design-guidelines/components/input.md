# Input, search and selection

- **Anatomy:** `Field` has a persistent label, draft value, unit or hint and local repair. `Search` + `FilterBar` name scope, query, count and Clear; `Choice`, `Chips`, `Checklist`, `Segmented` and `Scale` make single vs multiple and checked vs selected explicit. `Composer` keeps draft, attachment state and send affordance distinct.
- **States:** Cover idle, focus, filled, selected/checked, disabled, invalid, pending and acknowledged where applicable. Preserve draft through validation, accidental dismissal and retry when safe. Differentiate empty query, no results and failed search.
- **Variants:** Use `detail`, `lead`, `trail` and existing semantic kinds; choose rows for long legitimate choices and segmented for short peer views, not irreversible actions. The focus/keyboard path and persistent label are identical under compact.
- **Motion:** Show focus or selection immediately. Insert local error without covering the next field or moving focus without cause. Cancel stale queries; pending and sent are semantic states first. No shake as the only feedback; no animated keyboard workaround in a component.
- **Do / don't:** Place “Optional” by the label and “kg” by the amount. Do not use the placeholder as the label or mark empty/unsupported sample inputs as editable live transactions.
