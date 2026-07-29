# Runtime Builder V1 Capability Inventory

## Rule

Runtime reuses Builder V1 modules. It does not create replacement asset,
fragment, data, search, SEO, manifest, or plugin implementations. Runtime only
adapts its finalized Content Model and rendered pages to the existing Site Plan
contract.

## Directly Reused

| Capability | V1 module | Runtime status |
| --- | --- | --- |
| Remote media download and per-site cache | `assets/processAssetPipeline.js` | Integrated by `builder/buildSite.js` in Runtime staging |
| Remote media URL rewrite | `assets/rewriteAssetUrls.js` | Integrated by `builder/buildSite.js` |
| Asset manifest contract | `assets/processAssetPipeline.js` | Emitted as `.wpsc/assets.json` |
| Route data payload and manifest | `data/writeRouteDataOutputs.js` | Integrated by `builder/buildSite.js` |
| SPA fragments and fragment manifest | `fragments/writeFragmentOutputs.js` | Integrated by `builder/buildSite.js` |
| Search index | `search/writeSearchIndex.js` | Integrated by `builder/buildSite.js` |
| Normalized content store | `data/writeNormalizedContentStore.js` | Integrated by `builder/buildSite.js` |
| Sitemap and robots | `seo/generateSitemap.js`, `seo/generateRobotsTxt.js` | Integrated by `builder/buildSite.js` |
| Template manifest | `templates/writeTemplateManifest.js` | Integrated by Runtime Builder V1 config |
| Build manifest | `builder/createBuildManifest.js` | Integrated by `builder/buildSite.js` |
| Runtime navigation assets | `builder/buildSite.js` | Integrated by `builder/buildSite.js` |
| Admin output | `admin/writeAdminApp.js` | Deferred: Runtime Dashboard owns the authenticated UI boundary |
| Plugin build events | `plugins/runPluginHook.js` | Integrated when Runtime Builder V1 config declares plugins |

## Runtime-Owned, Not Replaced

| Capability | Reason |
| --- | --- |
| Source credentials and source reads | Runtime provides authenticated source input before Builder begins. |
| Scheduler, queue, dispatcher, build lifecycle | These are Runtime domain services, not Builder V1 output services. |
| Final write to `sites/<site>/public/dist` | Output Pipeline remains the only Site filesystem writer. Builder V1 outputs are staged first. |
| Setup and webhook workflows | These are complete before Build starts. |

## Explicit Gaps

WebP conversion is not implemented in Builder V1 yet. Its asset manifest records
WebP as `planned`; an encoder must be added to the existing V1 asset pipeline,
not as a Runtime-specific image system.
