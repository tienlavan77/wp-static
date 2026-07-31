# WPSC Architecture v2.01 Final

> Version: v2.01-final
> Status: Accepted
> Last Updated: 2026-08
> Authors: WPSC Team

> This revision incorporates Architecture Revisions 01, 02 and 03. Where
> older sections conflict with the lifecycle and ownership rules below, this
> v2.01 contract takes precedence.

---

# 1. Vision

## 1.1 Project Vision

WPSC (WP Static Platform) là một **Workspace Platform** dùng để tạo và quản lý
nhiều Static Website độc lập trên cùng một Framework. WPSC không phải chỉ là
một Static Site Generator; Build Engine chỉ là một thành phần của Site Runtime.

Framework chỉ cung cấp hạ tầng dùng chung. Mỗi Site là một Runtime độc lập và
sau khi tạo Site Skeleton, người dùng phải có thể trỏ Domain, truy cập bằng
Browser, chạy Setup Wizard, kết nối Source, Build và vận hành Site độc lập.

Framework cung cấp:

- Build Engine
- Dashboard
- CLI
- Setup Wizard
- Shared Themes
- Shared Plugins
- Shared Source Adapters

Mỗi Website (Site) chỉ chứa:

- Configuration
- Runtime Data
- Cache
- Logs
- Public Assets
- Generated Static Files
- Private Themes
- Private Plugins

Triết lý của WPSC là:

> **One Framework. Multiple Sites. Complete Isolation.**

---

## 1.2 Canonical Runtime Architecture

Site Runtime tuân theo các boundary sau. Mỗi mũi tên là một contract boundary;
client và service phía trên không được bỏ qua bất kỳ layer nào.

```text
Create Site Skeleton -> Point Domain -> Browser Request -> Bootstrap
    -> Installation Check -> Setup Wizard -> Connect Source -> Register Webhook
    -> READY_FOR_FIRST_BUILD

Browser / CLI / Webhook / Schedule
    -> Scheduler -> Job Queue -> Job Dispatcher -> Build Engine
    -> Content Reader -> Content Pipeline -> Theme Renderer -> Output Pipeline
    -> sites/<site>/public/dist/
```

Setup chỉ sở hữu provisioning, session, source registration, webhook activation
và readiness. `READY_FOR_FIRST_BUILD` là điều kiện đủ để Build, không phải Build
state. Build Engine sở hữu Build lifecycle. Scheduler sở hữu automation policy
và Job. Output Pipeline là writer duy nhất dưới `sites/<site>/public/dist/`.

Incremental Build là boundary planning phía trước Build Engine:

```text
Source Change -> Dependency Graph -> Incremental Planner -> Build Context
              -> Build Engine
```

Dependency Graph chỉ lưu relationship; Planner chỉ xác định scope; cả hai không
render, không ghi output và không thay đổi Build Engine lifecycle.

---

## 1.3 Site Runtime Layer

Site Runtime là Entry Point chính thức của mỗi Site; Build Engine không phải
Entry Point. Runtime layer gồm:

```text
WPSC Platform
    -> Site Runtime
    -> Bootstrap
    -> Router
    -> Installer / Setup Wizard
    -> Dashboard
    -> API
    -> Scheduler
    -> Build Engine
    -> Renderer
    -> Output Pipeline
```

Một Site Skeleton hoàn chỉnh có Runtime, `public/index.php`, metadata và public
output boundary. Khi Domain trỏ đến Skeleton, Browser Request đi qua Bootstrap
và Installation Check trước khi vào Setup Wizard hoặc Dashboard.

## 1.4 Canonical Site State Machine

Toàn bộ Runtime sử dụng cùng Site State Machine; Bootstrap, Installer,
Dashboard và Scheduler không được tự định nghĩa Site state.

```text
CREATED
  -> SETUP_REQUIRED
  -> READY_FOR_FIRST_BUILD
  -> BUILDING
  -> RUNNING
  -> MAINTENANCE
  -> ERROR
```

