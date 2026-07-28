# Build Engine Architecture

## Official Flow

```text
READY_FOR_FIRST_BUILD
          |
          v
     Build Engine
          |
          v
   Content Reader (injected)
          |
          v
    Content Pipeline
          |
          v
    Theme Renderer
          |
          v
    Output Pipeline
          |
          v
sites/<site>/public/
```

## Ownership

| Component | Owns | Does not own |
| --- | --- | --- |
| Setup Service | Site readiness | Build state, source reads for build, output |
| Build Engine | `IDLE -> BUILDING -> SUCCESS | FAILED`, Build Result, `build.*` events | Content transformation, HTML rendering, filesystem writes |
| Content Reader | Declared source items/assets | Theme rendering, output |
| Content Pipeline | Immutable Content Model | HTML, assets, output |
| Theme Renderer | HTML documents in memory | Source access, file paths, filesystem writes |
| Output Pipeline | Route/file mapping and writes below `sites/<site>/public/` | Build state or theme decisions |

## Stable Boundaries

All collaborators are injected. Build Engine does not construct adapters,
renderers, or output writers. Diagnostics keep the framework-wide `code`,
`message`, `severity` shape. `build.*` is independent from `setup.*` and source
event namespaces.
