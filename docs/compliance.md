# Document search control checks

Sources checked 8 November 2026. This is a record review aid for a New Zealand organisation, not a compliance certificate. Apply the rules for the organisation's actual jurisdiction and data. The software does not take responsibility for deciding lawful use or retention periods.

| Rule | Source | Implemented check | Human decision |
|---|---|---|---|
| NZ-IPP5 | [NZ Privacy Commissioner, principle 5](https://www.privacy.org.nz/privacy-principles/5/) | Missing collection owner, purpose or current access review | Check reasonable safeguards and authorised access against the actual source systems |
| NZ-IPP9 | [NZ Privacy Commissioner, principle 9](https://www.privacy.org.nz/privacy-principles/9/) | Missing or overdue document retention-purpose review | Decide whether a lawful purpose still needs the information and consider any legal hold |
| OWNERSHIP | Local policy | Missing document owner or purpose | Assign accountability and a documented use |
| CONTENT-REVIEW | Local policy | Draft or overdue document review | Verify content and set an appropriate next review date |

No universal retention period is hardcoded. Review dates are chosen by the operator. Documents with overdue reviews and collections with overdue access reviews are withheld from normal search. This is a local operating control, not wording from legislation.

The administrator can read the whole database. Row-level security denies anonymous public grants, but the database owner bypasses it. Audience filters are not authentication. An empty findings list cannot prove appropriate access, secure hosting, accurate source content, valid consent or lawful retention.

Archive removes a document from search but retains its body, original source data, audit and reviews. Backups, generated reports and exports also need retention controls. No automated destruction is implemented. Record a disposition decision and implement an authorised purge process before using this for material that must be erased.
