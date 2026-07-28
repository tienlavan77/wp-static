# WPSC Architecture v2
# Revision 01 – Final Architecture Adjustments

Version: 1.0
Status: Required
Applies To: WPSC-Architecture-v2.md

---

# Purpose

Revision này tổng hợp toàn bộ các thay đổi cuối cùng trước khi đóng băng (Freeze) tài liệu WPSC-Architecture-v2.

Mục tiêu là đồng nhất toàn bộ tài liệu theo triết lý:

> Site Runtime First

thay vì

> Build Engine First.

Sau khi áp dụng Revision này, Architecture v2 sẽ được xem là ổn định và các Sprint tiếp theo chỉ triển khai theo tài liệu mà không thay đổi kiến trúc nền.

---

# Revision 01
## Vision

### Replace

Framework được mô tả chủ yếu như một Build Framework.

### With

WPSC (WP Static Platform) là một Workspace Platform dùng để tạo và quản lý nhiều Static Website độc lập trên cùng một Framework.

Framework chỉ cung cấp hạ tầng dùng chung.

Mỗi Site là một Runtime độc lập.

Một Site sau khi được tạo phải có khả năng:

- nhận HTTP Request;
- Bootstrap;
- chạy Setup Wizard;
- kết nối Source;
- Build Website;
- vận hành độc lập;
- không phụ thuộc Site khác.

Build Engine chỉ là một thành phần bên trong Site Runtime.

---

# Revision 02
## Site Lifecycle

### Replace

Lifecycle hiện tại.

### With

Create Site Skeleton

↓

Point Domain

↓

Browser Request

↓

Bootstrap

↓

Installation Check

↓

Setup Wizard

↓

Dashboard

↓

Connect Source

↓

Register Webhook

↓

First Build

↓

Website Running

↓

Webhook

↓

Automatic Rebuild

↓

Maintenance

Site Lifecycle này trở thành vòng đời chuẩn của mọi Website trong WPSC.

---

# Revision 03
## Sprint 6 Goal

### Replace

Sprint 6 hoàn thành Backend Setup và First Build.

### With

Sprint 6 hoàn thành toàn bộ Site Runtime.

Kết thúc Sprint 6, một Site Skeleton phải hoạt động như một Website độc lập.

Người dùng chỉ cần:

Build Site Skeleton

↓

Point Domain

↓

Open Browser

↓

Setup

↓

Dashboard

↓

Connect Source

↓

Register Webhook

↓

First Build

↓

Website Running

---

# Revision 04
## Sprint 6 Exit Criteria

Sprint 6 chỉ được xem là hoàn thành khi toàn bộ điều kiện sau đạt được.

### Site Skeleton

- Có thể Build Site Skeleton.
- Skeleton đầy đủ Runtime.
- Có public/index.php.

### Runtime

- Domain có thể trỏ trực tiếp.
- Browser truy cập được.
- Bootstrap hoạt động.
- Installation Check hoạt động.

### Setup

- Browser Setup hoạt động.
- CLI Setup hoạt động.
- Hai giao diện dùng chung Setup Service.

### Dashboard

- Dashboard truy cập được.
- Đọc đúng Site Metadata.
- Hiển thị Site Status.

### Source

- Connect Source.
- Test Connection.
- Register Source.

### Webhook

- Tự động cấu hình.
- Không yêu cầu người dùng nhập UUID.
- Không yêu cầu nhập Secret.

### Build

- First Build thành công.
- Website sinh ra tại:

public/dist

### Runtime State

Site chuyển đúng trạng thái:

CREATED

↓

SETUP_REQUIRED

↓

READY_FOR_FIRST_BUILD

↓

BUILDING

↓

RUNNING

### Final Goal

Người dùng chỉ cần:

- Build Skeleton
- Trỏ Domain
- Mở Browser

là có thể hoàn thành Setup và sử dụng Website.

---

# Revision 05
## Site Runtime Layer

Thêm một Architecture Layer chính thức.

WPSC Platform

↓

Site Runtime

↓

Bootstrap

↓

Router

↓

Installer

↓

Dashboard

↓

API

↓

Scheduler

↓

Build Engine

↓

Renderer

↓

Output Pipeline

Site Runtime là Entry Point của toàn bộ Framework.

Build Engine không còn là Entry Point.

---

# Revision 06
## Site State Machine

Bổ sung chương mới.

Site State

CREATED

↓

SETUP_REQUIRED

↓

READY_FOR_FIRST_BUILD

↓

BUILDING

↓

RUNNING

↓

MAINTENANCE

↓

ERROR

Toàn bộ Runtime phải sử dụng cùng State Machine này.

Bootstrap, Installer, Dashboard và Scheduler không được tự định nghĩa trạng thái riêng.

---

# Revision 07
## Runtime Ownership

Bổ sung bảng Ownership.

| Component | Owner |
|-----------|-------|
| Bootstrap | Runtime |
| Router | Runtime |
| Installer | Runtime |
| Dashboard | Runtime |
| Source Registry | Runtime |
| Webhook Registration | Runtime |
| Scheduler | Scheduler |
| Queue | Scheduler |
| Dispatcher | Scheduler |
| Build Engine | Build |
| Renderer | Build |
| Output Pipeline | Build |

Không Component nào được vượt Ownership của mình.

---

# Revision 08
## Extension Points

Thêm chương mới.

Framework phải xác định rõ các Extension Point.

Source Driver

Theme

Plugin

Renderer

Deployment

Scheduler Trigger

Các Sprint sau chỉ được mở rộng tại các Extension Point này.

Không sửa Core Architecture.

---

# Revision 09
## Public Contracts

Thêm chương mới.

Public Contracts gồm:

- Site Runtime API
- Source Driver API
- Build API
- Scheduler API
- Theme API
- Plugin API

Sau khi Architecture Freeze:

- chỉ mở rộng;
- không phá vỡ Contract.

Đây là nền tảng cho Backward Compatibility.

---

# Revision 10
## Rename Sprint 6

Đổi tên Sprint.

From

Sprint 6

To

Sprint 6 – Site Runtime Platform

hoặc

Sprint 6 – Site Runtime Foundation

Tên Sprint phải phản ánh đúng kết quả đạt được.

Sau Sprint 6:

Build Skeleton

↓

Point Domain

↓

Browser

↓

Setup

↓

Dashboard

↓

Website Running

Sprint này không còn chỉ là Backend.

---

# Final Architecture Goal

Sau khi hoàn thành Sprint 6.

Người dùng phải có khả năng:

Install WPSC

↓

Build Site Skeleton

↓

Point Domain

↓

Open Browser

↓

Setup Website

↓

Connect Source

↓

Register Webhook

↓

First Build

↓

Website Running

Đây là cột mốc đánh dấu WPSC trở thành một Static Website Platform hoàn chỉnh.

Incremental Build, Deployment, Preview, Monitoring và các khả năng mở rộng khác sẽ được triển khai ở các Sprint tiếp theo mà không cần thay đổi Core Architecture.

---

# Freeze Statement

Sau khi áp dụng toàn bộ Revision này:

- Vision được Freeze.
- Site Lifecycle được Freeze.
- Runtime Architecture được Freeze.
- Ownership được Freeze.
- Public Contracts được Freeze.

Mọi Sprint tiếp theo chỉ triển khai theo tài liệu này.

Không thay đổi triết lý kiến trúc nếu không có Architecture Decision Record (ADR) mới được phê duyệt.