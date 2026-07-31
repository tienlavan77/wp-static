# Preview Workflow

WPSC public builds exclude draft and private content by default. Preview builds are
explicit and require a token.

## Content Status

Content with no `status` remains public for backward compatibility. These statuses are
public:

- `publish`
- `published`
- `public`

Statuses such as `draft` and `private` are excluded from normal builds.

## Config

```js
export default {
  preview: {
    tokenEnv: "WPSC_PREVIEW_TOKEN"
  }
};
```

## Public Build

```bash
node framework/src/cli/index.js build --project fixtures/basic-shop
```

This excludes draft/private content.

## Preview Build

```bash
WPSC_PREVIEW_TOKEN=secret \
node framework/src/cli/index.js build --project fixtures/basic-shop --preview --preview-token secret
```

Preview output should be deployed only to a protected preview location. Do not publish
preview output to the public production document root.
