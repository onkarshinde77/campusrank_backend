// server/src/middleware/cacheMiddleware.js
import { getCache, setCache, deleteCache, clearCachePattern, isRedisConnected } from '../utils/cache.js';

// Middleware to get cached data
export const getCacheMiddleware = (keyGenerator) => {
  return async (req, res, next) => {
    if (!isRedisConnected()) {
      return next();
    }

    try {
      const cacheKey = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;
      const cachedData = await getCache(cacheKey);

      if (cachedData) {
        console.log(`Cache hit: ${cacheKey}`);
        return res.json(cachedData);
      }

      // Store cache key in request for later use
      req.cacheKey = cacheKey;
      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
};

// Middleware to set cache after successful response
export const setCacheMiddleware = (expiresIn = 300) => {
  return async (req, res, next) => {
    if (!isRedisConnected() || !req.cacheKey) {
      return next();
    }

    // Override json() to cache response
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      if (res.statusCode === 200) {
        setCache(req.cacheKey, expiresIn, data).catch((error) => {
          console.error('Error setting cache:', error);
        });
      }
      return originalJson(data);
    };

    next();
  };
};

// Invalidate cache patterns
export const invalidateCache = async (patterns) => {
  if (!isRedisConnected()) return false;

  try {
    const patternArray = Array.isArray(patterns) ? patterns : [patterns];
    
    for (const pattern of patternArray) {
      await clearCachePattern(pattern);
      console.log(`Cache invalidated: ${pattern}`);
    }
    
    return true;
  } catch (error) {
    console.error('Cache invalidation error:', error);
    return false;
  }
};

export default {
  getCacheMiddleware,
  setCacheMiddleware,
  invalidateCache
};
