# Environment Report Contract

## Purpose

`validateProvisioningEnvironment()` produces the shared environment report
consumed by Provisioning today and by the Setup Service, Browser Wizard, CLI,
and Dashboard in later phases.

## Shape

```json
{
  "ok": false,
  "version": "1.0",
  "summary": {
    "error": 1,
    "ok": 1,
    "total": 2,
    "warning": 0
  },
  "diagnostics": {
    "errors": [
      {
        "code": "provision.environment.environment.node.js.20",
        "message": "Node.js is unsupported.",
        "severity": "error"
      }
    ],
    "warnings": []
  }
}
```

Every reported check has at least `code`, `message`, and `severity`.
`severity` is one of `info`, `warning`, or `error`. `category`, `detail`,
`fix`, `name`, and `status` are supplied where available for CLI and diagnostic
detail. `status` remains a compatibility field from shared validation
primitives; UI consumers should use `severity`.

## Invariants

- `ok` is false if any check has severity `error`.
- Provisioning must stop before directory creation or metadata writes when
  `ok` is false.
- Consumers render the report; they must not recreate or reinterpret its
  checks independently.

## Future Extensions

`checkedAt` is intentionally omitted because reports are currently evaluated
and consumed in-process. If reports are persisted, add an ISO-8601 `checkedAt`
timestamp in a versioned contract update.
