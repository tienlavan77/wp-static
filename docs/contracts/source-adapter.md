# Source Adapter Contract

Source adapters implement the framework contract for one external source:
`initialize`, `validate`, `healthCheck`, `registerWebhook`,
`unregisterWebhook`, `verifyWebhook`, and `getMetadata`.

An adapter performs one source-specific operation at a time. It does not own
retry policy, session state, site repository access, configuration persistence,
or the decision that a Site is ready for first build. Those responsibilities
remain in Setup Service and its services.
