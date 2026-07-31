# Sprint 7 Commit 009 - Multisite Site Context Foundation

## Delivered

- Stable Site Context contract: `wpsc.site-context` version 1.
- Explicit Site identity, domain and Workspace identity for Shared Service
  operations.
- Site Context is immutable and rejects operations addressed to another Site.
- Runtime Content Reader creates/validates Site Context before reading source
  metadata and credentials, and returns that context with the content result.
- Runtime Webhook Receiver creates its Site Context before reading webhook
  configuration or handing off publishing.
- Runtime service composition exposes the Site Context factory for future
  platform-management boundaries.
- Existing Site Repository path safety, Site Configuration persistence and
  credential storage remain the isolation owners.

## Isolation Matrix

```text
Site Context
  -> Configuration: sites/<site>/config/settings.json
  -> Credentials:    sites/<site>/config/source-credentials.json
  -> Runtime state:  sites/<site>/...
  -> Output:         sites/<site>/public/dist
  -> Search/Media/Route manifests: Site build output
```

Shared repository, scheduler and infrastructure instances may be reused, but
their Site-scoped operations always carry a validated Site id.

Additional audited boundaries:

- Domain registry resolves one host to one Site id.
- Runtime Builder cache/temp output lives below that Site root.
- Build Context and Queue Job both retain Site id.
- Commerce Gateway maintains separate Runtime/session stores per Site id.
- Shared logger has no persisted mutable Site state.

## Boundary

This is a multisite foundation, not full Site Management. No cross-Site
dashboard, migration, backup, domain provisioning or management API is added.
One Site Runtime cannot use another Site's context; cross-Site operations
remain a future platform-management concern.

## Validation

```bash
node --test test/siteContext.test.js test/siteConfigurationService.test.js test/siteRepository.test.js test/runtimeContentReader.test.js test/runtimeWebhookReceiver.test.js
node framework/src/cli/index.js --help
git diff --check
```

Validation includes two Site skeletons served by one Runtime composition through
two independent domain mappings.
