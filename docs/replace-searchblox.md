# Replace a SearchBlox CSV collection

Sources checked 8 November 2026: [CSV Collection](https://developer.searchblox.com/docs/csv-collection) and [Configuration](https://developer.searchblox.com/docs/configuration).

## What to bring

In the SearchBlox collection settings, identify the CSV folder or uploaded source file, its unique field and its delimiter, header and quoting choices. Retrieve that original CSV from its authorised owner. SearchBlox configuration export is XML containing settings. It is not a whole-index content export and cannot feed this importer.

The free importer reads comma-separated UTF-8 with a header row and double-quote escaping, including BOM, CRLF and embedded newlines. SearchBlox supports configurable CSV settings, including different quoting. Re-export or normalise those settings first. Do not relabel an arbitrary export as this format.

## Map and preview

Copy fixtures/searchblox-map.json into private imports/. Map external_id to the collection's unique field, title to its title column, content to its text column and source_url to an HTTP(S) source reference. Owner and personal_data are optional. Missing personal_data defaults to true. Every original column remains on the document. The sample is fictional, not a captured vendor export.

Create an explicitly authorised collection with add-collection, assigning an owner, audience, purpose and access review date. Then run:

```bash
npm run search -- import searchblox --collection=COLLECTION --file=imports/source.csv --map=imports/mapping.json --actor="Your name" --dry-run --json
```

Check unique source ids, counts, titles, source links, text and intended access. Run the same command without --dry-run to save. One invalid row rolls back the whole batch. Repeating unchanged records does nothing. Changed records become drafts and lose their approval dates. Absent rows do not delete existing records.

## Review and compare

Imported documents are not searchable until a person has checked the actual source, permission, owner, purpose, review date and retention review date with review-document. Compare known searches and counts against the original records. Review fingerprints identify the specific text checked. Re-run the import in parallel while validating the switch.

Collection group is an administrator filter. It does not import SearchBlox permissions or provide a login. Shared staff access needs an authenticated layer and tested source permissions before deployment.

## What needs mapping work

Crawled collections require source text exports from the original systems. PDF binaries, connector configuration, crawl schedules, synonyms, result tuning, identities, group membership, search history and vendor settings are not imported by this CSV path. Enterprise DNA scopes those connections for your version. No whole-platform or one-day cutover guarantee is made. A prepared CSV collection can be imported with the command above.
