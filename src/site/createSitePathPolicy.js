import path from "node:path";

function assertInside(root, target) {
  const relative = path.relative(root, target);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return target;
  }

  throw new Error(`Path is outside the allowed site root: ${target}`);
}

export default function createSitePathPolicy(options = {}) {
  const siteRoot = path.resolve(options.siteRoot || process.cwd());

  function resolve(...segments) {
    return assertInside(siteRoot, path.resolve(siteRoot, ...segments));
  }

  function assertAllowed(targetPath) {
    return assertInside(siteRoot, path.resolve(targetPath));
  }

  function isAllowed(targetPath) {
    try {
      assertAllowed(targetPath);
      return true;
    } catch {
      return false;
    }
  }

  return {
    assertAllowed,
    isAllowed,
    resolve,
    siteRoot
  };
}
