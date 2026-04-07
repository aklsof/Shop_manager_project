import { promises as fs } from 'fs';
import path from 'path';

/**
 * Cache directory resolution:
 * - Netlify / AWS Lambda serverless: the working directory is READ-ONLY.
 *   We fall back to /tmp which is always writable in serverless runtimes.
 * - Render (Node.js server) / local dev: use the normal .cache dir inside cwd.
 *
 * The CACHE_WRITABLE_DIR is resolved lazily so we can test /tmp at runtime.
 */
const CWD_CACHE_DIR = path.join(process.cwd(), '.cache');
const TMP_CACHE_DIR = path.join('/tmp', 'aklsof-cache');

// Detect a read-only working directory (Netlify, AWS Lambda, etc.)
let _resolvedCacheDir: string | null = null;
async function getCacheDir(): Promise<string> {
  if (_resolvedCacheDir) return _resolvedCacheDir;
  try {
    await fs.mkdir(CWD_CACHE_DIR, { recursive: true });
    // Quick write test
    const testFile = path.join(CWD_CACHE_DIR, '.write_test');
    await fs.writeFile(testFile, '1', 'utf-8');
    await fs.unlink(testFile);
    _resolvedCacheDir = CWD_CACHE_DIR;
  } catch {
    // Read-only FS (Netlify) — use /tmp instead
    try {
      await fs.mkdir(TMP_CACHE_DIR, { recursive: true });
    } catch { /* /tmp always exists */ }
    _resolvedCacheDir = TMP_CACHE_DIR;
  }
  return _resolvedCacheDir;
}

async function getCachePath(key: string): Promise<string> {
  const dir = await getCacheDir();
  const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(dir, `${safeKey}.json`);
}

export async function readJsonCache<T>(key: string): Promise<T | null> {
  const filePath = await getCachePath(key);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Write JSON to the cache.  Errors are swallowed silently so a read-only
 * filesystem (Netlify) never prevents the caller from returning fresh data.
 */
export async function writeJsonCache<T>(key: string, data: T): Promise<void> {
  try {
    const filePath = await getCachePath(key);
    const tempPath = `${filePath}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data), 'utf-8');
    await fs.rename(tempPath, filePath);
  } catch (err) {
    // Non-fatal: log and continue — the caller still has fresh data from MySQL.
    console.warn('[jsonCache] write skipped (read-only FS?):', (err as Error).message);
  }
}

export function isEmptyCacheData(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

/**
 * Try the cache first, then fall back to MySQL via `loader`.
 * The write-back is best-effort: if it fails the fresh data is still returned.
 */
export async function getCacheFirst<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = await readJsonCache<T>(key);
  if (!isEmptyCacheData(cached)) {
    return cached as T;
  }

  const fresh = await loader();
  // writeJsonCache is non-throwing — failure is logged but does not propagate.
  await writeJsonCache(key, fresh);
  return fresh;
}
