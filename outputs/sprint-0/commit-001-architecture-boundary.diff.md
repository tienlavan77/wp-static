# Sprint 0 / Commit 001 - Architecture Boundary

## Muc Tieu

Dong bang ban do ranh gioi kien truc cho WPSC v1.x truoc khi tiep tuc product development va deploy domain that.

Commit nay khong tap trung viet code tinh nang. No xac dinh subsystem nao so huu viec gi, subsystem nao khong duoc phu thuoc cheo, va cac quy tac nao se tro thanh nen tang v1.

## File Thay Doi

```text
docs/architecture-boundary.md
outputs/sprint-0/commit-001-architecture-boundary.diff.md
```

## Tom Tat Diff

Them tai lieu `docs/architecture-boundary.md` gom:

- Boundary rule tong quat.
- Ranh gioi cho Adapter Layer.
- Ranh gioi cho Compiler.
- Ranh gioi cho Build Engine.
- Ranh gioi cho Runtime Kernel.
- Ranh gioi cho Theme System.
- Ranh gioi cho Plugin System.
- Dependency direction duoc phep va khong duoc phep.
- Public API vs Internal API.
- V1 freeze decisions.
- Architecture review checklist.

## Quyet Dinh Da Chot

```text
1. Public route giu tinh than domain/slug va output /slug.
2. Static output la delivery model chinh.
3. WordPress/WooCommerce la data source, khong phai renderer.
4. Runtime chi phuc vu dynamic workflows.
5. Theme render tu normalized data/graph, khong goi source API.
6. Variation nam trong product cha.
7. Build output gom HTML + route JSON + fragments.
8. Incremental build cap nhat route thay doi va artifact lien quan.
9. Browser code khong chua private source credentials.
10. Plugin mo rong qua hook/context cong khai.
```

## Kiem Tra

Commit nay la documentation-only. Khong can build runtime.

Da doc lai hien trang folder/subsystem truoc khi viet:

```text
src/adapters/
src/core/
src/builder/
src/runtime/
src/theme/
src/templates/
src/blocks/
src/plugins/
src/webhook/
src/planner/
src/graph/
src/queue/
src/invalidate/
src/progress/
src/watcher/
```

## Ghi Chu Con Lai

Commit 002 se tiep tuc voi Public Contracts:

```text
Adapter Contract
Compiler Contract
Runtime Contract
Theme Contract
Plugin Contract
```
