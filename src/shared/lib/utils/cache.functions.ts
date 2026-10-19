import LZString from "lz-string";

// ============================================================================
// Cache front-end : mémoire (Map) + persistance localStorage (LZString)
// TTL, nettoyage auto, lecture-rapide sans écriture parasite
// ============================================================================

interface CacheItem<T> {
  value: T;
  expiry: number; // timestamp ms
}

const PREFIX = "values_cached_";
const memoryCache = new Map<string, CacheItem<unknown>>();
const CLEANUP_INTERVAL_MS = 60_000;

const buildKey = (key: string) => `${PREFIX}${key}`;

const isExpired = (item: CacheItem<unknown>) => Date.now() >= item.expiry;

// ============================================================================
// API publique
// ============================================================================

/**
 * Stocke une valeur (mémoire + localStorage compressé).
 * @param ttlMs  Durée de vie en ms (défaut : 5 min)
 */
export function setCache<T>(key: string, value: T, ttlMs = 5 * 60_000): void {
  const fullKey = buildKey(key);
  const item: CacheItem<T> = { value, expiry: Date.now() + ttlMs };

  try {
    localStorage.setItem(fullKey, LZString.compressToUTF16(JSON.stringify(item)));
  } catch {
    // Quota dépassé — le cache mémoire reste disponible
  }

  memoryCache.set(fullKey, item as CacheItem<unknown>);
}

/**
 * Récupère une valeur depuis le cache (mémoire → localStorage).
 * @param resetTTL  Si true, repart pour un TTL complet à chaque lecture (défaut : false)
 * @returns La valeur, ou null si absente / expirée
 */
export function getCache<T>(key: string, resetTTL = false): T | null {
  const fullKey = buildKey(key);

  // 1) Cache mémoire
  const mem = memoryCache.get(fullKey);
  if (mem) {
    if (!isExpired(mem)) {
      if (resetTTL) setCache(key, mem.value as T);
      return mem.value as T;
    }
    memoryCache.delete(fullKey);
  }

  // 2) Fallback localStorage
  try {
    const raw = localStorage.getItem(fullKey);
    if (!raw) return null;

    const decompressed = LZString.decompressFromUTF16(raw);
    if (!decompressed) {
      localStorage.removeItem(fullKey);
      return null;
    }

    const parsed = JSON.parse(decompressed) as CacheItem<T>;
    if (isExpired(parsed)) {
      localStorage.removeItem(fullKey);
      return null;
    }

    if (resetTTL) {
      setCache(key, parsed.value); // nouveau TTL + réécrit mémoire + LS
    } else {
      memoryCache.set(fullKey, parsed as CacheItem<unknown>);
    }

    return parsed.value;
  } catch {
    localStorage.removeItem(fullKey);
    return null;
  }
}

/**
 * Vérifie si une clé est présente et non expirée.
 */
export const hasCache = (key: string): boolean => getCache(key) !== null;

/**
 * Supprime une entrée (avec clé) ou tout le cache (sans clé).
 */
export function clearCache(key?: string): void {
  if (key) {
    const fullKey = buildKey(key);
    memoryCache.delete(fullKey);
    localStorage.removeItem(fullKey);
  } else {
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith(PREFIX)) localStorage.removeItem(k);
    }
    memoryCache.clear();
  }
}

// ============================================================================
// Nettoyage automatique (mémoire + localStorage)
// ============================================================================

function cleanExpired(): void {
  const now = Date.now();

  for (const [key, item] of memoryCache) {
    if (item.expiry <= now) memoryCache.delete(key);
  }

  for (const key of Object.keys(localStorage)) {
    if (!key.startsWith(PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { localStorage.removeItem(key); continue; }

      const decompressed = LZString.decompressFromUTF16(raw);
      if (!decompressed) { localStorage.removeItem(key); continue; }

      const { expiry } = JSON.parse(decompressed) as CacheItem<unknown>;
      if (expiry <= now) localStorage.removeItem(key);
    } catch {
      localStorage.removeItem(key);
    }
  }
}

setInterval(cleanExpired, CLEANUP_INTERVAL_MS);

export const forceCleanExpiredCache = cleanExpired;
