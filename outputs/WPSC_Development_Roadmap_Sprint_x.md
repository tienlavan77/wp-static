# WPSC Development Roadmap (Sprint 0 → Sprint 4)

**Version:** 1.0
**Date:** 2026-07-18
**Status:** Proposed Roadmap

---

# Purpose

Sau khi hoàn thành quá trình audit toàn bộ 6 phase của WPSC, kết luận quan trọng nhất là:

> **Kiến trúc lõi của WPSC đã đủ trưởng thành.**

Từ thời điểm này, mục tiêu phát triển không còn là bổ sung thêm nhiều subsystem mới mà là:

* Hoàn thiện trải nghiệm sử dụng.
* Đưa framework vào production.
* Chuẩn bị cho việc phát hành lâu dài.
* Xây dựng hệ sinh thái xung quanh framework.

Roadmap dưới đây đề xuất các Sprint tiếp theo sau khi hoàn thành toàn bộ Phase 1 → Phase 6.

---

# Sprint 0 — Architecture Freeze

## Mục tiêu

Đóng băng kiến trúc nền của WPSC trước khi tiếp tục phát triển.

Đây không phải Sprint viết nhiều code.

Đây là Sprint dành cho việc xác nhận rằng các quyết định kiến trúc hiện tại sẽ trở thành nền tảng của WPSC v1.x.

---

## Công việc

### 1. Xác nhận Architecture Boundary

Đóng băng ranh giới giữa các subsystem:

* Adapter Layer
* Compiler
* Runtime Kernel
* Theme System
* Build Engine

Không để các subsystem phụ thuộc chéo nhau.

---

### 2. Hoàn thiện Public Contracts

Định nghĩa rõ các contract:

* Adapter Contract
* Compiler Contract
* Runtime Contract
* Theme Contract
* Plugin Contract

Mục tiêu:

Framework có thể mở rộng mà không cần sửa Core.

---

### 3. Architecture Decision Records (ADR)

Tạo:

```
docs/adr/
```

Ví dụ:

```
001-normalized-content.md

002-runtime-boundary.md

003-theme-contract.md

004-incremental-build.md

005-plugin-system.md
```

ADR sẽ ghi lại:

* Quyết định
* Lý do
* Phương án thay thế
* Vì sao không chọn phương án khác

---

### 4. Architecture Review

Đánh giá lại:

* Coupling
* Dependency
* Naming
* Public API
* Internal API

Nếu có thay đổi lớn thì thực hiện tại Sprint này.

Sau Sprint 0, hạn chế thay đổi kiến trúc lõi.

---

## Kết quả mong muốn

* Architecture ổn định.
* Public Contract rõ ràng.
* ADR hoàn chỉnh.
* Sẵn sàng bước vào Product Development.

---

# Sprint 1 — Product Foundation

## Mục tiêu

Biến WPSC từ một framework kỹ thuật thành một sản phẩm có thể cài đặt.

---

## 1. Install Wizard

Thiết kế trình cài đặt đầu tiên.

Luồng đề xuất:

```
Welcome

↓

Environment Check

↓

Output Folder

↓

Connect WordPress

↓

Verify API

↓

Select Theme

↓

Configure Runtime

↓

Configure Domain

↓

Generate Configuration

↓

Initial Build

↓

Done
```

Tự động sinh:

* .env
* wpsc.config.js
* runtime.config.js

---

## 2. Environment Validation

Kiểm tra:

* PHP Version
* Node Version
* Permission
* Writable Folder
* SSL
* REST API
* Runtime
* Webhook

---

## 3. WPSC Doctor

CLI:

```
wpsc doctor
```

Hiển thị:

* Environment
* Runtime
* Theme
* Cache
* Routes
* Build
* Webhook
* SEO
* Images

---

## 4. Configuration Validation

CLI:

```
wpsc validate
```

Kiểm tra:

* Config
* Theme
* Runtime
* Adapter
* Route
* Build Folder

---

## 5. Project Scaffold

CLI:

```
npx create-wpsc
```

Starter:

* Commerce
* Catalog
* Blog
* Corporate
* Blank

---

## Kết quả mong muốn

Một lập trình viên chưa từng dùng WPSC vẫn có thể tạo và chạy dự án đầu tiên.

---

# Sprint 2 — Production Hardening

## Mục tiêu

Đưa website Tin Sinh Phát vận hành hoàn toàn trên WPSC.

---

## 1. Production Deployment

Hoàn thiện:

* Build
* Runtime
* Deployment

---

## 2. Performance

Đánh giá:

* Build Time
* Incremental Build
* Cache
* Runtime
* Images

---

## 3. Bug Fix

Tập trung:

