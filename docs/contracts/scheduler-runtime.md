# Scheduler Runtime Contract

Scheduler owns `STOPPED`, `RUNNING`, and `PAUSED`, evaluates due schedules and
retry eligibility, and queues Jobs through injected Queue/Dispatcher contracts.
It does not call Build Engine directly or inspect Build diagnostics.

Site Locks protect concurrent enqueue operations; Queue remains the durable
one-active-job-per-site authority. Retry policy belongs here, never in Build
Engine or Dispatcher.
