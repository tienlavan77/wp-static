# C041 - Production Package Verification and Extraction

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C041 consumes the C040 production artifact. It owns manifest validation, Ed25519 public-key verification, compatibility checks, exact pre/post tree verification and atomic extraction. It does not bootstrap Product configuration or activate `core/active`; C042 owns those actions.

## Verification Order

```text
read production-package.json
-> validate schema and every manifest entry
-> calculate source package tree
-> compare source tree with signed manifest tree
-> rebuild deterministic signing input
-> verify signing-input SHA-256
-> verify Ed25519 signature with trusted public key
-> verify Product/Architecture/Runtime/Node compatibility
-> ACCEPTED
```

No extraction occurs before every verification gate passes.

## Manifest and Path Policy

The verifier rejects:

- malformed schema or schema version;
- missing Product manifest or file list;
- empty paths;
- absolute paths;
- backslash paths;
- `..` traversal;
- unknown entry types;
- malformed size or SHA-256 fields;
- absolute or package-root-escaping symlinks;
- files present in the source tree but absent from the manifest;
- manifest entries absent from the source tree.

Allowed types are regular file, directory and internal symlink only. Hardlinks, devices and special files cannot enter the accepted tree.

## Integrity and Trust

- The pre-extraction source tree must exactly match the C040 deterministic tree.
- The signing checksum must match the exact Product Manifest plus deterministic tree bytes.
- Unsigned packages are rejected.
- Packages signed by another Ed25519 key are rejected.
- File content tampering changes the source tree and is rejected before extraction.
- The private signing key is never accepted or persisted by C041.

## Compatibility

C041 reuses Product Manifest compatibility validation and rejects mismatches in:

- Product identity;
- Architecture version;
- Runtime version;
- minimum Node version;
- declared schema compatibility.

Compatibility failure happens before staging or public installation mutation.

## Atomic Extraction

```text
ACCEPTED package
-> clean target.extracting
-> create target.extracting
-> copy only manifest-listed entries
-> write verified production manifest
-> calculate extracted deterministic tree
-> compare extracted tree with signed tree
-> require final target absent
-> atomic rename target.extracting -> target
```

Failure behavior:

- interrupted copies remove the staging directory;
- post-copy content mismatch removes staging;
- no final target is published;
- an existing final target is never overwritten;
- no partial extraction can be considered usable.

## Executable Evidence

| Gate | Evidence |
| --- | --- |
| Valid signed package | Accepted with correct Ed25519 public key |
| Exact extraction | Extracted Runtime file equals source artifact |
| Malformed manifest | Rejected before extraction |
| Unauthorized/traversal path | Rejected by manifest path policy |
| Source checksum/tree mismatch | Tampered file rejected |
| Unsigned package | Rejected |
| Wrong public key | Rejected |
| Compatibility mismatch | Product compatibility diagnostic returned |
| Interrupted extraction | Simulated copy failure cleans staging/final target |
| Post-extraction mismatch | Copy-time tamper rejected before atomic publish |

## Ownership Boundary

- C040 remains the sole production package builder/signing-input owner.
- C041 verifies and extracts only.
- C042 will bootstrap the verified Product/Core release.
- C038 remains Installation transaction/recovery authority.
- Frozen Core Update C028-C037 is unchanged.

## Validation

Focused C041:

```text
tests 5
pass 5
fail 0
cancelled 0
```

C038-C041, Product Package and frozen Core regression:

```text
tests 85
pass 85
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C041 implementation and acceptance evidence are complete. The verified output is safe to hand to C042, but C041 performs no Product bootstrap or Core activation. It is ready for audit and explicit close.
