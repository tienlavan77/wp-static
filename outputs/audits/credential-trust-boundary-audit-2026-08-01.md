# WPSC Credential & Trust Boundary Audit

Date: 2026-08-01

Status: CONDITIONAL PASS

Scope: source-based audit of the Runtime and product code. This is not a claim
that a host operating system, a third-party WordPress plugin, or an external
provider is secure. It answers whether the WPSC code path intentionally stores,
copies, exposes, or exports credential-bearing data.

## Executive Result

WPSC has the correct primary ownership model:

```text
Credential -> Site-private credential store -> Provider consumer callback
```

Credentials are not part of Site metadata, output artifacts, backups, product
support bundles, or ordinary browser responses by design. However, two
unresolved redaction/persistence paths prevent an unconditional enterprise-safe
claim today. They must be remediated before making the statement that WPSC can
never export a customer credential.

## Trust Model

| Boundary | Owner | Credential form allowed |
| --- | --- | --- |
| `config/runtime.env` | Runtime Platform operator | Runtime environment values |
| `sites/<siteId>/config/source-credentials.json` | One Site | Provider credentials, mode 0600 |
| Source Adapter / Commerce gateway | In-process provider client | Resolved value during request only |
| Public browser, output, artifact, bundle, backup | Public or transferable boundary | No credential values; reference/metadata only |

`createSecretsBoundaryService` formalizes a reference as a Site-bound object and
rejects a reference that crosses Site identity. Its `withSecret()` callback is
the intended in-process resolution boundary.

## Flow Audit

| Stage | Result | Evidence | Credential can appear here? |
| --- | --- | --- | --- |
| Installation | WATCH | Legacy installation generators create `.env` placeholders and config expressions referencing `process.env`; current Runtime Browser Installer writes supplied configuration without a sensitive-field schema gate. | Not in the normal Browser payload today; a crafted request can persist sensitive keys. |
| Site Registry | SAFE | Registry/site metadata carries Site identity, domain, status, UUID, and runtime config reference. | No credential read/write path found. |
| Environment | WATCH | `config/runtime.env` is created with mode 0600; Runtime loader copies values into process environment. Environment Configuration Service understands references, but legacy runtime paths still consume direct environment values. | Yes, intentionally private; do not serialize `process.env`. |
| Secret Reference | SAFE | `createSecretsBoundaryService` validates sensitive reference names, Site identity, and redacts public projections. | Value exists only in the supplied consumer callback. |
| Provider Connector | WATCH | Source and WooCommerce clients resolve credentials in memory. Source registration returns adapter exception messages as diagnostics without a string-redaction guarantee. | Potentially, if a provider exception includes a token, Basic header, signed URL, or request URL query. |
| WordPress / WooCommerce | SAFE WITH HOST ASSUMPTION | Application Password / Woo keys are stored only in `source-credentials.json`, written mode 0600. Browser dashboard returns only boolean credential summary and masked values. | Not in normal response contract; host filesystem permissions and Nginx deny rules are required. |
| Cache | WATCH | Build caches persist content, rendered routes, and asset data; no secrets boundary assertion occurs before cache writes. | Not expected from supported adapters, but a provider/plugin that puts a secret-named field inside Content can persist it. |
| Build | WATCH | Content/route/output pipeline has clear ownership but no `assertSafePublicContract` call before renderer/output. | Same plugin/provider-content risk as cache. |
| Artifact | SAFE BY INPUT BOUNDARY | Deployment artifacts copy only `sites/<siteId>/public/dist`; they do not copy Site `config`, `storage`, or `runtime.env`. | Only if a credential already leaked into generated output. |
| Backup | SAFE | Backup service deliberately does not read credential store and recursively redacts sensitive keyed values before persistence. | No direct credential source is included. |
| Logs | FAIL | Observability redacts values by object key, but preserves `message` strings. Provider errors can become diagnostics/messages without text redaction. | Yes, a credential embedded in a message string can be written to NDJSON. |
| Support Bundle | FAIL | Support bundle uses `security.publicProjection`, which redacts sensitive object keys but does not scrub sensitive text inside `message` string values. It also includes recent error logs. | Yes, if logs or diagnostics have already received a provider error containing a credential. |
| Deployment | SAFE BY INPUT BOUNDARY | Deployment artifact service copies only static output and records filenames/checksums. | Same downstream condition as Artifact. |

