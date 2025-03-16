// src/utils/redis-cache.ts
import Redis from 'ioredis';
import type { Request, Response, NextFunction } from 'express';

// Redis client type
let redisClient: Redis | null = null;

// Create Redis client and handle reconnection
const getRedisClient = (): Redis | null => {
  if (redisClient) return redisClient;
  
  // Update this to use localhost since your app is outside Docker
  // but Redis is inside Docker
  const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
  console.log(`Attempting to connect to Redis at: ${REDIS_URL}`);
  
  try {
    redisClient = new Redis(REDIS_URL, {
      retryStrategy: (times: number): number => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Redis reconnecting in ${delay}ms...`);
        return delay;
      },
      // Set a connection timeout
      connectTimeout: 10000,
    });
    
    redisClient.on('error', (err: Error) => {
      console.error('Redis connection error:', err);
    });
    
    redisClient.on('connect', () => {
      console.log('Connected to Redis successfully');
    });
    
    return redisClient;
  } catch (error) {
    console.error('Redis initialization error:', error);
    return null;
  }
};

// Get data from cache
export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const client = getRedisClient();
    if (!client) return null;
    
    const data = await client.get(key);
    return data ? JSON.parse(data) as T : null;
  } catch (error) {
    console.error(`Error getting cache for key ${key}:`, error);
    return null;
  }
};

// Set data in cache
export const setCache = async <T>(key: string, data: T, expiryInSeconds = 300): Promise<boolean> => {
  try {
    const client = getRedisClient();
    console.log('client', client);
    if (!client) return false;
    
    await client.set(key, JSON.stringify(data), 'EX', expiryInSeconds);
    return true;
  } catch (error) {
    console.error(`Error setting cache for key ${key}:`, error);
    return false;
  }
};

// Delete cache for a specific key
export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    const client = getRedisClient();
    if (!client) return false;
    
    await client.del(key);
    return true;
  } catch (error) {
    console.error(`Error deleting cache for key ${key}:`, error);
    return false;
  }
};

// Delete cache keys by pattern
export const deleteCacheByPattern = async (pattern: string): Promise<boolean> => {
  try {
    const client = getRedisClient();
    console.log('client', client);
    if (!client) return false;
    
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`Deleted ${keys.length} cache keys matching pattern: ${pattern}`);
    }
    return true;
  } catch (error) {
    console.error(`Error deleting cache by pattern ${pattern}:`, error);
    return false;
  }
};

// Express middleware type
type ExpressMiddleware = (req: Request, res: Response, next: NextFunction) => void;

// Define a custom response interface with our json method
interface CachedResponse extends Response {
  originalJson?: Response['json'];
}

// Express middleware for caching responses
export const cacheMiddleware = (keyPrefix: string, expiryInSeconds = 300): ExpressMiddleware => {
  return async (req: Request, res: CachedResponse, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Build cache key from prefix and request URL
    const cacheKey = `${keyPrefix}:${req.originalUrl || req.url}`;
    
    try {
      // Try to get from cache
      const cachedData = await getCache(cacheKey);
      
      if (cachedData) {
        // Cache hit
        console.log(`Cache hit: ${cacheKey}`);
        res.set('X-Redis-Cache', 'HIT');
        return res.json(cachedData);
      }
      
      // Cache miss - store original res.json
      const originalJson = res.json;
      res.originalJson = originalJson;
      
      // Override res.json
      res.json = function(data: unknown) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          setCache(cacheKey, data, expiryInSeconds)
            .then(() => console.log(`Cached: ${cacheKey}`))
            .catch(err => console.error(`Caching error: ${err instanceof Error ? err.message : String(err)}`));
        }
        
        res.set('X-Redis-Cache', 'MISS');
        
        // Call the original json method
        return res.originalJson ? res.originalJson.call(this, data) : originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Redis middleware error:', error);
      next();
    }
  };
};

export default {
  getRedisClient,
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  cacheMiddleware,
};