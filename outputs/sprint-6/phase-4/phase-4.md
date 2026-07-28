# Sprint 6 – Phase 4
# Source Registration, Webhook Activation & First Build Preparation

Version: 1.0
Status: Planning
Architecture: WPSC v2

---

# Goal

Phase 4 hoàn thiện bước cuối của quá trình Setup.

Sau khi Setup Service hoàn tất, Site vẫn chưa thể hoạt động.

Phase 4 chịu trách nhiệm:

- Đăng ký Source
- Kích hoạt Webhook
- Kiểm tra khả năng kết nối
- Chuẩn bị Build đầu tiên (First Build Ready)

Phase 4 KHÔNG thực hiện Build.

Build thuộc Sprint tiếp theo.

---

# Architecture Principle

Giữ nguyên kiến trúc đã thống nhất.

Provisioning Foundation

↓

Setup Service

↓

Source Registration

↓

Webhook Activation

↓

First Build Ready

↓

Browser / CLI

Browser và CLI chỉ điều khiển Setup Service.

Không được gọi trực tiếp Source Adapter.

---

# Responsibilities

## Setup Service

- điều phối workflow
- gọi Source Adapter
- lưu Source Metadata
- kích hoạt Webhook
- kiểm tra kết nối

Không biết chi tiết từng Source.

---

## Source Adapter

Mỗi nguồn dữ liệu tự triển khai:

- authenticate
- validate
- register webhook
- unregister webhook
- health check

Ví dụ:

- WordPress
- Shopify
- Ghost
- Headless CMS
- REST API

Mỗi Adapter chỉ biết Source của mình.

---

## Browser

Browser chỉ:

- nhập thông tin Source
- hiển thị trạng thái
- hiển thị lỗi

Không validate nghiệp vụ.

---

## CLI

CLI chỉ:

- nhận tham số
- gọi Setup Service
- hiển thị kết quả

Không xử lý Source.

---

# Source Registration Workflow

START

↓

User chọn Source

↓

Load Adapter

↓

Validate Credentials

↓

Connection Test

↓

Persist Source Metadata

↓

Register Webhook

↓

Webhook Verification

↓

Ready For First Build

↓

FINISHED

---

# Adapter Principle

Framework chỉ biết:

Source Adapter Interface

Không biết:

WordPress

Shopify

Ghost

...

Mọi Source đều phải triển khai cùng Interface.

---

# Adapter Contract

Mỗi Adapter bắt buộc có:

initialize()

validate()

healthCheck()

registerWebhook()

unregisterWebhook()

getMetadata()

Không được tự ghi Config.

---

# Webhook Principle

Webhook không thuộc Browser.

Webhook không thuộc CLI.

Webhook thuộc Setup Service.

Workflow:

Setup Service

↓

Source Adapter

↓

Webhook Registration

↓

Receive Webhook ID

↓

Persist Metadata

---

# Webhook Identity

Webhook ID được cấp bởi Source.

Framework chỉ lưu:

- webhookId
- webhookStatus
- registeredAt

Không lưu Secret của Source nếu không cần.

---

# Source Metadata

Mỗi Site lưu:

config/source.json

Ví dụ:

- source type
- endpoint
- webhook id
- adapter version

Không lưu Runtime State.

---

# Connection Validation

Setup Service phải kiểm tra:

✓ Credential

✓ Endpoint

✓ Permission

✓ Webhook Capability

✓ Build Capability

Chỉ khi tất cả PASS mới được:

Ready For First Build

---

# First Build Ready

Phase 4 chỉ tạo trạng thái:

READY_FOR_FIRST_BUILD

Không thực hiện Build.

Build Engine thuộc Sprint sau.

---

# Events

Source Registration

source.validated

source.connected

source.failed

Webhook

webhook.registered

webhook.failed

webhook.removed

Workflow

setup.readyForFirstBuild

---

# Directory Structure

Framework

src/

setup/

source/

webhook/

Sites

site-a/

config/

source.json

storage/

public/

Không tạo Source Logic trong Browser.

---

# Commit Plan

## Commit 017

source: introduce Source Adapter contract

Nội dung

- Adapter Interface
- Source Registry
- Adapter Loader

Không có WordPress.

---

## Commit 018

source: implement registration workflow

Nội dung

- Registration Service
- Validation
- Metadata Persistence

Chưa có Webhook.

---

## Commit 019

webhook: implement webhook activation

Nội dung

- Register
- Remove
- Verify
- Metadata

Chưa Build.

---

## Commit 020

setup: integrate Source Registration

Nội dung

- Setup Service Integration
- Browser
- CLI

Không thay đổi Provisioning.

---

## Commit 021

setup: implement Ready For First Build

Nội dung

- Final Validation
- Ready State
- Events

Không Build.

---

## Commit 022

docs: finalize Source Registration architecture

Nội dung

- Audit
- Contracts
- Documentation
- Closeout Phase 4

---

# Definition of Done

Phase 4 hoàn thành khi:

✓ Source Adapter Contract hoàn chỉnh

✓ Source Registry hoạt động

✓ Browser đăng ký Source được

✓ CLI đăng ký Source được

✓ Webhook kích hoạt được

✓ Source Metadata được lưu

✓ Site đạt trạng thái Ready For First Build

✓ Có Documentation

✓ Có Test

---

# Non Goals

Phase 4 KHÔNG làm:

- Static Build
- Scheduler
- Incremental Build
- Deploy
- CDN
- Cache
- Runtime Sync

Các nội dung trên thuộc Sprint tiếp theo.

---

# Core Rule

Business Logic của Source Registration và Webhook chỉ tồn tại trong Setup Service và Source Adapter.

Browser và CLI chỉ là client.

Không được để bất kỳ Source-specific logic nào xuất hiện trong Browser, CLI hoặc REST.

Mọi Source mới phải được bổ sung bằng Adapter mới, không được sửa Setup Service để hỗ trợ riêng từng nền tảng.