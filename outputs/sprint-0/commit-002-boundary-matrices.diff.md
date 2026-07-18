# Sprint 0 / Commit 002 - Boundary Matrices

## Muc Tieu

Bo sung chi tiet review cho architecture boundary bang 2 bang quan trong:

- Allowed / Forbidden Dependency Matrix.
- Owner / Input / Output / Public API / Forbidden cho tung subsystem.

Commit nay lam ro hon tai lieu Sprint 0 Commit 001, giup viec review kien truc v1.0 co the dua tren bang doi chieu cu the thay vi chi doc mo ta bang chu.

## File Thay Doi

```text
docs/architecture-boundary.md
outputs/sprint-0/commit-002-boundary-matrices.diff.md
outputs/sprint-0/reviews/commit-002-review.md
```

## Tom Tat Diff

Cap nhat `docs/architecture-boundary.md`:

- Them bang Owner / Input / Output / Public API / Forbidden.
- Them Allowed / Forbidden Dependency Matrix.
- Them legend cho dependency matrix.
- Them cac vi du forbidden dependency de review code ve sau.

Them review file theo mau cua anh:

```text
outputs/sprint-0/reviews/commit-002-review.md
```

## Quyet Dinh Da Chot

```text
Adapter chi noi chuyen voi source va tra normalized data.
Compiler chi tao sitePlan, khong ghi file.
Build Engine chi ghi artifact tu sitePlan.
Runtime Kernel chi xu ly dynamic workflow va credential server-side.
Theme System chi render tu public context.
Plugin System chi mo rong qua hook/context cong khai.
```

## Kiem Tra

Commit documentation-only.

Kiem tra bang mat:

- Moi subsystem co Owner/Input/Output/Public API/Forbidden.
- Moi cap dependency chinh co trang thai Allowed/Forbidden/Hook only/Data only.
- Cac forbidden example khop voi boundary rule.

## Ghi Chu Con Lai

Commit 003 nen tiep tuc voi Public Contracts:

```text
Adapter Contract
Compiler Contract
Runtime Contract
Theme Contract
Plugin Contract
```
