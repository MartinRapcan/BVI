// src/utils/redis-metrics.ts
import { getRedisClient } from './redis-cache';

// Basic metrics for cache performance
interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  keyCount: number;
  memory: {
    used: string;
    peak: string;
  };
  uptime: {
    seconds: number;
    days: number;
  };
  rateLimiting: {
    activeIps: number;
    blockedIps: number;
  };
}

/**
 * Collects Redis metrics for monitoring from localhost
 */
export async function collectRedisMetrics(): Promise<CacheMetrics | null> {
  const redis = getRedisClient();
  if (!redis) {
    console.error('Failed to get Redis client for metrics collection');
    return null;
  }

  try {
    // Get Redis INFO command output
    const info = await redis.info();
    
    // Parse INFO into sections and key-value pairs
    const infoMap: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const parts = line.split(':');
        if (parts.length === 2) {
          infoMap[parts[0]] = parts[1];
        }
      }
    });
    
    // Parse keyspace info to get key count
    // The db0 format is typically "keys=X,expires=Y,avg_ttl=Z"
    let keyCount = 0;
    const db0Info = infoMap['db0'];
    if (db0Info) {
      const keysPart = db0Info.split(',').find(part => part.startsWith('keys='));
      if (keysPart) {
        keyCount = parseInt(keysPart.split('=')[1]) || 0;
      }
    }
    
    // Get rate limiting data
    const rateLimitKeys = await redis.keys('ratelimit:*');
    const rateLimit = 20; // Should match your RATE_LIMIT_MAX constant
    
    // Count blocked IPs (those that have hit rate limit)
    let blockedIps = 0;
    if (rateLimitKeys.length > 0) {
      const pipeline = redis.pipeline();
      rateLimitKeys.forEach(key => {
        pipeline.get(key);
      });
      
      const results = await pipeline.exec();
      if (results) {
        blockedIps = results.filter(result => {
          if (!result[0] && result[1]) { // No error and has value
            const count = parseInt(result[1] as string);
            return count >= rateLimit;
          }
          return false;
        }).length;
      }
    }
    
    // Calculate cache hit/miss rates
    const keyspaceHits = parseInt(infoMap['keyspace_hits'] || '0');
    const keyspaceMisses = parseInt(infoMap['keyspace_misses'] || '0');
    const hitRate = (keyspaceHits + keyspaceMisses > 0) 
      ? (keyspaceHits / (keyspaceHits + keyspaceMisses)) * 100 
      : 0;
    
    // Get uptime
    const uptimeSeconds = parseInt(infoMap['uptime_in_seconds'] || '0');
    const uptimeDays = Math.floor(uptimeSeconds / 86400); // 86400 seconds in a day
    
    return {
      hits: keyspaceHits,
      misses: keyspaceMisses,
      hitRate: parseFloat(hitRate.toFixed(2)),
      keyCount: keyCount,
      memory: {
        used: formatBytes(parseInt(infoMap['used_memory'] || '0')),
        peak: formatBytes(parseInt(infoMap['used_memory_peak'] || '0')),
      },
      uptime: {
        seconds: uptimeSeconds,
        days: uptimeDays
      },
      rateLimiting: {
        activeIps: rateLimitKeys.length,
        blockedIps: blockedIps
      }
    };
  } catch (error) {
    console.error('Error collecting Redis metrics:', error);
    return null;
  }
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get list of currently active IPs with their request counts
 */
export async function getActiveIPs(): Promise<Record<string, number>> {
  const redis = getRedisClient();
  if (!redis) return {};
  
  try {
    const keys = await redis.keys('ratelimit:*');
    if (keys.length === 0) return {};
    
    const pipeline = redis.pipeline();
    keys.forEach(key => {
      pipeline.get(key);
    });
    
    const results = await pipeline.exec();
    if (!results) return {};
    
    const ipCounts: Record<string, number> = {};
    
    keys.forEach((key, index) => {
      const ip = key.replace('ratelimit:', '');
      if (results[index][1]) { // Check if value exists
        ipCounts[ip] = parseInt(results[index][1] as string) || 0;
      }
    });
    
    return ipCounts;
  } catch (error) {
    console.error('Error getting active IPs:', error);
    return {};
  }
}

/**
 * Simple test function to verify Redis connection and metrics collection
 */
export async function testRedisConnection(): Promise<{ 
  connected: boolean; 
  message: string;
}> {
  const redis = getRedisClient();
  if (!redis) {
    return { 
      connected: false, 
      message: 'Failed to get Redis client. Check your connection settings.' 
    };
  }
  
  try {
    // Try a simple ping command
    const pong = await redis.ping();
    if (pong !== 'PONG') {
      return { 
        connected: false, 
        message: `Unexpected response from Redis ping: ${pong}` 
      };
    }
    
    return { 
      connected: true, 
      message: 'Successfully connected to Redis on localhost' 
    };
  } catch (error) {
    return { 
      connected: false, 
      message: `Error connecting to Redis: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}