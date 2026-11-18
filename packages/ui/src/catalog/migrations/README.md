# catalog/migrations

`migrateLine`, `migrateScreen` and `migrateJSONL` map retired DayTimeline blocks into Timeline[hours]
items while preserving component ids, state, periods, tones and links. `legacyTarget` retains old
aliases. The runtime migrates incoming screens before resolving names.

The pre-merge samples are retained in `docs/catalog/core-merge-evidence.json`; active component
recordings retire prompts mentioning the removed id and are sampled against the new catalog.
