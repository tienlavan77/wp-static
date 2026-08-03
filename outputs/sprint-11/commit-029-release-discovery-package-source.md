# Core Update C029 - Release Discovery and Package Source

## Delivered

- Added Local and HTTP Package Source abstractions.
- Added read-only Core Update release discovery which returns the newest available WPSC release.
- Added `wpsc update check` through the Product CLI using local release metadata by default.

## Boundary

C029 reads release metadata only. It does not download package bytes, invoke `CoreUpdateService`, mutate state, write configuration, or change the active Core.

## Validation

`node --test test/coreUpdateReleaseService.test.js test/coreUpdateService.test.js`

The SemVer selection test explicitly proves `1.10.0 > 1.9.99` and `2.0.0 > 1.99.99`.
