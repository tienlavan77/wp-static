# Build Engine Contract

Build Engine begins only after Setup has reached `READY_FOR_FIRST_BUILD`. It
owns build workflow, build state, build events, and diagnostics. Setup does not
participate in a build.

The immutable `BuildContext` contains normalized `client` and `siteId`. Build
diagnostics use the shared `code`, `message`, `severity` contract. The initial
event namespace is `build.started`, `build.progress`, `build.completed`, and
`build.failed`.

Build workflow uses `IDLE`, `BUILDING`, `SUCCESS`, and `FAILED`. A stable Build
Result provides `status`, `diagnostics`, `duration`, and `generatedFiles` for
all clients. `generatedFiles` is output metadata, not workflow input.

Build Engine is an orchestrator. It receives its Content Reader, Content
Pipeline, Theme Renderer, and Output Pipeline through dependency injection; it
does not implement their logic or write filesystem output directly.
