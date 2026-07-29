import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSiteMetadata, { SiteState } from "../site/createSiteMetadata.js";

export const SITE_RUNTIME_VERSION = "1.0";

export const SITE_RUNTIME_INDEX_PHP = `<?php
// WPSC Site Runtime front controller: prefer generated static pages, then proxy Runtime routes.
$publicDir = __DIR__;
$distDir = $publicDir . '/dist';
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$requestPath = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (($method === 'GET' || $method === 'HEAD') && is_dir($distDir)) {
    $relativePath = trim($requestPath, '/');
    $candidates = $relativePath === ''
        ? [$distDir . '/index.html']
        : [$distDir . '/' . $relativePath, $distDir . '/' . $relativePath . '/index.html'];
    $realDistDir = realpath($distDir);
    foreach ($candidates as $candidate) {
        $realCandidate = realpath($candidate);
        if ($realDistDir !== false && $realCandidate !== false && str_starts_with($realCandidate, $realDistDir . DIRECTORY_SEPARATOR) && is_file($realCandidate)) {
            $extension = strtolower(pathinfo($realCandidate, PATHINFO_EXTENSION));
            $mimeTypes = [
                'avif' => 'image/avif',
                'css' => 'text/css; charset=utf-8',
                'gif' => 'image/gif',
                'html' => 'text/html; charset=utf-8',
                'ico' => 'image/x-icon',
                'jpeg' => 'image/jpeg',
                'jpg' => 'image/jpeg',
                'js' => 'text/javascript; charset=utf-8',
                'json' => 'application/json; charset=utf-8',
                'png' => 'image/png',
                'svg' => 'image/svg+xml',
                'webp' => 'image/webp',
                'xml' => 'application/xml; charset=utf-8'
            ];
            if (isset($mimeTypes[$extension])) header('Content-Type: ' . $mimeTypes[$extension]);
            if ($method === 'GET') readfile($realCandidate);
            exit;
        }
    }

    // Keep Runtime APIs dynamic, but serve Builder V1's branded static 404 for unknown public URLs.
    $isRuntimeEndpoint = preg_match('#^/(api/|dashboard(?:/|$)|installer(?:/|$)|webhook/)#', $requestPath) === 1;
    $notFoundPath = realpath($distDir . '/404.html');
    if (!$isRuntimeEndpoint && $realDistDir !== false && $notFoundPath !== false && str_starts_with($notFoundPath, $realDistDir . DIRECTORY_SEPARATOR) && is_file($notFoundPath)) {
        http_response_code(404);
        header('Content-Type: text/html; charset=utf-8');
        if ($method === 'GET') readfile($notFoundPath);
        exit;
    }
}

$runtimeOrigin = rtrim((string) ($_SERVER['WPSC_RUNTIME_ORIGIN'] ?? getenv('WPSC_RUNTIME_ORIGIN')), '/');
if ($runtimeOrigin === '') {
    http_response_code(503);
    exit('WPSC Runtime origin is not configured.');
}
$body = file_get_contents('php://input');
$headers = [];
if (isset($_SERVER['HTTP_HOST'])) {
    $headers[] = 'Host: ' . $_SERVER['HTTP_HOST'];
}
if (isset($_SERVER['CONTENT_TYPE'])) {
    $headers[] = 'Content-Type: ' . $_SERVER['CONTENT_TYPE'];
}
if (isset($_SERVER['HTTP_COOKIE'])) {
    $headers[] = 'Cookie: ' . $_SERVER['HTTP_COOKIE'];
}
$context = stream_context_create(['http' => [
    'method' => $method,
    'content' => $body,
    'header' => implode("\\r\\n", $headers),
    'ignore_errors' => true,
    'timeout' => 30
]]);
$response = @file_get_contents($runtimeOrigin . $requestUri, false, $context);
if ($response === false) {
    http_response_code(502);
    exit('WPSC Runtime is unavailable.');
}
foreach ($http_response_header ?? [] as $index => $header) {
    if ($index === 0 && preg_match('/^HTTP\\/\\S+\\s+(\\d{3})/', $header, $matches)) {
        http_response_code((int) $matches[1]);
        continue;
    }
    if (stripos($header, 'Content-Type:') === 0) {
        header($header, true);
    }
    if (stripos($header, 'Set-Cookie:') === 0) {
        header($header, false);
    }
}
echo $response;
`;

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export function createInstallationCheck(repository) {
  if (!repository || typeof repository.readMetadata !== "function") throw new TypeError("Installation Check requires a Site Repository.");
  return {
    async check(siteId) {
      try {
        const metadata = await repository.readMetadata(siteId);
        const installed = ![SiteState.CREATED, SiteState.SETUP_REQUIRED].includes(metadata.status);
        return { diagnostics: { errors: [], warnings: [] }, installed, metadata, ok: true };
      } catch (error) {
        return { diagnostics: { errors: [diagnostic("runtime.installation.metadata.unavailable", error.message)], warnings: [] }, installed: false, ok: false };
      }
    }
  };
}

export function createSiteResolver(options = {}) {
  const domains = options.domains || {};
  return {
    resolve(host) {
      const siteId = domains[String(host || "").toLowerCase()];
      if (!siteId) return { diagnostics: { errors: [diagnostic("runtime.site.not_found", "No site is configured for this domain.")], warnings: [] }, ok: false };
      return { diagnostics: { errors: [], warnings: [] }, ok: true, siteId };
    }
  };
}

export default function createSiteRuntime(options = {}) {
  const installationCheck = options.installationCheck;
  const siteResolver = options.siteResolver;
  if (!installationCheck || typeof installationCheck.check !== "function" || !siteResolver || typeof siteResolver.resolve !== "function") throw new TypeError("Site Runtime requires Site Resolver and Installation Check.");
  return {
    async handle(request = {}) {
      const resolved = siteResolver.resolve(request.host);
      if (!resolved.ok) return { ...resolved, route: "not-found" };
      const installation = await installationCheck.check(resolved.siteId);
      if (!installation.ok) return { ...installation, route: "error", siteId: resolved.siteId };
      return { diagnostics: installation.diagnostics, metadata: installation.metadata, ok: true, route: installation.installed ? "dashboard" : "installer", siteId: resolved.siteId };
    },
    version: SITE_RUNTIME_VERSION
  };
}

export async function createSiteRuntimeEntryPoint(repository, siteId) {
  if (!repository || typeof repository.resolveSiteRoot !== "function") throw new TypeError("Site Runtime entry point requires a Site Repository.");
  const publicDir = path.join(repository.resolveSiteRoot(siteId), "public");
  await mkdir(publicDir, { recursive: true });
  const indexPath = path.join(publicDir, "index.php");
  await writeFile(indexPath, SITE_RUNTIME_INDEX_PHP, "utf8");
  return { indexPath, publicDir };
}

export async function createSiteRuntimeSkeleton(options = {}) {
  const repository = options.repository;
  const siteId = String(options.siteId || "").trim();
  if (!repository || typeof repository.resolveSiteRoot !== "function" || typeof repository.writeMetadata !== "function") throw new TypeError("Site Runtime Skeleton requires a Site Repository.");
  const root = repository.resolveSiteRoot(siteId);
  await mkdir(path.join(root, "storage"), { recursive: true });
  const metadata = createSiteMetadata({ name: siteId, now: options.now, status: SiteState.SETUP_REQUIRED, uuid: options.uuid });
  await repository.writeMetadata(siteId, metadata);
  const entryPoint = await createSiteRuntimeEntryPoint(repository, siteId);
  return { ...entryPoint, metadata, siteRoot: root };
}
