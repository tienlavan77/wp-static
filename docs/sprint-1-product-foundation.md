# WPSC Sprint 1 - Product Foundation Specification

Version: `1.0`

Status: `Ready for Development`

Prerequisite: `Sprint 0 Architecture Freeze Completed`

## Objective

Sprint 1 marks the transition of WPSC from a framework into a product.

After Sprint 0, the core architecture has been frozen:

- Architecture Boundary
- Dependency Rules
- Public Contracts
- ADR
- Architecture Freeze Checklist

Sprint 1 must not change the frozen Sprint 0 architecture decisions.

All Sprint 1 work must focus on:

- Product Experience
- Developer Experience
- Installation
- Validation
- Bootstrap
- Diagnostics

## Sprint Goal

By the end of Sprint 1:

> A developer who has never used WPSC must be able to install the framework,
> connect it to WordPress, and create the first website without reading source
> code.

This is the main KPI of Sprint 1.

## Architecture Constraints

Sprint 1 must not:

- Change Architecture Boundary
- Change Public Contracts
- Change Runtime Boundary
- Change Normalize Layer
- Change Compiler Pipeline
- Add a new subsystem

If any of those changes are needed, a new ADR is required first.

## Sprint Scope

Sprint 1 includes 5 main workstreams:

1. Install Wizard
2. Environment Validation
3. WPSC Doctor
4. Configuration Validation
5. Project Scaffold

## 1. Install Wizard

### Objective

Create the first installation flow for WPSC.

Users should not need to manually configure many files.

### Installation Flow

```text
Welcome
-> Environment Check
-> Output Directory
-> Connect WordPress
-> Verify REST API
-> Verify WooCommerce
-> Select Theme
-> Configure Runtime
-> Configure Domain
-> Generate Configuration
-> Initial Build
-> Health Check
-> Done
```

### Automatically Generate

The Install Wizard must generate required configuration files:

- `.env`
- `wpsc.config.js`
- `runtime.config.js`

## 2. Environment Validation

WPSC must validate:

- PHP Version
- Node Version
- Required Extensions
- Folder Permission
- SSL
- REST API
- Runtime
- Output Folder

If an issue is detected, WPSC must explain the cause and suggest a fix. It must
not show only a raw stack trace.

## 3. WPSC Doctor

CLI:

```bash
wpsc doctor
```

Doctor must check at least:

- Environment
- Runtime
- Theme
- Adapter
- Compiler
- Build Engine
- Cache
- Webhook
- Images
- SEO
- Output

Doctor must classify results:

- OK
- Warning
- Error

Each issue needs explanatory detail.

## 4. Configuration Validation

CLI:

```bash
wpsc validate
```

Validation must check:

- Config Syntax
- Theme
- Runtime
- Adapter
- Route
- Output
- Build Configuration

Goal:

Prevent errors before build.

## 5. Project Scaffold

CLI:

```bash
npx create-wpsc
```

Starter templates:

- Commerce
- Catalog
- Blog
- Corporate
- Blank

Scaffold must create a standard project structure. Users should not need to
copy the sample project manually.

## Installation Report

After a successful install, WPSC should create:

```text
install-report.md
```

Report contents:

- Environment
- Runtime
- Theme
- Initial Build
- Warnings
- Errors

This report helps support and diagnostics.

## Developer Experience

Sprint 1 must prioritize:

- Clear error messages.
- Concrete fix guidance.
- Minimal manual configuration.
- Memorable CLI.
- Consistent installation experience.

## Non Goals

Sprint 1 does not include:

- AI Builder
- Visual Builder
- Theme Marketplace
- Plugin Marketplace
- Multi Adapter
- Cloud Dashboard
- Multi Tenant
- New Runtime Features

No unrelated feature should be added during Sprint 1.

## Definition Of Done

Sprint 1 is done only when:

- Install Wizard works.
- Environment Validation is complete.
- WPSC Doctor works.
- Config Validation works.
- Project Scaffold works.
- Initial Build succeeds.
- Architecture Freeze is not violated.
- Basic installation documentation exists.

## Expected Deliverables

Sprint 1 must deliver:

- Install Wizard
- Environment Validation
- WPSC Doctor
- Config Validator
- Project Scaffold
- Installation Report
- Installation Documentation

## Success Criteria

Sprint 1 succeeds when:

- A new developer can install WPSC quickly.
- The developer does not need to hand-edit many config files.
- WPSC can detect environment issues before build.
- WPSC can initialize a new project through CLI.
- WPSC can quickly diagnose common errors.

## Engineering Principle

Sprint 1 is not for adding many features.

Sprint 1 improves WPSC as a product.

Every decision should prioritize:

- Stability
- Simplicity
- Predictability
- Developer Experience
- Production Readiness

instead of extra features.

## Final Statement

Sprint 0 defined WPSC architecture.

Sprint 1 must prove that architecture can be used easily in practice.

The goal is not more code.

The goal is:

> Move WPSC closer to a framework that any developer can install, use, and
> deploy with confidence.

