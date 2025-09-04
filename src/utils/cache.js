/**
 * Simple caching layer for generated quests.
 * MVP: In-memory using NodeCache.
 * Production: Swap to Redis for multi-instance deployments.
 */

const NodeCache = require("node-cache");

// Default TTL = 6 hours, adjust as needed
const cache = new NodeCache({ stdTTL: 21600 });

/**
 * Save value in cache
 */
function setCache(key, value, ttlSeconds = 21600) {
  return cache.set(key, value, ttlSeconds);
}

/**
 * Get value from cache
 */
function getCache(key) {
  return cache.get(key);
}

/**
 * Ensure quest is cached, otherwise store it
 */
function ensureCache(key, generatorFn, ttlSeconds = 21600) {
  const cached = cache.get(key);
  if (cached) return cached;

  const value = generatorFn();
  cache.set(key, value, ttlSeconds);
  return value;
}

/**
 * Delete from cache
 */
function deleteCache(key) {
  return cache.del(key);
}

module.exports = {
  setCache,
  getCache,
  ensureCache,
  deleteCache,
};