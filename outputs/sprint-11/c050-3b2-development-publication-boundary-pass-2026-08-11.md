# C050-3B.2 Development Publication Boundary

## Verdict

```text
C050-3B.2 = PASS
development configuration = READY
publication = NOT RUN
rollout = NOT RUN
next task = C050-3B
```

## Approved Boundary

```text
Boundary type: DEVELOPMENT ONLY
Channel: development
Distribution URL: https://wpsc.local/
Allowed host: wpsc.local
Publication root: /home/data/sites/production/wpsc-releases
Configuration: /home/data/sites/production/wpsc-release-operations/development.json
Public verification key: /home/data/sites/production/wpsctest/config/product-package-public.pem
Installation: /home/data/sites/production/wpsctest
```

The distribution root remains separate from the Installation workspace. This
boundary is not represented as an Internet-facing or final production
distribution service.

## Configuration Validation

The reviewed configuration validates through the existing C050 owner:

```text
schema: wpsc.release-operations
schemaVersion: 1
channel: development
artifactBaseUrl: https://wpsc.local/
allowedHosts: [wpsc.local]
publisher type: filesystem
publisher root: /home/data/sites/production/wpsc-releases
publicKeyPath: /home/data/sites/production/wpsctest/config/product-package-public.pem
credential-bearing URL: NONE
private-key material: NONE
CWD-dependent path: NONE
```

Public verification key evidence supplied by the operator:

```text
mode/owner: 640 root:www-data
SHA-256 fingerprint: 73beea75ba658994c34d8bcd3c899dd9e25e4712d7816cf5f1e18efc09d8b88c
```

Publication root evidence:

```text
drwxr-s--- 2750 www-data:www-data /home/data/sites/production/wpsc-releases
```

## HTTPS Boundaries

Development distribution verification:

```text
https://wpsc.local/ = HTTP 200
X-WPSC-Boundary: development-distribution
body: {"ok":true,"boundary":"development-distribution","product":"wpsc"}
served certificate: CN=wpsc.local
SAN: DNS:wpsc.local
```

Installation HTTPS companion verification:

```text
https://wpsctest.local/ = HTTP 404
x-wpsc-product: wpsc
x-wpsc-release: 1.1.0
served certificate: CN=wpsctest.local
SAN: DNS:wpsctest.local, IP:192.168.1.181
```

The 404 response is valid identity evidence from the existing Runtime and does
not indicate a failed Installation service.

## Shared Service Safety

```text
nginx pre-mutation validation: PASS
nginx post-change validation: PASS
nginx final validation: PASS
nginx state: active
Installation systemd unit: active/running
Installation Runtime identity before rollout: wpsc 1.1.0
Runtime restart: NONE
systemd restart: NONE
```

The authorized infrastructure work created and enabled only the reviewed
`wpsctest.local` HTTPS companion, then reloaded Nginx. It did not restart the
Installation Runtime or mutate its active Release.

## C050 Focused Validation

```text
test/c050ReadOnlyReleaseOperations.test.js: PASS
test/c050RootCliWiring.test.js: PASS
tests: 10
pass: 10
fail: 0
```

Exact development configuration validation:

```text
schema/channel/URL/host/publication root/public key: PASS
credential-free HTTPS contract: PASS
absolute path contract: PASS
```

```text
git diff --check: PASS
```

No unrelated repository-wide test suite was run.

## Mutation Boundary

Completed authorized infrastructure changes:

```text
development hostname/TLS boundary: ESTABLISHED
wpsc.local Nginx distribution virtual host: ESTABLISHED
wpsctest.local HTTPS companion: ESTABLISHED
publication root: ESTABLISHED
development release-operations configuration: ESTABLISHED
Nginx reload: PERFORMED
```

Not performed:

```text
C050 publication
C050 rollout
C049 update/recover
C048
Runtime restart
systemd restart
Installation mutation
active Release mutation
frozen Release 1.2.0 mutation
private Product signing-key access
```

## Semantics

```text
C050 publication owner semantics = UNCHANGED
C050 rollout facade semantics = UNCHANGED
C049 semantics = UNCHANGED
C048 semantics = UNCHANGED
active production Installation Release = 1.1.0
```

## Operational Note

The current `wpsctest.local` certificate expires on 2026-09-05. Renewal is a
separate infrastructure operation and is not a blocker for this completed
development publication-boundary gate.

## Next Boundary

C050-3B requires separate authorization. Its permitted sequence is limited to:

```text
C041 re-verify frozen Release 1.2.0
-> C050 product release publish --confirm using channel development
-> retrieve the published bundle through https://wpsc.local/
-> verify immutable size/SHA-256/Product/version
-> report and stop
```

C050-3B must not continue into rollout. C050-3C remains not authorized and not
started.
