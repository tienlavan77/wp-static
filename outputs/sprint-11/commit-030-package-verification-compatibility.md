# Core Update C030 - Package Verification and Compatibility

## Delivered

Package acceptance now requires a valid WPSC manifest, SHA-256 checksum, Ed25519 signature verification, product identity, Architecture/Runtime compatibility and migration compatibility.

## Security Boundary

Verification happens before any staging/extraction/activation capability exists. The release private key stays with the publisher; a VPS holds only the Ed25519 public key. No signing secret is accepted, persisted or returned by this module.

## Validation

Focused tests cover valid package, checksum mismatch, invalid signature, wrong product, incompatible architecture/runtime/migration.