`READY_FOR_FIRST_BUILD` là terminal outcome của Setup và entry condition của
Build. `BUILDING`, `RUNNING`, `MAINTENANCE` và `ERROR` là Site Runtime state;
chúng không thay thế Build State hoặc Job State độc lập.

## 1.5 Ownership and Extension Points

| Component | Owner |
| --- | --- |
| Bootstrap, Router, Installer, Dashboard, Source Registry, Webhook Registration | Site Runtime |
| Scheduler, Queue, Dispatcher | Scheduler |
| Build Engine, Renderer, Output Pipeline | Build |

Các extension point chính thức là Source Driver, Theme, Plugin, Renderer,
Deployment và Scheduler Trigger. Extension phải đi qua public contract; không
được sửa Core Architecture hoặc bỏ qua ownership boundary.

## 1.6 Public Contract Freeze

Các public contract là Site Runtime API, Source Driver API, Build API, Scheduler
API, Theme API và Plugin API. Sau architecture freeze, contract chỉ được mở rộng
theo hướng backward-compatible; mọi breaking change cần ADR được phê duyệt.

## 1.7 Sprint 6 – Site Runtime Platform

Sprint 6 được định nghĩa là **Site Runtime Platform**. Exit goal là người dùng
Build Site Skeleton, trỏ Domain và mở Browser để hoàn tất Setup, kết nối Source,
đăng ký Webhook, thực hiện First Build qua Scheduler và vận hành Website độc
lập. Các criteria này là target architecture/acceptance criteria; trạng thái
triển khai được theo dõi trong roadmap và test suite, không được suy ra chỉ từ
tài liệu này.

---

# 1.8 Design Goals

WPSC được xây dựng dựa trên các mục tiêu sau.

## Reusable

Một Framework có thể phục vụ nhiều Website.

Không cần cài đặt lại Framework.

---

## Isolated

Mỗi Site hoạt động độc lập.

Một Site không được phép:

- ghi dữ liệu sang Site khác
- đọc Cache Site khác
- đọc Config Site khác
- Build Site khác

---

## Extensible

Framework phải cho phép mở rộng thông qua:

- Theme
- Plugin
- Source Adapter

mà không cần sửa Core.

---

## Maintainable

Tất cả thành phần dùng chung chỉ tồn tại một bản.

Ví dụ:

- Dashboard
- Setup Wizard
- Theme
- Plugin
- Source Adapter

được quản lý tập trung.

---

## Production Ready

Framework hướng tới môi trường Production ngay từ đầu.

Mọi Site đều có thể:

- Build
- Deploy
- Backup
- Restore

một cách độc lập.

---

# 2. Core Principles

Đây là những nguyên tắc bắt buộc của toàn bộ kiến trúc WPSC.

Mọi Sprint sau này đều phải tuân thủ.

---

# Principle 1 — Shared Infrastructure

Framework là hạ tầng dùng chung.

Framework chịu trách nhiệm:

- CLI
- Dashboard
- Build Engine
- Setup Wizard
- Shared Theme
- Shared Plugin
- Shared Source Adapter

Framework không chứa dữ liệu Runtime của Site.

---

# Principle 2 — Site Isolation

Mỗi Site là một Runtime độc lập.

Mỗi Site chỉ được phép thao tác trên dữ liệu của chính mình.

Bao gồm:

- Config
- Storage
- Cache
- Logs
- Public
- Generated Files

Không được phép truy cập Site khác.

---

# Principle 3 — Site Lifecycle

Mỗi Site có vòng đời riêng.

```
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
      │
      ▼
Maintenance
```

Framework không có vòng đời.

Chỉ Site có vòng đời.

---

# Principle 4 — Shared Setup Wizard

Setup Wizard là thành phần dùng chung của Framework.

Không tồn tại Installer riêng cho từng Site.

Framework chịu trách nhiệm:

- Render Wizard
- Validate Environment
- Register Source
- Generate Config
- First Build

Site chỉ lưu kết quả Setup.

---

# Principle 5 — Framework is Source of Truth

Framework là nơi duy nhất tạo:

- Site UUID
- Secret
- Webhook URL
- Registration State

Source Plugin không tự sinh các thông tin trên.

