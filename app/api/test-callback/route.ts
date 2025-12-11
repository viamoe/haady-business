import { NextResponse } from 'next/server';

/**
 * Test endpoint to verify callback route is accessible
 * Visit: http://localhost:3002/api/test-callback
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  
  return NextResponse.json({
    message: 'Callback route is accessible',
    url: requestUrl.toString(),
    origin: requestUrl.origin,
    pathname: requestUrl.pathname,
    searchParams: Object.fromEntries(requestUrl.searchParams.entries()),
    timestamp: new Date().toISOString(),
  });
}

