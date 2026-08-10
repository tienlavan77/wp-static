# C050 Public CLI Contract

| Command | Mutation | Owner delegation | Confirmation |
| --- | --- | --- | --- |
| `product release verify` | none | C041 | none |
| `product release publish --dry-run` | none | C041 + C050 publisher dry-run | none |
| `product release publish --confirm` | publication | C041 + C050 publisher | required |
| `product verify-installation` | none | Registry + existing health/evidence readers | none |
| `product rollout --dry-run` | none | Registry + C049 check | none |
| `product rollout --confirm` | Installation | Registry + C049 check/update/status | required |

All commands produce JSON-compatible structured results. Failures return a
non-zero exit code and a stable `code` plus redacted diagnostics. Explicit
Installation operations require `--installation <id>` and are CWD-independent.