---

# Principle 6 — Zero Cross-Site Coupling

Không có Runtime nào được phép:

- truy cập Cache Site khác
- ghi Log Site khác
- Build Site khác
- sửa Config Site khác

Mọi thao tác đa Site chỉ được thực hiện thông qua:

- CLI
- Dashboard

---

# Principle 7 — Shared First, Override Later

Framework luôn ưu tiên sử dụng tài nguyên theo thứ tự:

```
Site Resources

↓

Workspace Resources

↓

Framework Default
```

Nguyên tắc này áp dụng cho:

- Theme
- Plugin
- Config

---

# 3. Workspace Architecture

Framework quản lý toàn bộ Workspace.

```
Workspace

│

├── Framework

├── Dashboard

├── CLI

├── Setup Wizard

├── Shared Themes

├── Shared Plugins

├── Shared Source Adapters

└── Sites
```

Framework không trực tiếp quản lý Runtime của Site.

Framework chỉ:

- Load
- Build
- Deploy
- Monitor

---

# 4. Workspace Directory Structure

```
wp-static/

├── framework/
│
├── cli/
│
├── dashboard/
│
├── setup/
│
├── themes/
│
├── plugins/
│
├── sources/
│
├── storage/
│   └── cache/
│
└── sites/
```

---

## framework/

Core của toàn bộ hệ thống.

Bao gồm:

- Build Engine
- Runtime
- Services
- API
- Internal Libraries

Không chứa dữ liệu của Site.

---

## cli/

Workspace CLI.

Ví dụ:

```
wpsc site:create
wpsc site:build
wpsc site:delete
wpsc build
wpsc release
```

CLI quản lý Workspace.

Không quản lý Runtime.

---

## dashboard/

Web Dashboard.

Chịu trách nhiệm:

- Site Management
- Build
- Monitor
- Deploy
- Settings

Dashboard không chứa Business Logic.

---

## setup/

Shared Setup Wizard.

Chỉ có một bản duy nhất.

Mọi Site đều dùng chung.

Setup bao gồm:

- Environment Check
- Source Registration
- Theme Selection
- Plugin Selection
- Config Generation
- First Build

---

## themes/

Shared Themes.

Ví dụ:

```
themes/

modern/

landing/

shop/

blog/
```

Toàn bộ Site đều có thể sử dụng.

---

## plugins/

Shared Plugins.

Ví dụ:

```
plugins/

seo/

search/

sitemap/

analytics/
```

Plugin được chia sẻ cho toàn Workspace.

---

## sources/

Shared Source Adapters.

Ví dụ:

```
sources/

wordpress/

rest/

json/

graphql/
```

Build Engine không phụ thuộc Source.

Source Adapter chịu trách nhiệm Normalize Data.

---

## storage/

Storage dùng chung của Workspace.

Chỉ chứa dữ liệu Framework.

Ví dụ:

```
storage/

cache/

theme-registry

plugin-registry

source-registry
```

Không chứa:

- Cache Site
- Log Site
- Runtime Site

---

## sites/

Đây là nơi chứa toàn bộ Website.

Ví dụ:

```
sites/

company-a/

company-b/

landing/

event-2027/
```

Mỗi Site là một Runtime độc lập.

---

# 5. Site Directory Structure

```
sites/

company-a/

├── config/
│
├── storage/
│
├── public/
│   └── dist/
│
├── themes/
│
└── plugins/
```

---

## config/

Chứa toàn bộ cấu hình của Site.

Ví dụ:

- source
- theme
- plugin
- build
- deploy

Framework đọc Config.

Không sửa trực tiếp.

---

## storage/

Runtime Storage của Site.

Ví dụ:

```
storage/

cache/

logs/

tmp/

sessions/
```

Toàn bộ Runtime Data nằm trong đây.

Không chia sẻ.

---

## public/

Web Root của Site.

Người dùng có thể đặt:

- favicon.ico
- robots.txt
- uploads/
- assets/
- verify files

Builder không được phép ghi đè ngoài vùng Build.

---

## public/dist/

