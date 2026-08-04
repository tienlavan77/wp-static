import { chmod, mkdir, open, rename, rm } from "node:fs/promises";
import path from "node:path";

export default function createGlobalWpscCommandService(options = {}) {
  const commandPath = path.resolve(options.commandPath ?? "/usr/local/bin/wpsc");
  const renameCommand = options.renameCommand ?? rename;
  async function render(input = {}) {
    const registry = input.registry;
    if (registry?.schema !== "wpsc.installation-registry" || registry.schemaVersion !== 1) throw new TypeError("Installation registry is invalid.");
    const mappings = Object.entries(registry.installations ?? {}).sort(([a], [b]) => a.localeCompare(b));
    if (mappings.length === 0) throw new TypeError("At least one Installation is required for the global command.");
    const cases = mappings.map(([id, value]) => `  ${shellWord(id)}) workspace=${shellQuote(path.resolve(value.workspace))} ;;`).join("\n");
    const defaultId = registry.defaultInstallation ? shellQuote(registry.defaultInstallation) : "''";
    return `#!/bin/sh
set -eu

installation=${defaultId}
case "\${1-}" in
  --installation)
    [ "$#" -ge 2 ] || { echo "wpsc: --installation requires a value" >&2; exit 2; }
    installation=$2
    shift 2
    ;;
  --installation=*)
    installation=\${1#--installation=}
    shift
    ;;
esac

[ -n "$installation" ] || { echo "wpsc: installation selection required" >&2; exit 2; }
case "$installation" in
${cases}
  *) echo "wpsc: installation '$installation' is not registered" >&2; exit 2 ;;
esac

node="$workspace/runtime/node/bin/node"
cli="$workspace/core/active/framework/src/cli/index.js"
[ -d "$workspace" ] || { echo "wpsc: Installation workspace is missing: $workspace" >&2; exit 1; }
workspace_real=$(CDPATH= cd -P -- "$workspace" && pwd -P)
node_dir_real=$(CDPATH= cd -P -- "$workspace/runtime/node/bin" 2>/dev/null && pwd -P) || { echo "wpsc: Installation Node directory is invalid" >&2; exit 1; }
cli_dir_real=$(CDPATH= cd -P -- "$workspace/core/active/framework/src/cli" 2>/dev/null && pwd -P) || { echo "wpsc: active Core CLI directory is invalid" >&2; exit 1; }
case "$node_dir_real/" in "$workspace_real/"*) ;; *) echo "wpsc: Installation Node escapes workspace" >&2; exit 1 ;; esac
case "$cli_dir_real/" in "$workspace_real/"*) ;; *) echo "wpsc: active Core CLI escapes workspace" >&2; exit 1 ;; esac
[ ! -L "$node" ] || { echo "wpsc: Installation Node must not be a symlink" >&2; exit 1; }
[ ! -L "$cli" ] || { echo "wpsc: active Core CLI must not be a symlink" >&2; exit 1; }
[ -x "$node" ] || { echo "wpsc: Installation Node is missing or not executable: $node" >&2; exit 1; }
[ -f "$cli" ] || { echo "wpsc: active Core CLI is missing: $cli" >&2; exit 1; }
export WPSC_INSTALLATION_ID="$installation"
export WPSC_INSTALLATION_ROOT="$workspace"
export WPSC_INSTALLATION_NODE="$node"
exec "$node" "$cli" "$@"
`;
  }
  async function install(input = {}) {
    const content = await render(input);
    const temporary = `${commandPath}.${process.pid}.tmp`;
    await mkdir(path.dirname(commandPath), { recursive: true });
    await rm(temporary, { force: true });
    const handle = await open(temporary, "wx", 0o755);
    try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); }
    await chmod(temporary, 0o755);
    try { await renameCommand(temporary, commandPath); }
    catch (error) { await rm(temporary, { force: true }); throw error; }
    const directory = await open(path.dirname(commandPath), "r");
    try { await directory.sync(); } finally { await directory.close(); }
    return Object.freeze({ commandPath, installed: true, ok: true });
  }
  return Object.freeze({ install, render });
}

function shellQuote(value) { return `'${String(value).replaceAll("'", `'"'"'`)}'`; }
function shellWord(value) { const id = String(value); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Installation id is unsafe for the global command."); return id; }
