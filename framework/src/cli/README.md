# Framework CLI

`framework/src/cli/index.js` is the canonical WPSC CLI entry point. Command
modules compose Framework services and remain thin: they do not duplicate
Runtime, Setup, Scheduler or Build business logic.

The root `package.json` `bin` and npm scripts deliberately point here.
