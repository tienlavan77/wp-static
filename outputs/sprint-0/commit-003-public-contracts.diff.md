# Sprint 0 / Commit 003 - Public Contracts

## Muc Tieu

Dinh nghia ro cac public contract cua WPSC v1.x de framework co the mo rong ma khong can sua Core.

Commit nay dong khung 5 contract:

```text
Adapter Contract
Compiler Contract
Runtime Contract
Theme Contract
Plugin Contract
```

## File Thay Doi

```text
docs/public-contracts.md
outputs/sprint-0/commit-003-public-contracts.diff.md
outputs/sprint-0/reviews/commit-003-review.md
```

## Tom Tat Diff

Them `docs/public-contracts.md` gom:

- Contract rule.
- Adapter required/optional API.
- Compiler input/output va `sitePlan` contract.
- Runtime endpoints, session rule, credential boundary.
- Theme config/layout context contract.
- Plugin hook/context/return rules.
- Compatibility policy cho bridge import cu.
- Contract checklist.

## Quyet Dinh Da Chot

```text
Public contracts la surface tich hop chinh cua v1.x.
Adapter chi tra normalized data.
Compiler chi tao sitePlan.
Runtime chi xu ly dynamic customer workflows.
Theme chi render tu public context.
Plugin chi mo rong qua declared hooks.
```

## Kiem Tra

Commit documentation-only.

Da doi chieu voi:

```text
docs/public-api-draft.md
docs/v1-adapter-api.md
docs/v1-theme-api.md
docs/v1-plugin-api.md
docs/runtime-commerce-api.md
docs/theme-system.md
src/index.js
```

## Ghi Chu Con Lai

Commit 004 nen tiep tuc voi ADR:

```text
docs/adr/001-normalized-content.md
docs/adr/002-runtime-boundary.md
docs/adr/003-theme-contract.md
docs/adr/004-incremental-build.md
docs/adr/005-plugin-system.md
```
