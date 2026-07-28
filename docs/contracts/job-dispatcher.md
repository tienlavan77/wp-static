# Job Dispatcher Contract

Job Dispatcher claims one pending Job from Queue, invokes an injected Build
Engine `build()` boundary, and asks Queue to record an immutable terminal Job
snapshot. Dispatcher does not implement Build workflow or access Content,
Theme, or Output components.

Dispatcher emits `job.started`, `job.completed`, or `job.failed`. Build Engine
continues to own its independent `build.*` events and Build Result.
