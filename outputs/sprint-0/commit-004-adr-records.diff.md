# Sprint 0 / Commit 004 - Architecture Decision Records

## Muc Tieu

Ghi lai cac quyet dinh kien truc nen tang cua WPSC v1.x duoi dang ADR de sau Sprint 0 khong bi doi huong tuy tien.

## File Thay Doi

```text
docs/adr/001-normalized-content.md
docs/adr/002-runtime-boundary.md
docs/adr/003-theme-contract.md
docs/adr/004-incremental-build.md
docs/adr/005-plugin-system.md
outputs/sprint-0/commit-004-adr-records.diff.md
outputs/sprint-0/reviews/commit-004-review.md
```

## Tom Tat Diff

Them 5 ADR:

- `001-normalized-content.md`: adapter normalize source data truoc khi compiler/theme dung.
- `002-runtime-boundary.md`: public site tinh, runtime chi xu ly dynamic customer workflows.
- `003-theme-contract.md`: theme render tu layout context cong khai.
- `004-incremental-build.md`: incremental build dua tren graph/planner/queue/invalidate/progress/webhook.
- `005-plugin-system.md`: plugin mo rong qua declared hooks/context, khong import private Core.

## Quyet Dinh Da Chot

```text
Normalized content la data contract trung tam.
Runtime khong thay the static renderer.
Theme khong goi source API truc tiep.
Incremental build phai tinh route lien quan va artifact chia se.
Plugin chi dung hook/context cong khai.
```

## Kiem Tra

Commit documentation-only.

Da doi chieu voi:

```text
docs/architecture-boundary.md
docs/public-contracts.md
docs/content-graph.md
docs/runtime-commerce-api.md
docs/theme-system.md
docs/incremental-build.md
docs/webhook-rebuild-workflow.md
docs/plugin-system.md
```

## Ghi Chu Con Lai

Commit 005 nen tiep tuc voi Architecture Review:

```text
Coupling
Dependency
Naming
Public API
Internal API
V1 freeze checklist
```

