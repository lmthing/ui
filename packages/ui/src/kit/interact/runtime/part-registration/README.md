# Part registration

`index.ts` tracks mounted and disabled parts by local address. A cleanup removes
only its own registration, so an older control cannot unregister its replacement.
