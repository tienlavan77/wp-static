# Runtime Composition Contract

The Site PHP front controller is a thin Domain entry point. It proxies requests
to the Node Runtime origin configured by `WPSC_RUNTIME_ORIGIN`; it does not
implement Setup, Scheduler, or Build logic.

Node Runtime Composition constructs one Site Runtime instance with shared Site
Repository, Setup Service, Site State Manager, Installation Check, Site Resolver,
Installer Controller, and Dashboard Controller. HTTP routing is intentionally
deferred to Commit 044.
