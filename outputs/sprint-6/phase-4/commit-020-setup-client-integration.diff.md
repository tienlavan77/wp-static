# Sprint 6 - Phase 4
# Commit 020 - Setup Client Integration

Status: Implemented

## Scope

Connect the existing Source Registration and Webhook Activation services to the
official Setup Service boundary. This commit does not modify adapter contracts,
registration internals, webhook internals, or retry policy.

## Flow

```text
Browser -> Setup REST API -> Setup Service -> Registration / Webhook services
CLI -----------------------> Setup Service -> Registration / Webhook services
```

## Behavior

- `SetupService.registerSource(sessionId, input)` owns orchestration and uses the
  session site id rather than trusting a client supplied site id.
- The service advances its own state machine to `REGISTERING_SOURCE`; neither
  Browser nor CLI contains a transition table or state enum.
- Registration is always called first. Webhook activation is called only when a
  webhook URL is supplied.
- The action leaves the session at `REGISTERING_SOURCE`. Commit 021 owns the
  `READY_FOR_FIRST_BUILD` decision and transition.
- Browser submits generic source fields through the REST gateway and renders
  returned diagnostics unchanged.
- The CLI invokes Setup Service directly and never constructs or calls Setup REST.

## Verification

```text
31 focused tests passed, including C17-C20 regression coverage.
```
