# Output Pipeline Contract

Output Pipeline is the only Phase 5 component permitted to write static files.
It receives in-memory HTML page records and asset descriptors, then writes only
inside `sites/<site>/public/dist/`. It owns route-to-file mapping and asset copies;
Theme Renderer does not know file names or directory structure.
