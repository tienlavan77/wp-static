# WPSC Phase 3 Roadmap

## Muc tieu

Lam WPSC tien dung hon cho dev va deploy, chua tap trung vao layout/theme.

## Checklist

```text
[x] 035 feat(router): omit trailing slash from route paths
[x] 036 feat(config): validate project config
[x] 037 feat(cli): print build summary
[x] 038 feat(cli): add clean command
[x] 039 feat(cli): add doctor command
[x] 040 feat(cli): add static serve command
[x] 041 docs: add CLI usage guide updates
```

## Lenh moi

```bash
node src/cli/index.js build --project examples/basic-shop
node src/cli/index.js clean --project examples/basic-shop
node src/cli/index.js doctor --project examples/basic-shop
node src/cli/index.js serve --project examples/basic-shop --port 8080
```

## Routing

Public route khong con dau `/` cuoi slug:

```text
/iphone-15
/gioi-thieu
/ao-thun-basic
```

Static output van giu dang:

```text
iphone-15/index.html
gioi-thieu/index.html
ao-thun-basic/index.html
```
