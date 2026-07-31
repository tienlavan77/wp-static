# Scheduler Infrastructure Layout

```text
scheduler/
  policy/       Scheduler tick, trigger evaluation, retry and enqueue policy
  queue/        Pending/running/finished jobs and legacy rebuild serialization
  dispatcher/   Job claim and Build Engine invocation
  contracts/    Job and Scheduler state/event contracts
```

Browser, CLI and Webhook remain gateways. They submit requests to Scheduler and
do not own queue lifecycle, dispatching, retry policy or Build execution.
