# Webhook Runtime Contract

Webhook Registration Controller gets Site UUID from persisted Site Metadata and
creates/manages a private webhook secret. Dashboard never supplies either value.
It creates the callback URL from Runtime configuration, delegates source-side
registration to injected Webhook Activation Service, then stores private webhook
configuration in `config/webhook.json`.

This controller does not call Scheduler, Build Engine, or Test Build.
