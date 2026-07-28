# Sprint 6 – Phase 5
# Build Engine, Static Generation & Output Pipeline

Version: 1.0
Status: Planning
Architecture: WPSC v2

---

# Goal

Phase 5 xây dựng Build Engine của WPSC.

Sau khi Site đạt trạng thái:

READY_FOR_FIRST_BUILD

Build Engine chịu trách nhiệm:

- đọc cấu hình Site
- đọc Source đã đăng ký
- thu thập dữ liệu
- render Theme
- sinh Static Website
- ghi Output vào:

sites/<site>/public/

Phase 5 KHÔNG triển khai:

- Scheduler
- Incremental Build
- Auto Build
- Deployment
- CDN

Các nội dung trên thuộc Sprint sau.

---

# Core Principle

Build Engine hoàn toàn độc lập với Setup.

Setup kết thúc tại:

READY_FOR_FIRST_BUILD

↓

Build Engine bắt đầu.

Không có Business Logic nào của Build nằm trong Setup Service.

---

# Architecture

Provisioning

↓

Setup Service

↓

READY_FOR_FIRST_BUILD

↓

Build Engine

↓

Source Reader

↓

Content Pipeline

↓

Theme Renderer

↓

Output Pipeline

↓

sites/<site>/public/

---

# Responsibilities

## Build Engine

Là Orchestrator.

Chịu trách nhiệm:

- Build Workflow
- Build State
- Event
- Diagnostics

Không render HTML.

Không đọc Source trực tiếp.

---

## Source Reader

Adapter chịu trách nhiệm:

- lấy dữ liệu
- chuẩn hóa dữ liệu

Không render.

Không ghi Output.

---

## Content Pipeline

Chịu trách nhiệm:

- normalize
- transform
- filter

Đầu ra:

Content Model

---

## Theme Renderer

Input:

Content Model

Output:

HTML

Không biết Source.

---

## Output Pipeline

Chịu trách nhiệm:

- tạo dist
- copy assets
- ghi HTML
- ghi CSS
- ghi JS
- ghi media

Output:

sites/<site>/public/

---

# Build Workflow

READY_FOR_FIRST_BUILD

↓

Load Site

↓

Load Source

↓

Fetch Content

↓

Normalize Content

↓

Render Theme

↓

Generate Static Files

↓

Write Output

↓

Build Finished

---

# Output Principle

Framework chỉ ghi:

sites/<site>/public/

Không ghi:

config/

storage/

themes/

plugins/

---

# Build State

Build Engine tự quản lý:

IDLE

↓

BUILDING

↓

SUCCESS

FAILED

Setup không biết Build State.

---

# Build Events

build.started

build.progress

build.completed

build.failed

Không dùng Event của Setup.

---

# Diagnostics

Build Engine trả:

code

message

severity

Giữ nguyên Contract với Setup.

---

# Theme Principle

Theme chỉ nhận:

Content Model

Không truy cập:

Source

Webhook

Session

Setup

Theme hoàn toàn độc lập.

---

# Plugin Principle

Plugin chỉ mở rộng:

- Build
- Render
- Content

Không sửa Build Engine.

---

# Directory Structure

Framework

src/

build/

renderer/

content/

output/

Sites

sites/

site-a/

public/

config/

storage/

themes/

plugins/

---

# Commit Plan

---

## Commit 023

build: introduce Build Engine contract

Goal

Xây dựng Build Engine Foundation.

Nội dung

- Build Engine Interface
- Build Context
- Build Result
- Build Diagnostics
- Build Events

Không Build.

---

## Commit 024

build: implement Build Workflow

Goal

Workflow của Build.

Nội dung

- Start Build
- Finish Build
- Fail Build
- Build State

Chưa Render.

---

## Commit 025

content: implement Content Pipeline

Goal

Chuẩn hóa dữ liệu.

Nội dung

- Content Model
- Transformer
- Normalizer
- Filter

Chưa Theme.

---

## Commit 026

theme: implement Theme Renderer

Goal

Render HTML.

Nội dung

- Renderer
- Layout
- Page Rendering

Chưa ghi Output.

---

## Commit 027

output: implement Output Pipeline

Goal

Sinh Website.

Nội dung

- Write HTML
- Copy Assets
- Write Media
- Output Manager

Output:

sites/<site>/public/

---

## Commit 028

build: integrate Build Engine

Goal

Ghép toàn bộ Pipeline.

Nội dung

Build Engine

↓

Content Pipeline

↓

Theme Renderer

↓

Output Pipeline

Không Scheduler.

---

## Commit 029

build: finalize Build Engine architecture

Goal

Closeout.

Nội dung

- Audit
- Documentation
- Contracts
- Boundary
- Phase Closeout

---

# Definition of Done

Phase 5 hoàn thành khi:

✓ Build Engine hoạt động

✓ Content Pipeline hoàn chỉnh

✓ Theme Renderer hoạt động

✓ Output Pipeline ghi Website

✓ Browser có thể Build

✓ CLI có thể Build

✓ Event đầy đủ

✓ Diagnostics đầy đủ

✓ Test đầy đủ

✓ Documentation hoàn chỉnh

---

# Non Goals

Phase 5 KHÔNG triển khai:

- Scheduler
- Incremental Build
- Watch Mode
- Queue
- Multi-thread Build
- Deployment
- CDN
- Cache
- Preview Server

---

# Core Rule

Build Engine là Business Owner của toàn bộ quá trình sinh Static Website.

Setup Service không được tham gia Build.

Theme không được biết Source.

Source không được biết Theme.

Output Pipeline là thành phần duy nhất được phép ghi vào:

sites/<site>/public/

Mọi khả năng mở rộng Build phải thông qua Plugin hoặc Build Extension Point, không sửa trực tiếp Build Engine.