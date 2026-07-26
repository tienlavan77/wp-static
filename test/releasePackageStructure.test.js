import assert from "node:assert/strict";
import test from "node:test";
import createReleasePackageStructure, {
  RELEASE_PACKAGE_DIRECTORIES,
  RELEASE_PACKAGE_FILES,
  RELEASE_PACKAGE_STRUCTURE_VERSION
} from "../src/release/createReleasePackageStructure.js";

test("createReleasePackageStructure defines stable release layout", () => {
  const structure = createReleasePackageStructure({
    packageName: "store-release"
  });

  assert.equal(structure.version, RELEASE_PACKAGE_STRUCTURE_VERSION);
  assert.equal(structure.packageName, "store-release");
  assert.equal(structure.mode, "vps");
  assert.equal(structure.publicRoot, "public");
  assert.deepEqual(structure.directories, RELEASE_PACKAGE_DIRECTORIES);
  assert.equal(structure.directories.includes("installer"), true);
  assert.equal(structure.directories.includes("config"), true);
  assert.equal(structure.directories.includes("storage/reports"), true);
});

test("createReleasePackageStructure includes release bootstrap files", () => {
  const structure = createReleasePackageStructure();

  assert.deepEqual(
    structure.files.map((file) => file.path),
    RELEASE_PACKAGE_FILES.map((file) => file.path)
  );
  assert.match(
    structure.files.find((file) => file.path === "public/index.php").contents,
    /config\/install\.lock/
  );
  assert.match(
    structure.files.find((file) => file.path === "public/index.php").contents,
    /installer\/setup\.php/
  );
  assert.match(
    structure.files.find((file) => file.path === "installer/bootstrap.php").contents,
    /data-wpsc-already-installed/
  );
  assert.match(
    structure.files.find((file) => file.path === "installer/setup.php").contents,
    /data-wpsc-setup-fallback/
  );
  assert.match(
    structure.files.find((file) => file.path === "config/install-state.json").contents,
    /"installed": false/
  );
});

test("createReleasePackageStructure documents immutable release policy", () => {
  const structure = createReleasePackageStructure({
    mode: "shared-hosting"
  });

  assert.equal(structure.mode, "shared-hosting");
  assert.equal(structure.immutable.mayCreate.includes("config/install.lock"), true);
  assert.equal(structure.immutable.mustNotModify.includes("themes"), true);
  assert.equal(structure.immutable.mustNotModify.includes("plugins"), true);
});