## Findings

### CTB-001 - Provider Error Text Can Cross a Public Boundary

Severity: HIGH

Evidence:

- `framework/src/setup/createSourceRegistrationService.js` converts caught
  adapter exception text into diagnostics.
- `framework/src/observability/createOperationalObservabilityService.js`
  redacts sensitive *keys*, but retains `message` string values.
- `framework/src/product/createProductSupportBundleService.js` writes projected
  diagnostics and recent error logs into a transferable support bundle.

Impact: a provider/library error that includes `Authorization`, a bearer token,
a Basic token, a URL query credential, `ck_`, `cs_`, or an application password
may be returned to a Browser client, persisted in a Site log, and exported in a
support bundle.

Required boundary repair:

1. Add one shared sensitive-text sanitizer.
2. Sanitize all diagnostics created from thrown provider errors.
3. Sanitize log `message` and string values recursively before persistence.
4. Re-sanitize support bundle projection as defense in depth.
5. Add regression fixtures for Basic, Bearer, WordPress Application Password,
   WooCommerce `ck_`/`cs_`, query-string token, and nested string values.

### CTB-002 - Runtime Installer Persists an Unconstrained Configuration Object

Severity: HIGH

Evidence:

- `framework/src/runtime/installer/createInstallerController.js` writes
  `input.configuration` directly to `sites/<siteId>/config/runtime.json`.

Impact: current Runtime Browser Installer supplies only Site name and locale,
so ordinary use does not persist secrets. But any client can POST sensitive
fields to the endpoint. The file is not a credential store and is not written
with explicit private permissions.

Required boundary repair:

1. Define a strict Runtime Installer configuration schema.
2. Reject sensitive key names recursively before any write.
3. Write only allow-listed Site identity/settings fields.
4. Add a test proving a crafted `applicationPassword` or `token` field cannot
   be persisted.

### CTB-003 - Public Content and Cache Need a Final Secret Assertion

Severity: MEDIUM

Evidence:

- Builder JSON/cache/output writers serialize supplied Content/route data.
- `createSecretsBoundaryService.assertSafePublicContract()` exists but is not
  enforced at the Content-to-public-output handoff.

Impact: supported adapters should never model credentials as content. A plugin
or custom adapter can violate that assumption and put a secret-keyed object in
cache, JSON output, or generated HTML context.

Required boundary repair:

1. Assert/redact at the immutable Content Model finalization boundary.
2. Assert again before public JSON, route cache, search, fragment, and artifact
manifest generation.
3. Fail the build with a diagnostic; never silently publish sensitive data.

## Verified SAFE Paths

### Site Credential Store

`createSourceCredentialStore` uses the Site repository root, writes only
`source-credentials.json`, and explicitly applies Unix mode 0600. Dashboard
summary returns boolean availability and username only; Browser values are
masked before rendering.

### Backup

`createSiteBackupService.collectState()` intentionally excludes credential
reads. Its redactor is a secondary safeguard. Restore metadata refers to the
Runtime configuration rather than restoring credential values.

### Deployment Artifact

`createDeploymentArtifactService` copies `public/dist` into the artifact. It
does not traverse upward into Site `config`, Site `storage`, or root
`config/runtime.env`.

### Secret References

`createSecretsBoundaryService` rejects cross-Site references and rejects
sensitive data in a declared public contract. This is a strong contract that
should be adopted at every serialization boundary identified above.

## Enterprise Claim After Remediation

After CTB-001 through CTB-003 are resolved and regression-tested, WPSC can
accurately state:

> WPSC uses customer credentials only inside the Site-private provider boundary.
> Credentials are not copied into static output, deployment artifacts, backups,
> logs, or support bundles. Operational exports contain redacted metadata and
> references, not secret values.

The statement must remain qualified by proper host file ownership, private
environment configuration, Nginx deny rules, TLS, and the security of the
customer's WordPress/WooCommerce providers.

## Verification Plan

Run a fixture containing each known credential pattern through:

```text
source connection failure
-> Runtime diagnostic response
-> operational log
-> support bundle
-> backup
-> build cache
-> generated output
-> deployment artifact
```

Then scan each output with pattern and value assertions. A match is a release
blocker, not a warning.
