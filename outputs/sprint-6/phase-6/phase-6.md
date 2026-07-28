# Sprint 6 – Phase 6
# Scheduler, Build Automation & Job Execution

Version: 1.0
Status: Planning
Architecture: WPSC v2

---

# Goal

Phase 6 xây dựng lớp Automation cho WPSC.

Sau Phase 5:

READY_FOR_FIRST_BUILD

↓

Build Engine

đã hoàn chỉnh.

Phase 6 bổ sung khả năng:

- Scheduled Build
- Manual Queue
- Automatic Build
- Build Trigger
- Job Execution

Build Engine không thay đổi.

Scheduler chỉ điều phối việc gọi Build Engine.

---

# Core Principle

Scheduler KHÔNG Build.

Scheduler chỉ quyết định:

- khi nào Build
- Site nào Build
- Build bao nhiêu lần

Build Engine vẫn là Owner.

---

# Architecture

Scheduler

↓

Build Queue

↓

Job Dispatcher

↓

Build Engine

↓

Static Website

Scheduler không:

- đọc Source
- Render Theme
- ghi Output

---

# Responsibilities

## Scheduler

Chịu trách nhiệm:

- Cron
- Interval
- Trigger
- Queue Job

Không Build.

---

## Build Queue

Quản lý:

- Pending
- Running
- Finished
- Failed

Không biết Build Logic.

---

## Dispatcher

Dispatcher nhận Job.

↓

gọi

↓

Build Engine

Dispatcher không Render.

---

## Build Engine

Không thay đổi.

Tiếp tục là Owner của:

- Lifecycle
- Result
- Diagnostics

---

# Scheduler Workflow

Scheduler Tick

↓

Find Due Jobs

↓

Create Job

↓

Queue

↓

Dispatcher

↓

Build Engine

↓

Complete

---

# Trigger Types

Manual

Browser

CLI

Webhook

Schedule

Future:

API

---

# Job Lifecycle

QUEUED

↓

RUNNING

↓

SUCCESS

FAILED

CANCELLED

Build State vẫn:

IDLE

↓

BUILDING

↓

SUCCESS

FAILED

Không trộn hai State Machine.

---

# Scheduler State

Scheduler có State riêng:

STOPPED

↓

RUNNING

↓

PAUSED

Scheduler State không liên quan Build State.

---

# Queue Principle

Một Site:

chỉ có một Build Job chạy cùng lúc.

Ví dụ:

✓

Site A

Running

Site B

Running

Site C

Queued

✗

Site A

Running

Site A

Running

---

# Lock Principle

Scheduler phải có:

Site Lock

Build Lock

để tránh:

Double Build

---

# Retry Principle

Nếu Build Failed:

Scheduler có thể Retry.

Retry không nằm trong Build Engine.

---

# Job Metadata

Mỗi Job có:

Job ID

Site ID

Trigger Type

Created Time

Started Time

Finished Time

Duration

Status

Diagnostics

---

# Event Namespace

scheduler.started

scheduler.stopped

scheduler.tick

job.queued

job.started

job.completed

job.failed

Không dùng:

build.*

Build vẫn phát event riêng.

---

# Browser Integration

Browser có thể:

Build Now

↓

Scheduler

↓

Queue Job

↓

Build Engine

Không gọi Build Engine trực tiếp.

---

# CLI Integration

CLI:

wpsc build site-a

↓

Scheduler

↓

Queue

↓

Build Engine

CLI không tự Build.

---

# Webhook Integration

Webhook

↓

Scheduler

↓

Queue

↓

Build Engine

Webhook không gọi Build Engine trực tiếp.

---

# Extension Point

Scheduler hỗ trợ:

Custom Trigger

Custom Queue

Custom Dispatcher

Thông qua Plugin.

Không sửa Scheduler.

---

# Directory Structure

Framework

src/

scheduler/

queue/

dispatcher/

Sites

sites/

site-a/

public/

storage/

config/

---

# Commit Plan

---

## Commit 030

scheduler: introduce Scheduler contracts

Goal

Định nghĩa Scheduler.

Nội dung

- Scheduler Interface
- Job Interface
- Queue Interface
- Dispatcher Interface
- Event Namespace

Không chạy Job.

---

## Commit 031

scheduler: implement Job Queue

Goal

Xây Queue.

Nội dung

- Queue
- Pending
- Running
- Finished
- Failed

Chưa Dispatcher.

---

## Commit 032

scheduler: implement Dispatcher

Goal

Dispatcher.

Nội dung

- Dispatch Job
- Execute Job
- Call Build Engine

Không Cron.

---

## Commit 033

scheduler: implement Scheduler

Goal

Scheduler.

Nội dung

- Tick
- Schedule
- Trigger
- Retry
- Lock

---

## Commit 034

scheduler: integrate Browser CLI Webhook

Goal

Kết nối Trigger.

Nội dung

Browser

↓

Queue

CLI

↓

Queue

Webhook

↓

Queue

↓

Dispatcher

↓

Build Engine

---

## Commit 035

scheduler: finalize Scheduler architecture

Goal

Closeout.

Nội dung

- Audit
- Documentation
- Boundary
- Contracts
- Architecture Freeze

---

# Definition of Done

Phase 6 hoàn thành khi:

✓ Scheduler hoạt động

✓ Queue hoạt động

✓ Dispatcher hoạt động

✓ Browser Build sử dụng Scheduler

✓ CLI Build sử dụng Scheduler

✓ Webhook Build sử dụng Scheduler

✓ Build Lock hoạt động

✓ Retry hoạt động

✓ Event đầy đủ

✓ Documentation hoàn chỉnh

---

# Non Goals

Phase 6 KHÔNG triển khai:

- Incremental Build
- Dependency Graph
- Cache
- Preview
- Deployment
- CDN
- Distributed Queue
- Multi-thread Build

---

# Core Rule

Build Engine vẫn là Business Owner của Build.

Scheduler chỉ điều phối.

Queue chỉ quản lý Job.

Dispatcher chỉ gọi Build Engine.

Không thành phần nào ngoài Build Engine được phép điều khiển Build Workflow.

Mọi Trigger (Browser, CLI, Webhook, Cron) đều phải đi qua Scheduler trước khi đến Build Engine.