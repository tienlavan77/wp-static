# V1 Plugin API

Status: stable in WPSC v1.0.

Plugins are local ESM modules loaded from `wpsc.config.js`. A plugin can export a plain
object or a factory function that returns a plain object.

## Stable Hook Names

The v1 plugin API freezes these hook names:

- `data({ contents, collections }, context)`
- `routes(routes, context)`
- `render({ route, html }, context)`
- `buildStart(payload, context)`
- `buildEnd(payload, context)`

The same list is exported as `V1_PLUGIN_HOOKS` from the root package.

## Return Values

Transform hooks can return a replacement value. If a hook returns `undefined`, WPSC keeps
the previous value.

Observer hooks can return nothing.

## Plugin Context

Every hook receives a context object with:

- `config`: normalized project config.
- `projectDir`: absolute project directory.
