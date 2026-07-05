import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import createLayoutDocument from "../createLayoutDocument.js";

export default function createLayoutRevisionStore(options = {}) {
  const baseDir = options.baseDir;

  if (typeof baseDir !== "string" || baseDir.trim() === "") {
    throw new TypeError("Layout revision store requires baseDir.");
  }

  return {
    async listRevisions(layoutId) {
      const record = await readRecord(baseDir, layoutId);
      return record.revisions;
    },
    async load(layoutId) {
      return readRecord(baseDir, layoutId);
    },
    async saveDraft(layout) {
      const document = createLayoutDocument(layout);
      const current = await readRecord(baseDir, document.id);
      const revision = createRevision(document, {
        status: "draft"
      });
      const record = {
        ...current,
        draft: document,
        id: document.id,
        revisions: [...current.revisions, revision],
        updatedAt: revision.createdAt
      };

      await writeRecord(baseDir, record);

      return {
        record,
        revision
      };
    },
    async publish(layoutId) {
      const current = await readRecord(baseDir, layoutId);

      if (!current.draft) {
        throw new Error(`Layout "${layoutId}" has no draft to publish.`);
      }

      const revision = createRevision(current.draft, {
        status: "published"
      });
      const record = {
        ...current,
        published: current.draft,
        publishedAt: revision.createdAt,
        revisions: [...current.revisions, revision],
        updatedAt: revision.createdAt
      };

      await writeRecord(baseDir, record);

      return {
        record,
        revision
      };
    }
  };
}

async function readRecord(baseDir, layoutId) {
  try {
    return normalizeRecord(JSON.parse(await readFile(resolveRecordPath(baseDir, layoutId), "utf8")), layoutId);
  } catch {
    return normalizeRecord({}, layoutId);
  }
}

async function writeRecord(baseDir, record) {
  const filePath = resolveRecordPath(baseDir, record.id);

  await mkdir(path.dirname(filePath), {
    recursive: true
  });
  await writeFile(filePath, `${JSON.stringify(record, null, 2)}\n`, "utf8");
}

function normalizeRecord(record, layoutId) {
  return {
    draft: record.draft ?? null,
    id: record.id ?? layoutId,
    published: record.published ?? null,
    publishedAt: record.publishedAt ?? null,
    revisions: Array.isArray(record.revisions) ? record.revisions : [],
    updatedAt: record.updatedAt ?? null
  };
}

function createRevision(layout, options = {}) {
  const createdAt = new Date().toISOString();

  return {
    createdAt,
    layout,
    revisionId: `${layout.id}-${Date.now()}`,
    status: options.status
  };
}

function resolveRecordPath(baseDir, layoutId) {
  return path.join(baseDir, `${safeFilename(layoutId)}.json`);
}

function safeFilename(value) {
  return String(value ?? "layout").replaceAll(/[^a-z0-9._-]+/gi, "-").replace(/^-|-$/g, "") || "layout";
}
