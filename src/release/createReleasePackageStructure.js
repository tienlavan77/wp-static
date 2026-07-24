export const RELEASE_PACKAGE_STRUCTURE_VERSION = "1.0";

export const RELEASE_PACKAGE_DIRECTORIES = [
  "public",
  "themes",
  "plugins",
  "storage",
  "storage/cache",
  "storage/logs",
  "storage/reports",
  "config",
  "installer",
  "vendor"
];

export const RELEASE_PACKAGE_FILES = [
  {
    contents: "<?php\nrequire __DIR__ . '/installer/bootstrap.php';\n",
    path: "index.php",
    purpose: "Front controller for production hosting."
  },
  {
    contents: "<?php\n// WPSC installer bootstrap placeholder.\n",
    path: "installer/bootstrap.php",
    purpose: "Installer bootstrap entry for Commit 002 HTTP Installer."
  },
  {
    contents: "{\n  \"installed\": false\n}\n",
    path: "config/install-state.json",
    purpose: "Installation state placeholder before install.lock exists."
  },
  {
    contents: "# WPSC Release Package\n\nUpload this directory to hosting, point the domain to `public`, then open `/install`.\n",
    path: "README.md",
    purpose: "Release package instructions."
  }
];

function normalizeMode(mode) {
  return mode === "shared-hosting" ? "shared-hosting" : "vps";
}

export default function createReleasePackageStructure(options = {}) {
  const mode = normalizeMode(options.mode);
  const packageName = options.packageName || "wpsc-release";

  return {
    directories: [...RELEASE_PACKAGE_DIRECTORIES],
    files: RELEASE_PACKAGE_FILES.map((file) => ({ ...file })),
    immutable: {
      mayCreate: [
        "config/runtime.json",
        "config/project.json",
        "config/install.lock",
        "storage/reports/install-report.md",
        "public build output",
        "runtime metadata"
      ],
      mustNotModify: [
        "themes",
        "plugins",
        "vendor framework source",
        "release assets"
      ]
    },
    mode,
    packageName,
    publicRoot: "public",
    version: RELEASE_PACKAGE_STRUCTURE_VERSION
  };
}
