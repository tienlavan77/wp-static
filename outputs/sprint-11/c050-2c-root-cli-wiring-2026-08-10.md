# C050-2C Root CLI Wiring

```text
C050-2C = PASS
Root CLI wiring: PASS
Installation selector: PASS for verify-installation; existing C049 routing unchanged
Read-only facade: PASS
Product verify: PASS
Installation verify: PASS
Publication CLI: PASS (local destination only)
--confirm boundary: PASS
--dry-run boundary: PASS
C041 delegation: PASS
Publisher delegation: PASS
Security: PASS
CWD independence: PASS in facade/publisher tests
VPS mutation: NONE
C049 semantics: UNCHANGED
C048 semantics: UNCHANGED
```

The CLI contract intentionally uses both:

```text
--package-dir <signed-package-directory>
--artifact <transport-bundle.json>
```

The package directory is verified by C041. The transport bundle is then checked
for product/version identity and passed to the C050 publication owner. The CLI
does not materialize or verify the bundle independently.

Commands added:

```text
wpsc product release verify --package-dir <dir> --public-key <path> [--json]
wpsc product release publish --package-dir <dir> --artifact <bundle> --config <path> --channel <name> --confirm [--dry-run] [--json]
wpsc product verify-installation --installation <id> [--json]
```

Publication without `--confirm` fails with `CONFIRMATION_REQUIRED`. Dry-run
passes `dryRun: true` to the publisher and performs no destination mutation.
No production path, Installation ID, VPS address or private key is hard-coded.

Focused C050-2A/C050-2B/C050-2C and C049 selection:

```text
tests 22
pass 22
fail 0
cancelled 0
skipped 0
```

`git diff --check`: PASS.
