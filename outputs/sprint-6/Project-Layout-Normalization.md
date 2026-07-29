# Project Layout Normalization
## (Post Sprint 6)

Version: 1.0

Status: Required

Purpose

Normalize Project Layout to match Architecture-v2.

No feature.
No business logic.
No architecture changes.

Only:

- Directory Layout
- Namespace
- Module Ownership
- Workspace Organization

---

# Phase 1

Workspace Normalization

Goal

Normalize top-level workspace.

Commit 001

Workspace

↓

Source

↓

Runtime

↓

Documentation

↓

Tooling

↓

Examples

↓

Infrastructure

---

# Phase 2

Framework Source Normalization

Goal

Normalize src/ ownership.

Commit 002

Site

↓

Provision

↓

Setup

↓

Runtime

↓

Scheduler

↓

Build

↓

Builder

↓

Output

↓

Shared

---

# Phase 3

Runtime Module Normalization

Goal

Normalize Runtime internal layout.

Commit 003

Runtime

↓

Bootstrap

↓

Router

↓

Installer

↓

Dashboard

↓

Source

↓

Webhook

↓

Account

↓

Commerce

↓

API

---

# Phase 4

Builder Normalization

Goal

Normalize Builder ownership.

Commit 004

Builder

↓

Templates

↓

Renderer

↓

Assets

↓

SEO

↓

Manifest

↓

Fragments

↓

Search

↓

Output

---

# Phase 5

Infrastructure Normalization

Goal

Normalize infrastructure modules.

Commit 005

Scheduler

↓

Queue

↓

Dispatcher

↓

Jobs

↓

Workers

↓

Contracts

---

# Phase 6

Project Material Normalization

Goal

Separate Product Material from Framework Source.

Commit 006

Docs

↓

Outputs

↓

RFCs

↓

Templates

↓

Examples

↓

Release Assets

---

# Phase 7

Theme & Integration Normalization

Goal

Normalize Theme and Bridge ownership.

Commit 007

Themes

↓

Storefront

↓

Components

↓

Layouts

↓

Assets

↓

Public

↓

WordPress Bridges

↓

Auth Bridge

↓

Webhook Bridge

↓

Mail Bridge

---

# Phase 8

CLI & Tooling Normalization

Goal

Normalize developer tooling.

Commit 008

CLI

↓

Commands

↓

Composition

↓

Scripts

↓

Packages

↓

Development Tools

---

# Phase 9

Test Normalization

Goal

Normalize testing structure.

Commit 009

Unit

↓

Integration

↓

Runtime

↓

Builder

↓

Fixtures

↓

E2E

---

# Phase 10

Final Validation

Goal

Freeze Project Layout.

Commit 010

Ownership Audit

↓

Namespace Audit

↓

Import Audit

↓

Dependency Audit

↓

Architecture Validation

↓

Project Layout Freeze

---

# Definition of Done

✓ No business logic changes

✓ No Architecture changes

✓ No Runtime behavior changes

✓ No Builder behavior changes

✓ No Scheduler behavior changes

✓ Folder Ownership = Architecture Ownership

✓ Namespace = Folder

✓ Import graph remains valid

✓ Dependency graph unchanged

✓ Project Layout reflects Architecture-v2

↓

Project Layout Freeze