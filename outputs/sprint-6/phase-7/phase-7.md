# Sprint 6 – Phase 7
# Site Runtime Completion

Version: 1.0
Status: Planning
Architecture: WPSC v2 (Final)

---

# Goal

Hoàn thiện Site Runtime để một Site Skeleton sau khi được tạo
có thể hoạt động như một Website độc lập.

Kết thúc Phase 7.

Người dùng phải có thể:

Build Site Skeleton

↓

Point Domain

↓

Open Browser

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

---

# Scope

Phase 7 chỉ hoàn thiện Runtime.

Không mở rộng Build Engine.

Không thay đổi Scheduler.

Không thay đổi Source Driver.

Không triển khai Incremental Build.

---

# Runtime Flow

HTTP Request

↓

public/index.php

↓

Bootstrap

↓

Runtime

↓

Installation Check

↓

Installer

↓

Dashboard

↓

First Build

↓

Running Website

---

# Deliverables

## Runtime Bootstrap

Hoàn thiện Runtime Bootstrap.

Bao gồm:

- Entry Point
- Runtime Loader
- Site Resolver
- Installation Check

---

## Installer Runtime

Hoàn thiện Browser Installer.

Installer phải:

- phát hiện Site chưa cài
- chạy Setup Wizard
- lưu Site Configuration
- chuyển Site sang READY_FOR_FIRST_BUILD

---

## Dashboard Runtime

Sau Setup.

Browser phải chuyển tới Dashboard.

Dashboard phải đọc:

- Site Metadata
- Runtime State
- Source Status
- Build Status

---

## Source Integration

Dashboard phải hỗ trợ:

- Connect Source
- Test Connection
- Register Source

Không Build.

---

## Webhook Registration

Dashboard phải hỗ trợ:

Register Webhook

Plugin không yêu cầu nhập:

- UUID
- Secret

Runtime tự hoàn thành Registration.

---

## First Build

Dashboard có:

Build Website

↓

Scheduler

↓

Build Engine

↓

Output

↓

public/dist

---

## Runtime State

Runtime phải chuyển đúng trạng thái.

CREATED

↓

SETUP_REQUIRED

↓

READY_FOR_FIRST_BUILD

↓

BUILDING

↓

RUNNING

---

# Commit Plan

---

## Commit 036

runtime: implement site bootstrap

Goal

Hoàn thiện Bootstrap.

Bao gồm:

- public/index.php
- Runtime Loader
- Site Resolver
- Installation Check

Done

Browser mở Site Skeleton được.

---

## Commit 037

runtime: implement installer workflow

Goal

Hoàn thiện Setup Wizard Runtime.

Bao gồm:

- Installer Controller
- Setup Workflow
- Validation
- Save Configuration
- Runtime State

Done

Site chuyển sang:

READY_FOR_FIRST_BUILD

---

## Commit 038

runtime: implement dashboard

Goal

Hoàn thiện Dashboard.

Bao gồm:

- Site Information
- Runtime State
- Source Status
- Build Status

Done

Dashboard hiển thị đúng Site.

---

## Commit 039

runtime: integrate source registration

Goal

Dashboard hỗ trợ:

- Connect Source
- Test Connection
- Register Source

Không Build.

---

## Commit 040

runtime: integrate webhook registration

Goal

Dashboard hỗ trợ:

Register Webhook

Runtime tự xử lý:

- Site UUID
- Secret
- Registration

Plugin không cần nhập thủ công.

---

## Commit 041

runtime: first build integration

Goal

Dashboard hỗ trợ:

Build Website

↓

Scheduler

↓

Build Engine

↓

public/dist

Done

Website chạy sau Build đầu tiên.

---

## Commit 042

docs: phase 7 closeout

Goal

Đóng Phase 7.

Bao gồm:

- Documentation
- Runtime Audit
- Architecture Validation
- Boundary Review

Freeze Runtime.

---

# Definition of Done

Phase 7 hoàn thành khi:

✓ Build Site Skeleton

✓ Domain trỏ được

✓ Browser mở được

✓ Bootstrap hoạt động

✓ Installation Check hoạt động

✓ Setup Wizard hoàn thành

✓ Dashboard hoạt động

✓ Connect Source

✓ Register Source

✓ Register Webhook

✓ First Build thành công

✓ Website sinh tại:

public/dist

✓ Runtime chuyển sang:

RUNNING

---

# Out of Scope

Phase 7 không triển khai:

- Incremental Build
- Dependency Graph
- Preview
- Deployment
- Monitoring
- Multi-thread Build
- Distributed Build
- Remote Cache

---

# Result

Kết thúc Sprint 6.

Người dùng có thể:

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

Build Website

↓

Website Running

Đây là cột mốc hoàn thành Site Runtime Platform theo WPSC Architecture v2.