---
description: Import with evidence and a recorded operator.
---

Read CLAUDE.md and the relevant record first. Replace placeholders with authorised values, never guesses. Run `npm run search -- import searchblox --collection=COLLECTION --file=imports/source.csv --map=fixtures/searchblox-map.json --actor="Your name" --dry-run --json`. Inspect the result, then run the same command without `--dry-run` within the operator's authorised change. Report the saved record and any remaining review work.

Read docs/replace-searchblox.md before importing. Source CSV settings and headers vary. Validate mapping, quoted fields and record counts before saving. Imported content starts as draft.
