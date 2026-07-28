# Source Metadata Contract

`config/source.json` is persisted Setup output. It is the durable handoff from
Source Registration to Webhook Activation, First Build Readiness, and later the
Build Engine.

## Required fields

- `schema`: `source-metadata`
- `schemaVersion`: `1`
- `sourceType`: normalized adapter source type
- `adapterVersion`: adapter contract version supplied by the adapter
- `endpoint`: Setup-normalized source endpoint
- `capabilities`: adapter-declared capability list
- `registeredAt`: registration timestamp

Webhook fields are optional. When present, `webhookStatus` must be `verified`
before the site is ready for first build. Readiness reads this persisted record
only; it does not depend on runtime memory or client input.

Adapters generate their safe metadata, while Setup Service owns persistence.
Adapters never receive a Site Repository or write this file directly.
