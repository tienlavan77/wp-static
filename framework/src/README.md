# Framework Source Ownership

`framework/src/` is the implementation boundary for WPSC Framework code. It
does not contain Site configuration, credentials, generated output, or other
runtime state.

## Primary Domains

```text
site/ -> provision/ -> setup/ -> runtime/
                         -> scheduler/ -> build/ -> builder/ -> output/
shared/
```

| Domain | Responsibility |
| --- | --- |
| `site/` | Site identity, metadata, repository, path policy and lifecycle state. |
| `provision/` | Site skeleton planning, transaction, rollback, UUID and secrets. |
| `setup/` | Shared setup sessions, source registration, webhook activation and readiness. |
| `runtime/` | Per-Site Runtime composition and HTTP-facing dynamic behavior. |
| `scheduler/` | Trigger policy, jobs, queue contract and dispatch coordination. |
| `build/` | Build lifecycle and orchestration. |
| `builder/` | Builder V1 static-site compilation semantics. |
| `output/` | The only filesystem publisher for Site build output. |
| `shared/` | Cross-domain pure utilities and stable internal primitives. |

## Supporting Domains

Supporting directories remain at this level until their owning domain is
normalized in a dedicated commit. They must not gain business responsibility
outside their documented boundary.

- Runtime support: `admin/`, `api/`, `auth/`, `browser/`, `commerce/`,
  `installer/`, `source/`, `webhook/`.
- Build and Builder support: `assets/`, `blocks/`, `cache/`, `content/`,
  `data/`, `fragments/`, `graph/`, `incremental/`, `planner/`, `renderer/`,
  `search/`, `seo/`, `templates/`, `theme/`, `visual-builder/`.
- Framework support: `adapters/`, `cli/`, `core/`, `deploy/`, `dev-server/`,
  `plugins/`, `release/`, `validation/` and related infrastructure helpers.

The next normalization commits move these supporting domains only when their
owner is being normalized. No client may infer a new public API from an
internal directory move.
