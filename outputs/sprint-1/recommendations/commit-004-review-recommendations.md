# WPSC Sprint 1 - Commit 004 Review Recommendations

**Version:** 1.0  
**Sprint:** Sprint 1 - Product Foundation  
**Related Commit:** Commit 004 - Config Validation Command  
**Status:** Architecture Recommendations (Non-blocking)

## Summary

Commit 004 is approved. The next improvements should grow the validation foundation without changing the architecture frozen in Sprint 0.

## Recommendations

1. **Validation Profiles**
   - Add `wpsc validate --profile development`, `--profile production`, and `--profile ci`.
   - Development should stay fast.
   - Production and CI should run stricter checks.

2. **Standard CLI Exit Codes**
   - `0`: success.
   - `1`: validation failed.
   - `2`: internal error.

3. **Stable Validation Error Codes**
   - Add machine-readable identifiers such as `ENV_NODE_VERSION`, `CONFIG_SYNTAX_ERROR`, `THEME_LAYOUT_MISSING`, and `OUTPUT_DIRECTORY_NOT_WRITABLE`.

4. **Incremental Validation**
   - Allow validation by subsystem:
     - `wpsc validate theme`
     - `wpsc validate runtime`
     - `wpsc validate adapter`
     - `wpsc validate output`

5. **Validation Report Generation**
   - Add report export:
     - `wpsc validate --report validation-report.md`
     - `wpsc validate --report validation.json`

6. **Validation Pipeline Integration**
   - Build should run validation before compiling.
   - Critical validation errors should block build.

7. **Shared Validation Contract**
   - Install Wizard, Doctor, Validate, Build Pipeline, GUI Installer, and future Cloud Dashboard should reuse the same validation engine.
   - Validation rules must not be duplicated.

8. **Validation Rule Registry**
   - As the validation system grows, organize rules by subsystem.

9. **Validation Documentation**
   - Add dedicated validation docs later:
     - `docs/validation/error-codes.md`
     - `docs/validation/validation-profiles.md`
     - `docs/validation/cli-reference.md`
     - `docs/validation/doctor-reference.md`

## Priority

| Recommendation | Priority |
| --- | --- |
| Standard CLI Exit Codes | High |
| Stable Validation Error Codes | High |
| Validation Pipeline Integration | High |
| Shared Validation Contract | High |
| Validation Profiles | Medium |
| Incremental Validation | Medium |
| Validation Report Generation | Medium |
| Validation Rule Registry | Low |
| Validation Documentation | Low |

## Decision

Carry these recommendations into future Sprint 1 commits. Commit 005 should focus on Install Wizard skeleton and configuration generation, while reusing the validation foundation instead of duplicating validation logic.
