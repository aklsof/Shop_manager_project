import { promises as fs } from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), '.cache');

function getCachePath(key: string): string {
  const safeKey = key.replace(/[^a-zA-Z0-9._-]/g, '_');
  return path.join(CACHE_DIR, `${safeKey}.json`);
}

async function ensureCacheDir(): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
}

export async function readJsonCache<T>(key: string): Promise<T | null> {
  const filePath = getCachePath(key);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    if (!raw.trim()) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function writeJsonCache<T>(key: string, data: T): Promise<void> {
  await ensureCacheDir();
  const filePath = getCachePath(key);
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data), 'utf-8');
  await fs.rename(tempPath, filePath);
}

export function isEmptyCacheData(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length === 0;
  return false;
}

export async function getCacheFirst<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const cached = await readJsonCache<T>(key);
  if (!isEmptyCacheData(cached)) {
    return cached as T;
  }

  const fresh = await loader();
  await writeJsonCache(key, fresh);
  return fresh;
}
