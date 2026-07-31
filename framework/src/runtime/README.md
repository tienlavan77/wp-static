# Runtime Module Layout

Runtime modules are organized by Runtime ownership only:

```text
bootstrap/  Runtime composition, configuration, Site entry and HTTP server
router/     Runtime request routing
installer/  Browser installation controller
dashboard/  Dashboard and first-build controllers
source/     Runtime-only content reading and credential access
webhook/    Runtime webhook registration and receipt
account/    Customer account flow
commerce/   Customer commerce gateway and services
api/        Runtime HTTP response helpers
browser/    Runtime browser views and enhanced navigation
```

`framework/src/source/`, `framework/src/webhook/`, `framework/src/api/`, and
other Framework domains remain outside this folder when they provide a Setup,
Scheduler, Builder, or shared Framework contract. Runtime consumes those
contracts; it does not take ownership of them.