* Cart
* Checkout
* Account
* Auth
* Runtime
* Incremental Build

Không bổ sung tính năng lớn.

---

## 4. Error Handling

Bổ sung:

* Error Logger
* Diagnostic Message
* Retry Strategy
* Recovery

---

## 5. Monitoring

CLI:

```
wpsc stats
```

Ví dụ:

* Build Time
* Cache Hit
* Incremental %
* Route Count
* Image Count

---

## 6. Security Review

Kiểm tra:

* Cookie
* Session
* CSRF
* Auth
* Runtime

---

## Kết quả mong muốn

Tin Sinh Phát chạy production ổn định trong nhiều tuần liên tục.

---

# Sprint 3 — Framework Experience

## Mục tiêu

Nâng cao trải nghiệm sử dụng và khả năng bảo trì framework.

---

## 1. Documentation

Hoàn thiện:

* Installation Guide
* Runtime Guide
* Theme Guide
* Plugin Guide
* Deployment Guide

---

## 2. Contract Documentation

Hoàn thiện tài liệu cho:

* Adapter
* Compiler
* Runtime
* Theme
* Plugin

---

## 3. API Stability

Định nghĩa:

* Stable API
* Experimental API
* Internal API

---

## 4. Release Process

Hoàn thiện:

* CHANGELOG
* Migration Guide
* Versioning
* Upgrade Policy

---

## 5. CI/CD

Tự động:

* Test
* Build
* Lint
* Release

---

## Kết quả mong muốn

Framework có thể phát triển lâu dài với quy trình rõ ràng.

---

# Sprint 4 — Ecosystem

## Mục tiêu

Chuẩn bị nền tảng cho WPSC sau phiên bản 1.x.

---

## 1. Theme Marketplace

Chuẩn hóa:

```
theme.json
```

Hỗ trợ:

* Install
* Version
* Compatibility

---

## 2. Plugin Registry

Chuẩn hóa:

```
plugin.json
```

Hỗ trợ:

* Install
* Enable
* Disable
* Update

---

## 3. Multi Adapter

Chuẩn bị Adapter cho:

* Shopify
* Strapi
* Drupal
* Ghost

Không bắt buộc triển khai ngay.

---

## 4. Visual Builder

Chỉ thực hiện khi:

* Runtime ổn định.
* Theme Contract hoàn chỉnh.
* Production đã chứng minh tính ổn định.

---

## 5. Cloud Services (Tương lai)

Khảo sát:

* Remote Build
* Dashboard
* Multi-site
* Team Collaboration

---

## Kết quả mong muốn

WPSC sẵn sàng phát triển thành một hệ sinh thái.

---

# Những việc KHÔNG nên ưu tiên

Ở giai đoạn hiện tại, không nên tập trung vào:

* AI Builder
* Cloud Dashboard hoàn chỉnh
* Marketplace quy mô lớn
* Multi-tenancy
* Hỗ trợ quá nhiều CMS

Ưu tiên cao nhất vẫn là:

* Ổn định
* Production
* Developer Experience

---

# Nguyên tắc phát triển

Trong toàn bộ các Sprint tiếp theo, nên giữ các nguyên tắc sau:

* Không thay đổi kiến trúc lõi nếu không thật sự cần thiết.
* Mọi thay đổi lớn đều phải có ADR.
* Mọi Public API đều phải có tài liệu.
* Không thêm tính năng mới nếu chưa giải quyết xong các vấn đề production.
* Luôn ưu tiên sự ổn định hơn số lượng tính năng.

---

# Roadmap Summary

| Sprint   | Mục tiêu chính        | Trạng thái |
| -------- | --------------------- | ---------- |
| Sprint 0 | Architecture Freeze   | Planned    |
| Sprint 1 | Product Foundation    | Planned    |
| Sprint 2 | Production Hardening  | Planned    |
| Sprint 3 | Framework Experience  | Planned    |
| Sprint 4 | Ecosystem Preparation | Planned    |

---

# Final Recommendation

Sau quá trình audit toàn bộ WPSC, nhận định chung là:

* Kiến trúc nền đã đủ trưởng thành.
* Không cần thiết kế lại Compiler, Runtime hay Theme.
* Giá trị lớn nhất trong giai đoạn tiếp theo nằm ở việc hoàn thiện trải nghiệm sử dụng, nâng cao độ ổn định và xây dựng quy trình phát triển dài hạn.

Mục tiêu của các Sprint từ 0 đến 4 không phải là tạo thêm nhiều tính năng, mà là đưa WPSC từ một framework kỹ thuật trở thành một nền tảng có thể triển khai, bảo trì và phát triển bền vững trong môi trường thực tế.
