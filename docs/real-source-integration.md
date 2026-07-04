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
