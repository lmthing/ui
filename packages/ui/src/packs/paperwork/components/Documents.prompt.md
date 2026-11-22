## Purpose

Keep private records together and see when they expire.

## Pick

A private life-admin file register with owners, identifiers and expiry dates. Not ordinary links (List), documents checked against a trip (TravelDocs), purchase warranties (Warranties) or rental terms (Lease).

## Writer

- Do not copy facts from the examples. Leave issuer, number, dates and file null unless the current request supplies them. A file must be an opaque local:<id> or supplied synthetic lib:<id>, never a URL or file content.
- Use style:"cards" for separate file cards or tiles. Leave style:null unless a different layout is explicitly requested.
- A request to hide issuer, number, issue date and tags changes only detail to "brief". A row having few supplied fields does not imply brief detail. Leave detail:null unless the person expressly asks to hide fields or use a brief view.
- For a register grouped into folders, set style:"folders" and put each supplied folder name in its document row. Set pages only for an explicitly supplied page count. Set share:true only for a row with an attachment and an explicit request to offer sharing; never supply a recipient.
