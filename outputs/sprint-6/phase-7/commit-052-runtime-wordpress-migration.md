# Commit 052 - Runtime WordPress Migration

`wpsc runtime:configure-wordpress` safely backs up the old Runtime config,
installs the WordPress provider configuration, and creates a private ignored
credentials file. `runtime:serve` loads that file automatically.
