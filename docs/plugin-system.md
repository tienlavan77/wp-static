# Plugin System

WPSC plugins are local ESM modules loaded from `wpsc.config.js`.

Status: v1 stable.

## Config

```js
export default {
  plugins: [
    "./plugins/example-plugin.js",
    {
      path: "./plugins/example-plugin.js",
      options: {
        markerPath: "./dist/plugin-marker.txt"
      }
    }
  ]
};
```

## Plugin Shape

A plugin can export either a plain object or a factory function.

```js
export default function myPlugin(options = {}) {
  return {
    name: "my-plugin",

    data(data, context) {
      return data;
    },

    routes(routes, context) {
      return routes;
    },

    render(page, context) {
      return page;
    },

    buildStart(payload, context) {},

    buildEnd(payload, context) {}
  };
}
```

## Hooks

- `data({ contents, collections }, context)`: transform adapter data before graph and routes.
- `routes(routes, context)`: transform generated routes.
- `render({ route, html }, context)`: transform rendered HTML per page.
- `buildStart(payload, context)`: observe build start.
- `buildEnd(payload, context)`: observe build completion.

Hook return values are optional. If a hook returns `undefined`, WPSC keeps the previous value.

These hook names are frozen for v1 and are also exported from the root package as
`V1_PLUGIN_HOOKS`.
