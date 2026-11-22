## Purpose

Keep private records together and see when they expire.

## Pick

A private life-admin file register with owners, identifiers and expiry dates. Not ordinary links (List), documents checked against a trip (TravelDocs), purchase warranties (Warranties) or rental terms (Lease).

## Writer

- Never invent a document number or expiry warning. Copy dates only if known. File is an opaque local:<id> or supplied synthetic lib:<id>, never a URL or file content.
- Exact defaults are style:null, density:null, surface:null, detail:null. Change each field only for its own explicit request: cards for separate file tiles, compact for tighter spacing, plain for no enclosing card, brief for fewer details.
- A request to hide issuer, number, issue date and tags changes only detail to "brief". Keep surface:null and density:null unless separately requested. If only a plain background is requested, set surface:"plain" and keep density:null and detail:null.
