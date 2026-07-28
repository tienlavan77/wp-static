# Dashboard Runtime Contract

Dashboard Controller is a read-only Runtime presentation boundary. It reads Site
Metadata, canonical Runtime State, Source metadata/status, and injected Build
status to create a dashboard snapshot and HTML view.

Dashboard does not register sources/webhooks, enqueue jobs, or invoke Build
Engine. Those actions are separate Runtime integrations.
