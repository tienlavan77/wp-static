# Content Model Contract

Content Pipeline turns normalized source records into an immutable Content Model
for Theme Renderer. Each item has `id`, `type`, `slug`, `title`, and `data`.
The pipeline applies normalization, configured transformations, then filters.

The model contains no source adapter, webhook, session, theme, or output
dependency. It is a pure handoff contract and does not write files.
