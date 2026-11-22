## Purpose

Draw a personal signature and save a dated copy of the reviewed form.

## Pick

Hand-draw a signature or initials with a finger or stylus on a reviewed form, then save a local signed copy. Not filling named form fields (FormFiller), a yes/no field (Field), typed client waiver acceptance (Agreement) or just viewing a file (Documents).

## Writer

- document must be an opaque local:<id> or supplied synthetic lib:<id>. Do not write strokes, marks, version, timestamp, review or saved state; those belong to the host.
- Never claim verified identity, legal validity or remote signing. Omit hint unless supplied or useful.
- Use detail:"brief" only to hide the optional hint and keep the supplied hint text in hint. Otherwise leave detail:null.
- Default style is "pad" for a signature, drawing pad, or any unspecified mark. Use "initials" only when initials are explicitly requested. Set datedStamp:true only to stamp the signing date on the copy itself; otherwise leave it null. Never supply the date.
