# Real Source Integration

Phase 14 connects WPSC to real WordPress and WooCommerce sources without hardcoding secrets.

## WordPress Auth

Application Password:

```js
export default {
  adapter: {
    type: "wordpress",
    baseUrl: "https://wp.example.com",
    auth: {
      type: "applicationPassword",
      usernameEnv: "WPSC_WP_USERNAME",
      passwordEnv: "WPSC_WP_APP_PASSWORD"
    }
  }
};
```

Bearer token:

```js
export default {
  adapter: {
    type: "wordpress",
    baseUrl: "https://wp.example.com",
    auth: {
      type: "bearer",
      tokenEnv: "WPSC_WP_BEARER_TOKEN"
    }
  }
};
```

## WooCommerce Auth

```js
export default {
  adapter: {
    type: "woocommerce",
    baseUrl: "https://wp.example.com",
    consumerKeyEnv: "WPSC_WOO_CONSUMER_KEY",
    consumerSecretEnv: "WPSC_WOO_CONSUMER_SECRET"
  }
};
```

## Project .env File

WPSC loads `.env` from the project directory before reading `wpsc.config.js`. Values that
already exist in the shell are kept, so deployment environments can override local files.

For the Basic Shop example:

```sh
cp fixtures/basic-shop/.env.example fixtures/basic-shop/.env
```

Then fill:

```env
WPSC_WOO_CONSUMER_KEY=ck_replace_me
WPSC_WOO_CONSUMER_SECRET=cs_replace_me
WPSC_WP_USERNAME=
WPSC_WP_APP_PASSWORD=
```

Keep `fixtures/basic-shop/.env` private. It is ignored by git.

## WordPress And WooCommerce Together

Use this for a real store that needs WordPress pages, posts, menus, media, SEO, and
WooCommerce products in the same build:

```js
export default {
  adapter: {
    type: "wordpressWooCommerce",
    wordpress: {
      baseUrl: "https://api.tinsinhphat.com",
      contentTypes: ["pages", "posts"],
      customPostTypes: [],
      taxonomies: ["categories", "tags"],
      includeMedia: true,
      includeMenus: true,
      includeAcf: true,
      seo: {
        provider: "rankmath"
      },
      auth: {
        type: "applicationPassword",
        usernameEnv: "WPSC_WP_USERNAME",
        passwordEnv: "WPSC_WP_APP_PASSWORD"
      }
    },
    woocommerce: {
      baseUrl: "https://api.tinsinhphat.com",
      consumerKeyEnv: "WPSC_WOO_CONSUMER_KEY",
      consumerSecretEnv: "WPSC_WOO_CONSUMER_SECRET",
      includeCategories: true,
      includeTags: true,
      includeVariations: true,
      seo: {
        provider: "rankmath"
      }
    }
  }
};
```

The example project includes `fixtures/basic-shop/wpsc.real.config.js` with this shape.
To build against the real source, copy that file to `fixtures/basic-shop/wpsc.config.js`
or move its `adapter` block into the active config.

## Real Project Checklist

- WordPress REST API is reachable.
- WooCommerce REST API is reachable if commerce data is used.
- Application Password or Bearer token works for private endpoints.
- Rank Math SEO fields are exposed or mapped through a custom endpoint.
- ACF fields are exposed through REST.
- Menus endpoint exists, or WPSC gracefully continues without menus.
- CPT slugs match `customPostTypes`.
- Taxonomy slugs match `taxonomies`.
- Media URLs are public and downloadable by the asset pipeline.
- Generated routes, canonical URLs, sitemap, and robots match the production domain.
