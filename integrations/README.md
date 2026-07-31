# External Integrations

`integrations/` contains executable bridges to external systems. A bridge is
not a Theme and must not contain static rendering, Builder orchestration or
Site output writing.

Current WordPress bridges:

- `wpsc-webhook-bridge`: receives WordPress changes and calls Runtime webhook
  endpoints using the configured secret.
- `wpsc-auth-bridge`: authenticates customer account requests for Runtime.
- `wpsc-zoho-mail-bridge`: integrates WordPress mail with Zoho delivery.

Bridges expose an external boundary only; Runtime, Setup and Scheduler retain
their respective business ownership.
