// server/src/utils/cache.js
import redis from 'redis';
import { promisify } from 'util';

let redisClient;
let isConnected = false;

export const initializeRedis = async () => {
  try {
    redisClient = redis.createClient({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: 0,
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          console.log('Redis connection refused - caching disabled');
          isConnected = false;
          return undefined;
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          return undefined;
        }
        if (options.attempt > 10) {
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('✓ Redis connected');
      isConnected = true;
    });

    redisClient.on('reconnecting', () => {
      console.log('Reconnecting to Redis...');
    });

    return new Promise((resolve, reject) => {
      redisClient.ping((err, reply) => {
        if (err) {
          console.warn('Redis not available - caching will be disabled');
          isConnected = false;
          resolve(false);
        } else {
          isConnected = true;
          console.log('✓ Redis is available');
          resolve(true);
        }
      });
    });
  } catch (error) {
    console.warn('Failed to initialize Redis:', error.message);
    isConnected = false;
    return false;
  }
};

export const getCache = (key) => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !redisClient) {
      resolve(null);
      return;
    }

    redisClient.get(key, (err, data) => {
      if (err) {
        console.error('Cache get error:', err);
        resolve(null);
      } else {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch {
          resolve(null);
        }
      }
    });
  });
};

export const setCache = (key, expiresIn, value) => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !redisClient) {
      resolve(false);
      return;
    }

    redisClient.setex(key, expiresIn, JSON.stringify(value), (err) => {
      if (err) {
        console.error('Cache set error:', err);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};

export const deleteCache = (key) => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !redisClient) {
      resolve(false);
      return;
    }

    redisClient.del(key, (err, reply) => {
      if (err) {
        console.error('Cache delete error:', err);
        resolve(false);
      } else {
        resolve(reply > 0);
      }
    });
  });
};

export const clearCachePattern = (pattern) => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !redisClient) {
      resolve(false);
      return;
    }

    redisClient.keys(pattern, (err, keys) => {
      if (err) {
        console.error('Cache pattern error:', err);
        resolve(false);
        return;
      }

      if (keys.length === 0) {
        resolve(true);
        return;
      }

      redisClient.del(keys, (err, reply) => {
        if (err) {
          console.error('Cache delete pattern error:', err);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  });
};

export const flushAllCache = () => {
  return new Promise((resolve, reject) => {
    if (!isConnected || !redisClient) {
      resolve(false);
      return;
    }

    redisClient.flushdb((err) => {
      if (err) {
        console.error('Cache flush error:', err);
        resolve(false);
      } else {
        console.log('Cache flushed');
        resolve(true);
      }
    });
  });
};

export const isRedisConnected = () => isConnected;

export default {
  initializeRedis,
  getCache,
  setCache,
  deleteCache,
  clearCachePattern,
  flushAllCache,
  isRedisConnected
};
