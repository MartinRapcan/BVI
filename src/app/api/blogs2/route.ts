// app/api/blog/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";
import payloadConfig from "@/payload.config";
import { getCache, getRedisClient, setCache } from "@/utils/redis-cache";

export const dynamic = 'force-dynamic'; // Make sure this is dynamic

// Rate limit configuration
const RATE_LIMIT_MAX = 20; // maximum requests
const RATE_LIMIT_WINDOW = 60; // time window in seconds (1 minute)

export async function GET(req: NextRequest) {
	// Get IP address
	const ip = req.headers.get("x-forwarded-for") || "unknown";
	const key = `ratelimit:${ip}`;

	try {
		const redis = getRedisClient();
		if (!redis) {
			console.error("Failed to get Redis client for rate limiting");
			return handleRequest();
		}

		// Use Redis directly for rate limiting counter
		// This avoids the JSON parsing issue when using getCache
		const currentCount = await redis.get(key);
		const count = currentCount ? Number.parseInt(currentCount) : 0;

		// Rate limit exceeded
		if (count >= RATE_LIMIT_MAX) {
			// return NextResponse.json(
			//   { error: 'Too many requests', code: 'rate_limited' },
			//   {
			//     status: 429,
			//     headers: {
			//       'Retry-After': RATE_LIMIT_WINDOW.toString(),
			//       'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
			//       'X-RateLimit-Remaining': '0',
			//       'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + RATE_LIMIT_WINDOW).toString()
			//     }
			//   }
			// );
			return NextResponse.json(
				{ error: "Too many requests"},
				{ status: 500 },
			);
		}

		// Update counter - use Redis directly instead of setCache
		// This is because rate limiting counters should be stored as plain integers
		// not JSON strings for proper incrementing
		if (count === 0) {
			await redis.set(key, 1, "EX", RATE_LIMIT_WINDOW);
		} else {
			await redis.incr(key);
		}

		// Get remaining TTL for more accurate reset time
		const ttl = await redis.ttl(key);
		const resetTime =
			Math.floor(Date.now() / 1000) + (ttl > 0 ? ttl : RATE_LIMIT_WINDOW);

		// Process the request with rate limit headers
		return handleRequest({
			limit: RATE_LIMIT_MAX,
			remaining: RATE_LIMIT_MAX - count - 1,
			reset: resetTime,
		});
	} catch (error) {
		console.error("Rate limiting error:", error);
		// Fail open - allow the request if rate limiting fails
		return handleRequest();
	}
}

// Helper function to handle the actual request
async function handleRequest(rateLimit?: {
	limit: number;
	remaining: number;
	reset: number;
}) {
	try {
		// Get data from Payload CMS
		const payload = await getPayload({ config: payloadConfig });
		const blogs = await payload.find({
			collection: "blogs",
			limit: 10,
			sort: "-publishedAt",
		});

		// Prepare headers for response
		const headers: HeadersInit = {};

		// Add rate limit headers if available
		if (rateLimit) {
			headers["X-RateLimit-Limit"] = rateLimit.limit.toString();
			headers["X-RateLimit-Remaining"] = rateLimit.remaining.toString();
			headers["X-RateLimit-Reset"] = rateLimit.reset.toString();
		}

		return NextResponse.json(blogs, { headers });
	} catch (error) {
		console.error("Error fetching blogs:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
