// app/api/metrics/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { collectRedisMetrics, getActiveIPs, testRedisConnection } from '@/utils/redis-metrics';

export const dynamic = 'force-dynamic'; // Make sure this is dynamic

export async function GET(req: NextRequest) {
  try {
    // First test if we can connect to Redis
    const connectionTest = await testRedisConnection();
    if (!connectionTest.connected) {
      return NextResponse.json(
        { 
          error: 'Redis connection failed', 
          message: connectionTest.message 
        },
        { status: 500 }
      );
    }
    
    // Get detailed info if requested
    const detailed = req.nextUrl.searchParams.get('detailed') === 'true';
    
    // Get metrics from Redis
    const metrics = await collectRedisMetrics();
    
    if (!metrics) {
      return NextResponse.json(
        { error: 'Failed to collect Redis metrics' },
        { status: 500 }
      );
    }
    
    // Get active IPs if detailed view is requested
    let activeIPs = null;
    if (detailed) {
      activeIPs = await getActiveIPs();
    }
    
    // Return all collected data
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      connection: connectionTest,
      metrics,
      activeIPs: detailed ? activeIPs : undefined
    });
  } catch (error) {
    console.error('Error in Redis metrics endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}