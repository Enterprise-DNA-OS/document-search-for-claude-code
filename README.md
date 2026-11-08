# Document Search for Claude Code

Find the approved source. See who owns it, when it was reviewed and what needs attention before staff rely on it.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and try fictional records. | Your source mapping, access rules, connections and reports. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=searchblox&utm_source=github&utm_medium=readme) · [Instead of SearchBlox](https://enterprisedna.co/omni/instead-of/searchblox)

## Start here

Node 20 or later:

```bash
npm install
npm run demo
npm run search -- search --query=supplier --group=staff
npm run search -- weekly-review
npm run docs
npm run view
```

Open the folder in Claude Code, Codex, OpenCode or Cursor. AGENTS.md and CLAUDE.md use one command library. The database is PostgreSQL or embedded PGlite. There is no paid model call in this software. Your chosen agent has its own costs.

The fictional demo has seven documents across Operations, Board and Legacy collections. One duplicate, overdue reviews, an overdue action and two unanswered travel searches make the Monday review useful. Dates are relative to the seed day. Seeding twice preserves existing records.

## What works

26 CLI commands and 28 slash-command recipes. Every domain command accepts --json. Record changes require --actor and support --dry-run. Exact codes, case-insensitive names and partial ids work. Ambiguous names list candidates and exit 1.

Full-text keyword search ranks title matches above body matches and stems English words. Only approved content with current owner, purpose, document review, retention review and collection access review is searchable. Results include source URL, review date, excerpt and SHA256 fingerprint. The CLI returns at most 20 results per query. No answer is invented when nothing matches.

This is a trusted administrator tool. Audience filtering is not user authentication. Anyone with the database owner account or shell can read all collections. Shared access requires an authenticated service with permissions enforced there. Never expose this CLI, its raw database or generated administrator reports directly to staff.

## Weekly work

/search finds evidence. /review-due and /retention-due prepare review lists. /coverage shows why a collection is held back. /gaps finds explicitly logged unanswered searches. /attention and /weekly-review keep follow-up visible. /review-document records the human check and its fingerprint. /draft-search renders a citation pack. /draft-review renders the weekly review. Nothing sends.

## Ten questions you can answer today

These are demonstrated questions for your own system, not unsupported claims about missing SearchBlox features.

1. Which current source explains supplier onboarding? Run `search --query=supplier --group=staff`.
2. Which content is excluded from staff search? Run `documents`.
3. Which documents need an owner review today? Run `review-due`.
4. Which personal records need a retention-purpose review? Run `retention-due`.
5. Which collection has no current access review? Run `compliance`.
6. Where did the same content appear twice? Run `duplicates`.
7. Which questions were logged without an answer? Run `gaps`.
8. Who has the most content held back? Run `owner-load`.
9. Which follow-up is overdue? Run `attention`.
10. What evidence supported a document approval? Run `document IMPORT-001`.

The last example uses the supplied import fixture after approval. Every other question runs on the seeded demo.

## Switch from a SearchBlox CSV collection

Use the original CSV file that feeds that collection, with its configured unique field. Configuration XML contains settings, not the document corpus. A full index export is not claimed.

```bash
npm run search -- import searchblox --collection=DEMO-OPS --file=fixtures/searchblox.csv --map=fixtures/searchblox-map.json --actor="Your name" --dry-run
```

Inspect the preview, repeat without --dry-run, then review the imported documents. Missing privacy classification defaults to personal data. Source columns are preserved. Imports are transactional and idempotent; changed content, source metadata or ownership withdraws approval. Duplicate ids in a file fail the whole batch. [Detailed switching guide](docs/replace-searchblox.md).

## Documents and dashboards

Edit brand.json once. npm run docs produces collection access reviews and document retention worksheets. npm run view produces the week, review queue and search-gap dashboards. /new-view adds another read-only report. These files contain private administrator information and are not staff portals.

/compliance links findings to [privacy rules and local controls](docs/compliance.md). The check prompts evidence review. It cannot certify lawful processing, identify all personal information or decide a retention period for your business.

## Your first hour: ten things to ask for

1. Put our name and colours on the reports.
2. Find the approved supplier guide.
3. Explain why the old policy is excluded.
4. Show the separate board audience.
5. List the content with overdue reviews.
6. Preview our source CSV without saving it.
7. Record who checked one imported document.
8. Draft a source citation pack.
9. Add a department view.
10. Add a business-specific retention reason with a tested migration.

/customise applies a tested migration, updates the importer, commands and documents, then verifies the change.

## Verification and scope

npm test covers all 26 commands, migration and seed idempotency, audience and freshness filtering, changed-source approval withdrawal, malformed imports, rollback, mapping, duplicate ids, preserved source columns, audit, export and escaped HTML. The shared manual CI workflow is configured for Windows and Linux with Node 20 and 22 and PostgreSQL 17. Local execution results and remote CI results are distinct evidence.

The free base searches supplied text. Crawlers, OCR, PDF text extraction, live connectors, semantic retrieval, SSO and staff screens are separate implementation work. It does not clone the whole SearchBlox platform. Enterprise DNA builds the agreed connections and access controls for your version. [Why no front end](docs/why-no-front-end.md) · [Operations](docs/operations.md).

## Price context

SearchBlox lists its self-managed single-server licence at $25,000 per year and its three-server cluster at $75,000. Those are vendor list prices, not verified customer invoices. [Vendor pricing](https://www.searchblox.com/pricing), checked 8 November 2026. [Selection evidence](docs/research.md).

Enterprise DNA brings across your authorised source records, builds around your business and operates your version through Omni by Enterprise DNA. One setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_campaign=searchblox&utm_medium=readme).

MIT. Not affiliated with SearchBlox or Anthropic. Hosting, agent usage and implementation have their own costs.
