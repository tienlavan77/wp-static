import assert from "node:assert/strict";
import test from "node:test";
import createRealVpsAcceptanceProbes, { isRealVpsAcceptanceProbe } from "../framework/src/product/installer/createRealVpsAcceptanceProbes.js";

test("C048 real probes execute global wpsc, verify exact systemd identity and request Runtime plus domain", async () => {
  const commands = [];
  const requests = [];
  const workspace = "/home/data/sites/wp-static";
  const execFile = async (executable, args) => {
    commands.push([executable, args]);
    if (executable === "/usr/local/bin/wpsc") return { stderr: "", stdout: "1.0.0\n" };
    if (executable === "systemctl") return { stderr: "", stdout: `ActiveState=active\nUser=www-data\nGroup=www-data\nExecStart=${workspace}/runtime/node/bin/node ${workspace}/core/active/framework/src/cli/index.js runtime:serve\n` };
    if (executable === "nginx") return { stderr: "", stdout: "syntax is ok\n" };
    throw new Error("unexpected command");
  };
  const fetch = async (url, options) => { requests.push([String(url), options]); return { status: 200 }; };
  const probes = createRealVpsAcceptanceProbes({ domain: "shop.example.com", execFile, fetch, installationId: "production", runtimeUrl: "http://127.0.0.1:8787/health", workspace });
  for (const probe of Object.values(probes)) assert.equal(isRealVpsAcceptanceProbe(probe), true);
  assert.equal((await probes["global-command"]()).version, "1.0.0");
  const systemd = await probes.systemd();
  assert.equal(systemd.ok, true);
  assert.equal(systemd.user, "www-data");
  assert.equal(systemd.group, "www-data");
  assert.equal((await probes.runtime()).ok, true);
  const nginx = await probes.nginx();
  assert.equal(nginx.ok, true);
  assert.equal(nginx.domain, "shop.example.com");
  assert.deepEqual(commands[0], ["/usr/local/bin/wpsc", ["--installation", "production", "--version"]]);
  assert.ok(commands.some(([command, args]) => command === "nginx" && args[0] === "-t"));
  assert.deepEqual(requests.map(([url]) => url), ["http://127.0.0.1:8787/health", "https://shop.example.com/"]);
});

test("C048 systemd probe rejects the wrong user, Node or active-Core command", async () => {
  const probes = createRealVpsAcceptanceProbes({
    domain: "shop.example.com",
    execFile: async (executable) => executable === "systemctl" ? { stdout: "ActiveState=active\nUser=root\nGroup=root\nExecStart=/usr/bin/node /tmp/cli.js\n" } : { stdout: "ok\n" },
    fetch: async () => ({ status: 200 }),
    installationId: "production",
    runtimeUrl: "http://127.0.0.1:8787/health",
    workspace: "/home/data/sites/wp-static"
  });
  assert.equal((await probes.systemd()).ok, false);
});
