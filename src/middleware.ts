// // src/middleware.ts
// import { NextResponse } from 'next/server';
// import type { NextRequest } from 'next/server';

// // Simple rate limiting configuration
// const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
// const MAX_REQUESTS_PER_WINDOW = 100; // Maximum requests per window

// // In-memory store for rate limiting
// // Note: This won't work in a scaled environment with multiple instances
// // In production, you would use Redis or another distributed cache
// const ipRequestCounts = new Map<string, { count: number; timestamp: number }>();

// export function middleware(request: NextRequest) {
//   // Only apply rate limiting to API routes
//   if (request.nextUrl.pathname.startsWith('/api/')) {
//     // Get the IP address from the request
//     const ip = request.headers.get('x-forwarded-for') || 
//                request.headers.get('x-real-ip') || 
//                'unknown-ip';
    
//     // Get current timestamp
//     const now = Date.now();
    
//     // Get the current count and timestamp for this IP
//     const currentData = ipRequestCounts.get(ip);
    
//     // If no previous requests, or the window has expired, reset the counter
//     if (!currentData || now - currentData.timestamp > RATE_LIMIT_WINDOW) {
//       ipRequestCounts.set(ip, { count: 1, timestamp: now });
//       console.log(`New request from ${ip}. Count: 1`);
//     } else {
//       // Increment the counter
//       currentData.count += 1;
      
//       // If the IP has exceeded the maximum requests per window
//       if (currentData.count > MAX_REQUESTS_PER_WINDOW) {
//         // Return a 429 Too Many Requests response
//         return new NextResponse(
//           JSON.stringify({
//             error: 'Too many requests',
//             message: 'Rate limit exceeded. Please try again later.',
//           }),
//           {
//             status: 429,
//             headers: {
//               'Content-Type': 'application/json',
//               'Retry-After': '60', // Try again after 60 seconds
//             },
//           }
//         );
//       }
//     }
//   }
  
//   // Continue with the request
//   return NextResponse.next();
// }

// // Only run middleware on API routes
// export const config = {
//   matcher: ['/api/:path*'],
// };

// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;

const ipRequestCounts = new Map<string, { count: number; timestamp: number }>();

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Apply rate limiting only for /blogs-rate-limit
  if (pathname === '/blogs-rate-limit') {
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown-ip';

    const now = Date.now();
    const currentData = ipRequestCounts.get(ip);

    console.log(ipRequestCounts, pathname);

    if (!currentData || now - currentData.timestamp > RATE_LIMIT_WINDOW) {
      ipRequestCounts.set(ip, { count: 1, timestamp: now });
    } else {
      currentData.count += 1;

      if (currentData.count > MAX_REQUESTS_PER_WINDOW) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            message: 'Rate limit exceeded. Please try again later.',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': '60',
            },
          }
        );
      }
    }
  }

  return NextResponse.next();
}

// ✅ Only run on the exact /blogs-rate-limit route
export const config = {
  matcher: ['/blogs-rate-limit'],
};