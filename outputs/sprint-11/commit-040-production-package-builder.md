# C040 - Production Package Builder

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C040 extends the existing Product Package boundary with a production-only builder. It reuses the frozen Product Manifest and does not create a second Product identity, Core Update lifecycle or package activation path.

## Machine-readable Dependency Evidence

Schema: `wpsc.production-dependencies` version 1.

Each feature records deterministic arrays for:

```json
{
  "entrypoints": [],
  "modules": [],
  "runtimeDependencies": [],
  "dynamicDependencies": [],
  "assets": [],
  "templates": [],
  "plugins": []
}
```

The graph traverses both declared static and dynamic dependencies. Missing module evidence is a hard failure. Therefore a module cannot be excluded merely because a static import scanner did not see it.

## Deterministic File Authority

The dependency evidence is the authority for the production file list. Every included path must name an individual regular file or an internal safe symlink; recursive directory copying is rejected.

The deterministic tree records:

- relative path;
- file type;
- file size;
- SHA-256 for regular files;
- symlink target for permitted internal symlinks.

Entries and feature names are sorted deterministically. Identical source/evidence/Product inputs produce identical trees, signing input and integrity checksum.

## Signing Input

The Ed25519 signing input is the deterministic serialization of:

```text
Product Manifest
        +
Deterministic Production Tree
```

Creation time and target path do not enter the signing input. Executable evidence signs with an Ed25519 private key and verifies with the corresponding public key.

## Production Exclusions

The builder rejects evidence requesting:

- `sites/`;
- `storage/`;
- `public/` mutable output;
- `.git/`;
- `test/` or `tests/`;
- `tmp/`;
- `output/` or `outputs/`;
- `.env`.

Fixture credentials and mutable Site state are present in the development source but absent from the produced package and manifest.

## Package Lifecycle

```text
resolve evidence
-> copy exact allow-listed files to staging
-> write machine-readable dependency evidence
-> generate deterministic tree
-> create Ed25519 signing input/signature
-> write production manifest
-> atomically rename staging to immutable target
```

An existing target is rejected as immutable. Failed builds clean staging and cannot overwrite an existing package.

## Feature Smoke Evidence

The WooCommerce fixture package includes:

- static Runtime dependency;
- dynamic import;
- storefront asset;
- Product template;
- commerce plugin.

The packaged entrypoint is imported directly from the isolated output directory and boots successfully without access to the development repository.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| Deterministic package | Two independent builds produce identical tree/checksum |
| Development material excluded | Forbidden path fixtures rejected |
| Runtime dependencies retained | Static dependency traversed and packaged |
| Dynamic dependencies retained | Dynamic module recorded and boots |
| Selected features included | WooCommerce feature evidence contains modules/assets/templates/plugins |
| Manifest validates file list | Manifest tree is derived from staged output |
| Credentials/Site state absent | Secret-bearing `.env`, `sites/`, `storage/` excluded |
| Independent boot | Output entrypoint boots outside source repository |
| Ed25519 signing input | Signature verifies against deterministic input |
| Immutable artifact | Existing package target rejected |

## Boundary

- C040 builds only production package content and signing input.
- C041 owns verification, public-key trust, compatibility checks and safe extraction.
- C038 remains the Installation transaction authority.
- C032-C037 remain the frozen Core Update/recovery authority.

## Validation

Focused C040:

```text
tests 6
pass 6
fail 0
cancelled 0
```

Product Package, Installer and frozen Core regression:

```text
tests 80
pass 80
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C040 implementation and acceptance evidence are complete. It is ready for audit and explicit close; no C041 verification/extraction responsibility has been pulled into this commit.
