/**
 * Universal API Fetch Utility for J-Control
 *
 * Handles:
 * - API requests via shared axios instance
 * - Pagination response normalization (Laravel { data, meta, links })
 * - Plain array responses
 * - Error handling (returns empty array, logs error)
 * - In-memory caching for faster navigation
 */

import api from '../api/axios';

/** In-memory cache: key -> { data, meta, timestamp } */
const cache = new Map();

/** Default cache TTL in ms (2 minutes) */
const CACHE_TTL = 2 * 60 * 1000;

/**
 * Extract records array from API response.
 * Handles: { data: [] }, plain array, or unexpected shapes.
 * @param {*} response - Raw response body (axios response.data)
 * @returns {Array} - Always returns an array
 */
export function extractData(response) {
    if (!response) return [];
    if (Array.isArray(response)) return response;
    if (response && typeof response === 'object' && Array.isArray(response.data)) {
        return response.data;
    }
    return [];
}

/**
 * Extract pagination meta from API response.
 * @param {*} response - Raw response body
 * @returns {Object|null} - { total, current_page, last_page, per_page } or null
 */
export function extractMeta(response) {
    if (!response || typeof response !== 'object' || !response.meta) return null;
    const m = response.meta;
    return {
        total: m.total,
        current_page: m.current_page,
        last_page: m.last_page,
        per_page: m.per_page,
    };
}

/**
 * Normalize list API response to consistent shape.
 * @param {*} response - Raw response body
 * @returns {{ data: Array, meta: Object|null }}
 */
export function normalizeListResponse(response) {
    const data = extractData(response);
    const meta = extractMeta(response);
    return { data, meta };
}

/**
 * Generate cache key from url and params
 */
function getCacheKey(url, params = {}) {
    const paramStr = JSON.stringify(params || {});
    return `${url}::${paramStr}`;
}

/**
 * Check if cached entry is still valid
 */
function isCacheValid(entry) {
    if (!entry || !entry.timestamp) return false;
    return Date.now() - entry.timestamp < CACHE_TTL;
}

/**
 * Fetch list data from API with normalization and optional caching.
 *
 * @param {string} url - API endpoint (e.g. '/clients', '/invoices')
 * @param {Object} [options]
 * @param {Object} [options.params] - Query params
 * @param {boolean} [options.useCache=true] - Use in-memory cache
 * @param {boolean} [options.backgroundRefresh=true] - If cache hit, still refresh in background
 * @returns {Promise<{ data: Array, meta: Object|null }>}
 */
export async function apiFetchList(url, options = {}) {
    const { params = {}, useCache = true, backgroundRefresh = true } = options;
    const cacheKey = getCacheKey(url, params);

    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached && isCacheValid(cached)) {
            if (backgroundRefresh) {
                api.get(url, { params })
                    .then((res) => {
                        const normalized = normalizeListResponse(res.data);
                        cache.set(cacheKey, {
                            ...normalized,
                            timestamp: Date.now(),
                        });
                    })
                    .catch(() => {});
            }
            return Promise.resolve({ data: cached.data, meta: cached.meta });
        }
    }

    try {
        const response = await api.get(url, { params });
        const normalized = normalizeListResponse(response.data);
        if (useCache) {
            cache.set(cacheKey, {
                ...normalized,
                timestamp: Date.now(),
            });
        }
        return normalized;
    } catch (error) {
        console.error(`[apiFetch] Failed to fetch ${url}:`, error?.response?.data || error.message);
        return { data: [], meta: null };
    }
}

/**
 * Fetch single resource or non-list endpoint.
 * Returns raw response.data - caller handles structure.
 *
 * @param {string} url - API endpoint
 * @param {Object} [options]
 * @param {Object} [options.params] - Query params
 * @returns {Promise<*>} - response.data or null on error
 */
export async function apiFetch(url, options = {}) {
    const { params = {} } = options;
    try {
        const response = await api.get(url, { params });
        return response.data;
    } catch (error) {
        console.error(`[apiFetch] Failed to fetch ${url}:`, error?.response?.data || error.message);
        return null;
    }
}

/**
 * Invalidate cache for a URL pattern (e.g. '/clients' invalidates all client list caches).
 * Call after create/update/delete to ensure fresh data on next visit.
 */
export function invalidateCache(urlPattern) {
    if (!urlPattern) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.startsWith(urlPattern)) {
            cache.delete(key);
        }
    }
}

/**
 * Clear entire cache (e.g. on logout)
 */
export function clearCache() {
    cache.clear();
}