Đây là Build Output.

Builder chỉ được phép ghi trong:

```
public/dist/
```

Không được ghi trực tiếp vào:

```
public/
```

Điều này đảm bảo:

- Asset thủ công không bị mất
- robots.txt không bị ghi đè
- favicon không bị xóa

---

## themes/

Private Theme.

Chỉ Site hiện tại sử dụng.

Ví dụ:

```
sites/company-a/themes/

company-theme/
```

Nếu Theme không tồn tại,

Framework sẽ tìm tiếp trong:

```
workspace/themes/
```

---

## plugins/

Private Plugin.

Chỉ Site hiện tại sử dụng.

Nếu Plugin không tồn tại,

Framework sẽ Load Shared Plugin.

---

# 6. Resource Resolution Strategy

Framework luôn Resolve Resource theo thứ tự:

```
Site Resource

↓

Workspace Resource

↓

Framework Default
```

Ví dụ:

Theme

```
Site Theme

↓

Shared Theme

↓

Default Theme
```

Plugin

```
Site Plugin

↓

Shared Plugin
```

Config

```
Site Config

↓

Framework Default Config
```

Nguyên tắc này áp dụng thống nhất trên toàn bộ hệ thống.

---

**End of Part 1**

---

# 7. Site Lifecycle

## 7.1 Overview

Trong WPSC, chỉ **Site** có vòng đời (Lifecycle).

Framework luôn tồn tại và không cần cài đặt lại.

Mỗi Site được tạo, cấu hình, build và triển khai hoàn toàn độc lập.

```
Create Site Skeleton
      │
      ▼
Point Domain
      │
      ▼
Browser Request
      │
      ▼
Bootstrap
      │
      ▼
Installation Check
      │
      ▼
Setup Wizard
      │
      ▼
Dashboard
      │
      ▼
Connect Source
      │
      ▼
Register Webhook
      │
      ▼
First Build
      │
      ▼
Website Running
      │
      ▼
Webhook
      │
      ▼
Automatic Rebuild
      │
      ▼
Maintenance
```

Framework chỉ cung cấp hạ tầng cho toàn bộ quá trình trên.

---

## 7.2 Site States

Mỗi Site luôn ở một trạng thái xác định.

Ví dụ:

State machine chuẩn được định nghĩa ở Section 1.4 và thay thế mọi enum legacy
trong các phần sau của tài liệu:

```text
CREATED -> SETUP_REQUIRED -> READY_FOR_FIRST_BUILD -> BUILDING -> RUNNING
        -> MAINTENANCE -> ERROR
```

`REGISTERING_SOURCE` là Setup workflow state nội bộ, không phải Site Runtime
state. `READY` và `DISABLED` legacy không được dùng làm canonical Site state.

---

# 7.3 Site Metadata

Mỗi Site nên có một Metadata File.

Ví dụ:

```
sites/company-a/config/site.json
```

Ví dụ:

```json
{
    "uuid": "e62d4d0a-xxxx",
    "name": "company-a",
    "status": "READY",
    "framework_version": "2.0.0",
    "created_at": "...",
    "updated_at": "..."
}
```

Framework đọc trạng thái từ file này.

Không lưu Runtime State trong Framework.

---

# 8. Setup Wizard

## 8.1 Overview

Setup Wizard là thành phần dùng chung của Framework.

Không tồn tại Installer riêng cho từng Site.

Toàn bộ Site đều sử dụng cùng một Wizard.

```
Framework

↓

Setup Module

↓

Site
```

---

## 8.2 Responsibilities

Setup Wizard và Setup Service chịu trách nhiệm:

- Environment Check
- Source Registration
- Theme Selection
- Plugin Selection
- Configuration Generation
- Final Validation

Không chịu trách nhiệm:

- Runtime
- Build Logic hoặc Build Lifecycle
- Theme Rendering

---

## 8.3 Browser Flow

Người dùng tạo Site.

↓

Dashboard phát hiện:

```
SETUP_REQUIRED
```

↓

Chuyển đến:

```
/setup
```

↓

Wizard bắt đầu.

---

