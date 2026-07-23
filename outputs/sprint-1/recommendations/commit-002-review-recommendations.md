# Sprint 1 / Commit 002 Review Recommendations

Status: `Accepted as future guidance`

The Commit 002 review approved the current Validation Foundation and identified
non-blocking improvements for later Sprint 1 commits.

## Recommendations

| Recommendation | Priority | Handling |
| --- | --- | --- |
| Validation Error Codes | High | Add stable codes before CI/dashboard integrations depend on diagnostics. |
| Shared Validation Engine | High | Keep validation logic inside `src/validation/`. |
| Validation Categories | Medium | Start using categories in doctor output. |
| Machine-readable Output | Medium | Add JSON output for doctor/validate. |
| Separate Status / Severity | Low | Defer until info-only checks need a separate severity model. |
| Validation Rule Registry | Low | Defer until validation rules grow beyond the first Sprint 1 set. |
| Validation Documentation | Low | Add `docs/validation/error-codes.md` after codes are introduced. |

## Sprint 1 Policy

Install Wizard, WPSC Doctor, WPSC Validate, future GUI installer, and future
dashboard must call the shared Validation Engine instead of duplicating
diagnostic logic.

