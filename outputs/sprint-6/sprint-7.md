# Sprint 7 — CMS Runtime
## Implementation Roadmap

Version: 1.0

Status: Planned

Architecture Baseline:
- Architecture-v2.01 Final
- Project Layout Freeze

---

# Sprint Goal

Transform the existing Site Runtime into a complete CMS Runtime.

This sprint delivers all core website authoring capabilities while preserving the Runtime Platform established in Sprint 6.

No Commerce.
No Production Operations.
No Product Release work.

---

# Phase 1

## CMS Runtime Foundation

### Goal

Introduce the CMS Runtime layer on top of the existing Runtime.

### Commit 001

CMS Runtime

↓

Runtime Context

↓

CMS Services

↓

CMS Contracts

↓

CMS Composition Root

---

Definition of Done

- CMS Runtime bootstrapped
- Runtime ownership unchanged
- Existing Runtime APIs continue working
- No Builder changes

---

# Phase 2

## Page Management

### Goal

Implement Page management.

### Commit 002

Pages

↓

CRUD

↓

Draft

↓

Publish

↓

Delete

↓

Revision Metadata

---

Definition of Done

- Page lifecycle implemented
- Publish workflow available
- Runtime integration completed

---

# Phase 3

## Post Management

### Goal

Implement Blog Post management.

### Commit 003

Posts

↓

CRUD

↓

Categories

↓

Tags

↓

Draft

↓

Publish

↓

Archive

---

Definition of Done

- Complete Post lifecycle
- Taxonomy support
- Publishing integrated

---

# Phase 4

## Media Library

### Goal

Implement Runtime Media Library.

### Commit 004

Media

↓

Upload

↓

Storage

↓

Metadata

↓

Selection

↓

Usage

---

Definition of Done

- Media Library operational
- Runtime storage integrated
- Builder consumes Media correctly

---

# Phase 5

## Navigation

### Goal

Implement Menu management.

### Commit 005

Menus

↓

Navigation Tree

↓

Ordering

↓

Hierarchy

↓

Theme Integration

---

Definition of Done

- Navigation editor completed
- Theme receives menu structure

---

# Phase 6

## Routing & Search

### Goal

Implement Runtime Routing.

### Commit 006

Routing

↓

Permalink

↓

URL Resolution

↓

Search Index

↓

Search Runtime

---

Definition of Done

- Runtime routing completed
- Search available
- Builder consumes routing correctly

---

# Phase 7

## Theme Composition

### Goal

Compose Runtime Content into Themes.

### Commit 007

Theme Composition

↓

Templates

↓

Layout

↓

Sections

↓

Rendering Context

---

Definition of Done

- Theme composition completed
- Runtime → Builder composition stable

---

# Phase 8

## Publishing Workflow

### Goal

Complete Publishing lifecycle.

### Commit 008

Draft

↓

Review

↓

Publish

↓

Republish

↓

Unpublish

↓

Build Trigger

---

Definition of Done

- Publishing lifecycle completed
- Scheduler integration working
- Builder trigger validated

---

# Phase 9

## Site Configuration Management

### Goal

Implement Runtime Site Configuration.

### Commit 009

Site Settings

↓

General

↓

Reading

↓

Writing

↓

Permalinks

↓

Localization

↓

Theme Settings

---

Definition of Done

- Site configuration isolated per Runtime
- Settings persisted correctly
- Runtime configuration management completed

---

# Phase 10

## CMS Runtime Freeze

### Goal

Freeze CMS Runtime.

### Commit 010

Architecture Audit

↓

Ownership Audit

↓

Runtime Validation

↓

Publishing Validation

↓

Builder Validation

↓

CMS Runtime Freeze

---

Definition of Done

- CMS Runtime complete
- Architecture unchanged
- Runtime contracts frozen
- Sprint 7 completed

---

# Sprint Deliverables

✓ CMS Runtime

✓ Pages

✓ Posts

✓ Media Library

✓ Menus

✓ Routing

✓ Search

✓ Theme Composition

✓ Publishing Workflow

✓ Site Configuration Management

↓

CMS Runtime Complete

---

# Out of Scope

The following belong to Sprint 8 or later:

- WooCommerce
- Customer Account
- Cart
- Checkout
- Forms
- Advanced SEO
- Cache
- Extensions
- Multi-site
- Backup
- Monitoring
- Deployment