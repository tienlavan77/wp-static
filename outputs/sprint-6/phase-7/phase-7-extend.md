# Sprint 6 – Phase 7 Extension
# Runtime Composition Completion

Version: 1.0

Status: Required

Depends On

Commit 042

---

# Goal

Hoàn thiện Site Runtime Composition.

Sau khi hoàn thành Extension này.

Toàn bộ Site Runtime phải có thể chạy thực tế từ Browser.

---

# Final Runtime Flow

Domain

↓

public/index.php

↓

Runtime Bootstrap

↓

HTTP Router

↓

Installer

↓

Dashboard

↓

Source

↓

Webhook

↓

Scheduler

↓

Dispatcher

↓

Build Engine

↓

Output Pipeline

↓

public/dist

↓

Running Website

---

# Scope

Extension này chỉ hoàn thiện Runtime Composition.

Không thay đổi:

- Architecture
- Scheduler
- Build Engine
- Source Driver

---

# Commit Plan

---

## Commit 043

runtime: implement composition root

### Goal

Hoàn thiện PHP Composition Root.

Bao gồm:

- Runtime Bootstrap
- Dependency Container
- Repository Wiring
- Runtime Services Wiring

### Deliverables

- Runtime Bootstrap
- Runtime Container
- Runtime Instance

---

## Commit 044

runtime: implement http router

### Goal

Hoàn thiện HTTP Router.

Expose:

- Installer
- Dashboard
- Source
- Webhook
- First Build

Browser có thể gọi Runtime.

### Deliverables

- Runtime Router
- Controller Dispatcher
- HTTP Endpoints

---

## Commit 045

runtime: implement site runtime composition

### Goal

Ghép toàn bộ Runtime Instance.

Bao gồm:

Repository

↓

Setup Service

↓

Source Service

↓

Webhook Service

↓

Scheduler

↓

Dispatcher

↓

Build Integration

↓

Output Pipeline

Runtime phải hoạt động như một Site thật.

---

## Commit 046

runtime: end-to-end validation

### Goal

Thực hiện E2E Runtime Test.

Flow:

Build Site Skeleton

↓

Point Domain

↓

Browser

↓

Installer

↓

Dashboard

↓

Source

↓

Webhook

↓

Scheduler

↓

Build

↓

public/dist

↓

Running Website

### Deliverables

- Runtime E2E Test
- Runtime Validation Report

---

## Commit 047

docs: sprint 6 final closeout

### Goal

Đóng Sprint 6.

Bao gồm:

- Final Runtime Audit
- Architecture Validation
- Site Runtime Validation
- Sprint Validation

Freeze Sprint 6.

---

# Definition of Done

Sprint 6 chỉ hoàn thành khi:

✓ Domain trỏ trực tiếp vào Site

✓ Browser truy cập được

✓ public/index.php hoạt động

✓ Runtime Bootstrap hoạt động

✓ HTTP Router hoạt động

✓ Installer hoạt động

✓ Dashboard hoạt động

✓ Connect Source

✓ Register Webhook

✓ Scheduler Trigger

✓ Dispatcher

✓ Build Engine

✓ Output Pipeline

✓ public/dist được sinh

✓ Website chạy thực tế

---

# Result

Sau Commit 047.

Người dùng chỉ cần:

Install WPSC

↓

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

Sprint 6 hoàn thành.

Site Runtime Platform được Freeze.