## 8.4 Setup Flow

```
Environment Check

↓

Source Configuration

↓

Connection Test

↓

Register Source

↓

Generate Config

↓

Select Theme

↓

Select Plugins

↓

Ready For First Build

↓

Done
```

---

## 8.5 Setup Service

Browser và CLI phải dùng chung một Service.

```
Dashboard

↓

Setup Service

↑

CLI
```

Không được phép có hai luồng Setup khác nhau.

---

## 8.6 Environment Check

Wizard phải kiểm tra:

- PHP Version
- Required Extensions
- Write Permission
- Storage Permission
- Public Directory
- Cache Directory

Nếu không đạt yêu cầu,

không cho phép tiếp tục.

---

## 8.7 First Build

Setup kết thúc tại `READY_FOR_FIRST_BUILD`. Đây chỉ biểu thị Site đủ điều kiện
để Build, không biểu thị Build đã bắt đầu, đang chạy hoặc hoàn thành.

First Build thuộc Build Engine và phải đi theo Scheduler architecture. Browser,
CLI và Webhook không gọi Build Engine trực tiếp.

---

# 9. Webhook Architecture

## 9.1 Design Goal

Framework chỉ có một Webhook Gateway.

Không tạo Webhook riêng cho từng Site.

---

## 9.2 Architecture

```
Source Plugin

↓

Webhook Gateway

↓

Authentication and Site Resolution

↓

Scheduler

↓

Job Queue

↓

Job Dispatcher

↓

Build Engine

↓

Static Website Output
```

Framework chịu trách nhiệm:

- Authentication
- Routing and Site resolution
- Scheduler policy, Queueing and retry
- Job dispatch
- Logging

Site chỉ xử lý Business Logic.

---

## 9.3 Site UUID

Mỗi Site có một UUID duy nhất.

Ví dụ:

```
e62d4d0a-xxxx
```

UUID được sinh bởi Framework.

Không cho phép người dùng sửa.

---

## 9.4 Webhook URL

Webhook URL sử dụng UUID.

Ví dụ:

```
POST

/webhook/e62d4d0a-xxxx
```

Framework dựa vào UUID để xác định Site.

Không sử dụng:

- Site Name
- Slug

làm định danh Webhook.

---

## 9.5 Secret

Mỗi Site có Secret riêng.

Ví dụ:

```
Site A

Secret A
```

```
Site B

Secret B
```

Không dùng Secret chung.

---

## 9.6 Dispatcher

Webhook Gateway chịu trách nhiệm verify signature, resolve Site và gửi request
với trigger type `webhook` tới Scheduler. Job Dispatcher chỉ claim Job, gọi
injected Build Engine và cập nhật Job status. Không thành phần nào xử lý dữ liệu
Source hoặc Build logic trong webhook request.

---

## 9.7 Queue

Webhook luôn đi qua Scheduler rồi Queue.

```
Webhook

↓

Scheduler

↓

Job Queue

↓

Job Dispatcher

↓

Build Engine
```

Không Build trực tiếp trong Request.

---

## 9.8 Scheduler Boundary

Scheduler owns tick, trigger evaluation, retry and enqueue policy. Queue owns
immutable Job lifecycle. Build Engine remains the only owner of Build lifecycle,
diagnostics and `build.*` events. Scheduler and Job events use `scheduler.*`
and `job.*` namespaces only.

---

# 10. Source Registration

## 10.1 Principle

Framework là Source of Truth.

Source Plugin chỉ là Client.

Plugin không được tự sinh:

- UUID
- Secret
- Webhook URL

---

## 10.2 Registration Flow

```
Create Site

↓

Setup Wizard

↓

User nhập

• Website URL

• Username

• Application Password

↓

Framework

↓

Ping Plugin

↓

Register Plugin

↓

Generate UUID

↓

Generate Secret

↓

Configure Webhook

↓

Test Connection

↓

Done
```

Người dùng không cần:

- Copy UUID
- Copy Secret
- Copy Webhook URL

---

## 10.3 Plugin Discovery

Framework kiểm tra Plugin trước.

