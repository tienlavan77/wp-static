# C045 - Nginx Installer

Status: PASS CANDIDATE - awaiting audit and explicit close

## Scope

C045 renders and activates one WPSC-managed Nginx server configuration. It owns its Installation/domain-specific file, backup, validation, atomic activation, reload and rollback.

C045 does not manage arbitrary Nginx configuration, TLS certificates, PHP-FPM, DNS or operator-owned server blocks.

## Managed Identity

Configuration identity is deterministic:

```text
wpsc-<installationId>-<domain>.conf
```

Each file begins with:

```text
# WPSC-MANAGED installation=<id> domain=<domain>
```

Production/staging and different domains therefore coexist without overwriting one another.

## Domain Routing

The generated server block:

- listens on IPv4 and IPv6 port 80;
- owns the exact domain and `www` alias;
- serves static output from the configured public root;
- falls back to the selected local Runtime origin;
- forwards Host, client IP and protocol headers;
- denies direct access to `config`, `storage`, `core`, `runtime` and dotfiles.

Runtime origin is restricted to local HTTP on `127.0.0.1` or `localhost`.

## Validation Before Activation

```text
render desired config
-> write candidate file
-> build minimal validation wrapper
-> nginx -t -c <wrapper>
-> only on PASS: atomic candidate rename
-> atomic enabled-link replacement
-> nginx reload
```

The default adapter validates the actual candidate server block rather than only the currently active global configuration.

Validation failure occurs before either the active managed file or enabled link changes.

## Operator Ownership Boundary

C045 refuses to replace:

- an existing config without the `WPSC-MANAGED` marker;
- an existing enabled entry that is not a symlink;
- an enabled symlink pointing somewhere other than this exact managed config.

Operator-owned files are returned unchanged and Nginx validation/reload is not invoked.

## Backup and Atomic Activation

Existing WPSC-managed content is backed up to:

```text
<workspace>/storage/installer/backups/nginx/
  wpsc-<installation>-<domain>.conf.<timestamp>.bak
```

Backup mode is `0600`.

Activation uses:

- atomic config rename;
- temporary relative enabled symlink;
- atomic symlink rename;
- temporary link cleanup in `finally`.

## Rollback

If enabled-link activation or Nginx reload fails:

- the prior managed config is restored byte-identically;
- the prior enabled link is restored;
- a first-install candidate is removed;
- Nginx reload is attempted against the restored configuration;
- no failed candidate remains authoritative.

Executable evidence simulates reload failure after both config and enabled link were activated, then proves the previous config/link are restored.

## Acceptance Matrix

| Gate | Evidence |
| --- | --- |
| Generated config validates | Candidate contents inspected by injected `nginx -t` boundary |
| Existing config backed up | Backup equals previous managed bytes |
| Domain routing | Domain, static root and local Runtime fallback rendered |
| Invalid candidate safety | Active config/link remain unchanged |
| Reload rollback | Previous config/link restored after activation failure |
| Operator ownership | Non-WPSC config rejected without validation/reload |
| Installation identity | Filename includes Installation and domain |
| Multi-installation isolation | Production/staging configs coexist independently |

## Ownership

- C038 defines the Nginx ownership contract and Installer recovery scope.
- C044 owns systemd/Runtime only.
- C045 owns only WPSC-managed Nginx files and links.
- Operators retain ownership of all unmarked Nginx configuration.
- C046 will compose reinstall/repair/dry-run behavior without broadening this ownership.

## Validation

Focused C045:

```text
tests 5
pass 5
fail 0
cancelled 0
```

C038-C045, Product Package and frozen Core regression:

```text
tests 108
pass 108
fail 0
cancelled 0
```

`git diff --check`: PASS

## Verdict

C045 implementation and acceptance evidence are complete. Validation precedes activation, operator configuration remains protected, and managed configuration is restored after activation failure. It is ready for audit and explicit close.
