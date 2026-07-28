# Theme Renderer Contract

Theme Renderer accepts a Content Model and layout functions, then returns HTML
pages in memory. Layouts receive only `{ content, html }`; they have no Source,
Build Context, webhook, session, or output writer access.

The renderer chooses a type-specific layout when available, otherwise its
default layout. It does not write files, copy assets, or create media output.