```
GET

/wp-json/wpsc/v1/ping
```

Ví dụ:

```json
{
    "plugin": "wpsc-source",
    "version": "1.0.0"
}
```

Nếu Plugin không tồn tại,

Wizard yêu cầu cài đặt Plugin.

---

## 10.4 Registration API

Framework chủ động đăng ký.

```
POST

/wp-json/wpsc/v1/register
```

Payload:

```json
{
    "site_uuid": "...",
    "secret": "...",
    "webhook_url": "...",
    "workspace_url": "..."
}
```

Plugin lưu các thông tin này.

---

## 10.5 Test Connection

Sau khi Register,

Framework thực hiện:

```
POST

/wp-json/wpsc/v1/test
```

Nếu thành công,

Setup tiếp tục.

---

## 10.6 Disconnect

Khi Site bị xoá hoặc huỷ liên kết,

Framework gọi:

```
POST

/wp-json/wpsc/v1/disconnect
```

Plugin xoá:

- UUID
- Secret
- Token
- Webhook

---

## 10.7 Plugin Responsibilities

Source Plugin chỉ thực hiện các nhiệm vụ sau:

- Theo dõi thay đổi dữ liệu.
- Gửi Webhook.
- Cung cấp REST API.
- Trả lời Ping.
- Register.
- Disconnect.

Plugin không chứa:

- Build Logic
- Theme Logic
- Cache Logic
- Queue
- Business Logic

---

## 10.8 Framework Responsibilities

Framework chịu trách nhiệm:

- Sinh UUID.
- Sinh Secret.
- Quản lý Registration.
- Webhook Gateway.
- Queue.
- Dispatcher.
- Sync.
- Build.
- Logging.
- Retry.
- Error Recovery.

Framework luôn là nơi quản lý toàn bộ vòng đời kết nối với Source.

---

# End of Part 2

---

# 11. Development Roadmap

## Overview

Roadmap được xây dựng theo nguyên tắc:

- Mỗi Sprint chỉ giải quyết một nhóm vấn đề.
- Không triển khai nhiều kiến trúc lớn trong cùng Sprint.
- Sau mỗi Sprint phải có:
  - Audit
  - Documentation
  - Test
  - Review

---

# Sprint 1 — Framework Foundation

## Goal

Xây dựng nền tảng Framework.

## Deliverables

- Workspace structure
- CLI bootstrap
- Build engine foundation
- Config loader
- Service container
- Basic routing

## Status

✅ Completed

---

# Sprint 2 — Theme System

## Goal

Hoàn thiện hệ thống Theme.

## Deliverables

- Theme Loader
- Theme Resolver
- Theme Rendering
- Theme Configuration
- Shared Theme Support

## Status

✅ Completed

---

# Sprint 3 — Plugin System

## Goal

Hoàn thiện Plugin Architecture.

## Deliverables

- Plugin Loader
- Plugin Resolver
- Plugin Events
- Plugin Hooks
- Shared Plugin

## Status

✅ Completed

---

# Sprint 4 — Build Engine

## Goal

Hoàn thiện Static Build Engine.

## Deliverables

- Renderer
- Static Generator
- Build Pipeline
- Asset Pipeline
- Incremental Build
- Output Management

## Status

✅ Completed

---

# Sprint 5 — Production Release

## Goal

Cho phép tạo Release có thể triển khai Production.

## Deliverables

- Release Builder
- Release Manifest
- Release Package
- Production Config
- Deploy Guide
- Release CLI

## Status

✅ Completed

---

# Sprint 6 — Site Runtime Platform

## Goal

Hoàn thiện vòng đời của Site.

Sprint này KHÔNG xây dựng Build Engine.

Sprint này chỉ tập trung vào:

- Site Creation
- Setup
- Source Registration
- First Build

---

## Deliverables

### Site Lifecycle

- Site State
- Metadata
- State Manager

---

### Setup Wizard

- Shared Setup Module
- Browser Wizard
- CLI Setup
- Environment Check

---

### Source Registration

- Plugin Discovery
- Register API
- Disconnect API
- Test API

---

### Webhook Gateway

- Shared Gateway
- UUID Routing
- Dispatcher
- Queue

---

### Site Configuration

Sinh:

- Config
- UUID
- Secret
- Metadata

---

### First Build

Sau khi Setup thành công.

↓

Trigger Build đầu tiên.

---

## Exit Criteria

- Có thể tạo Site mới.
- Có thể chạy Setup Wizard.
- Có thể kết nối WordPress.
- Có thể Register Source.
- Có thể Build lần đầu.
- Site chuyển sang trạng thái READY.

---

# Sprint 7 — CMS Runtime

## Goal

Chuyển Site Runtime hiện có thành CMS Runtime hoàn chỉnh. Sprint này xây dựng
khả năng authoring và publishing Website trên Runtime Platform đã hoàn thành ở
Sprint 6; không xây lại Framework, Build Engine hay Scheduler.

## Deliverables

- Pages
- Posts
- Menus
- Media Library
- Search
- Routing
- Theme Composition
- Publishing Workflow
- Site Configuration Management

## Exit Outcome

```text
Create Site

↓

Open Browser

↓

CMS Runtime

↓

Create Website Content

↓

Publish Website
```

Sprint 7 phải giữ Site configuration isolated và không hardcode domain, source
state hay service data cho một Site cụ thể. Multi-site operations đầy đủ vẫn
thuộc Sprint 9.

---

# Sprint 8 — Advanced Website Experience

## Goal

Mở rộng CMS Runtime thành trải nghiệm Website production thực tế.

## Deliverables

- WooCommerce hoàn chỉnh
- Customer Account
- Shopping Cart
- Checkout
- Forms
- Advanced SEO
- Cache
- Performance Optimization
- Extensions

## Exit Outcome

```text
CMS Runtime

↓

Commerce

↓

Customer Experience

↓

High Performance Website
```

Các khả năng này phải mở rộng qua contract/provider phù hợp; Browser, Theme và
client không được tự sở hữu business logic.

---

# Sprint 9 — Production Operations

## Goal

Cung cấp năng lực vận hành production cho nhiều Site trên cùng Framework.

## Deliverables

- Multi-site Management
- Backup
- Restore
- Monitoring
- Logs
- Security
- Deployment
- Enterprise Runtime

## Exit Outcome

```text
Website

↓

Production Operations

↓

Enterprise-ready Platform
```

Multi-site management phải giữ nguyên Shared Infrastructure, Site Isolation và
Zero Cross-Site Coupling đã được freeze trong Architecture v2.01.

---

# Sprint 10 — Product Release

## Goal

Đóng gói WPSC thành sản phẩm ổn định và phát hành Version 1.0.

## Deliverables

- Installer hoàn chỉnh
- Upgrade
- Migration
- Documentation
- SDK
- Stable API
- Version 1.0 Release

## Exit Outcome

```text
Production Platform

↓

Stable Product

↓

WPSC v1.0
```

Sprint 10 không thay đổi core architecture; chỉ chuẩn hóa packaging, migration,
compatibility, documentation và release quality.

---

# 12. Sprint 6 Detailed Tasks

## Phase 1

### Site Metadata

Tasks

- Site UUID
- Site State
- Metadata File

Commit

```
feat(site): implement site metadata
```

---

### Site State Manager

Tasks

- Created
- Setup Required
- Ready
- Running
- Error

Commit

```
feat(site): implement lifecycle state manager
```

---

## Phase 2

### Shared Setup Module

Tasks

- Setup Service
- Shared UI
- Shared Logic

Commit

```
feat(setup): create shared setup module
```

---

### Environment Checker

Tasks

- PHP
- Extensions
- Permission
- Storage
- Cache

Commit

```
feat(setup): implement environment checker
```

---

### Browser Wizard

Tasks

- Welcome
- Source
- Theme
- Plugin
- Finish

Commit

```
feat(ui): implement setup wizard
```

---

### CLI Wizard

Tasks

- Interactive Setup

Commit

```
feat(cli): implement site setup command
```

---

## Phase 3

### Plugin Discovery

Tasks

- Ping API
- Version Check

Commit

```
feat(source): implement plugin discovery
```

---

### Source Registration

Tasks

- Register
- Secret
- UUID
- Webhook

Commit

```
feat(source): implement registration service
```

---

### Disconnect

Commit

```
feat(source): implement disconnect endpoint
```

---

### Test Connection

Commit

```
feat(source): implement connection testing
```

---

## Phase 4

### Webhook Gateway

Tasks

- UUID Routing
- Authentication
- Signature Verify

Commit

```
feat(webhook): create webhook gateway
```

---

### Dispatcher

Tasks

- Route Site
- Push Queue

Commit

```
feat(webhook): implement dispatcher
```

---

### Queue

Tasks

- Queue
- Retry
- Worker

Commit

```
feat(queue): implement webhook queue
```

---

## Phase 5

### First Build

Tasks

- Generate Config
- Trigger Build
- Validate

Commit

```
feat(build): trigger first build after setup
```

---

### Final Validation

Tasks

- Health Check
- Ready State

Commit

```
feat(setup): finalize provisioning
```

---

# 13. Commit Convention

Mọi Commit phải theo Conventional Commit.

Ví dụ:

```
feat(...)
fix(...)
refactor(...)
perf(...)
test(...)
docs(...)
chore(...)
```

Không Commit nhiều tính năng lớn trong một Commit.

Một Commit chỉ giải quyết một vấn đề.

---

# 14. Definition of Done

Một Sprint chỉ được coi là hoàn thành khi đạt toàn bộ điều kiện sau.

## Architecture

- Shared Infrastructure không bị vi phạm.
- Site Isolation không bị vi phạm.
- Không có Cross-Site Coupling.

---

## Code

- Coding Standard.
- Unit Test.
- Integration Test.
- Không có Hardcode.

---

## Site

- Site hoạt động độc lập.
- Không đọc dữ liệu Site khác.
- Không ghi Cache Site khác.
- Không ghi Log Site khác.

---

## Setup

- Browser Setup hoạt động.
- CLI Setup hoạt động.
- Dùng chung Setup Service.

---

## Source

- Plugin Discovery hoạt động.
- Registration hoạt động.
- Disconnect hoạt động.
- Test Connection hoạt động.

---

## Webhook

- UUID Routing.
- Signature Verification.
- Dispatcher.
- Queue.
- Worker.

---

## Build

- First Build thành công.
- Build Output đúng thư mục:

```
public/dist
```

---

## Documentation

Hoàn thành:

- Sprint Documentation
- Developer Documentation
- User Documentation

---

## Audit

Sprint phải vượt qua:

- Architecture Audit
- Code Review
- Security Review
- Production Review

trước khi Merge.

---

# 15. Development Workflow

Tất cả Sprint phải tuân thủ quy trình sau.

```
Planning

↓

Architecture Review

↓

Implementation

↓

Internal Test

↓

Audit

↓

Fix

↓

Review

↓

Merge

↓

Documentation

↓

Close Sprint
```

Không bỏ qua bất kỳ bước nào.

---

# 16. Long-term Goals

Sau khi hoàn thành Roadmap, WPSC sẽ có đầy đủ các khả năng sau:

- Quản lý nhiều Site trên cùng một Workspace.
- Chia sẻ Theme, Plugin và Source Adapter.
- Mỗi Site hoạt động hoàn toàn độc lập.
- Setup bằng Browser hoặc CLI.
- Kết nối Source tự động.
- Webhook Gateway dùng chung.
- Build và Deploy Production.
- Mở rộng dễ dàng sang nhiều nguồn dữ liệu khác nhau.
- Thương mại hóa như một nền tảng quản lý Static Website.

---

---

# Architecture Freeze Statement

Architecture v2.01 Final freezes Vision, Site Lifecycle, Site Runtime layer,
ownership boundaries, extension points and public contracts. Future work must
extend these contracts compatibly. Any change to the core philosophy or a
cross-boundary responsibility requires an approved Architecture Decision Record
(ADR).

**End of WPSC Architecture v2.01 Final**
