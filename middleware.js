// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // 1. Only apply this to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    
    const origin = request.headers.get('origin') || '';
    
    // 2. Define allowed origins
    // Allow your Vercel production URL, OR any localhost URL (any port)
    const isAllowed = 
      origin === 'https://gold-centro-1hqg.vercel.app' || 
      origin.startsWith('http://localhost:') || 
      origin.startsWith('http://127.0.0.1:');

    // 3. Handle the browser's "Preflight" OPTIONS request
    if (request.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 });
      if (isAllowed) {
        response.headers.set('Access-Control-Allow-Origin', origin);
        response.headers.set('Access-Control-Allow-Credentials', 'true');
      }
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return response;
    }

    // 4. Handle the actual API request
    const response = NextResponse.next();
    if (isAllowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    return response;
  }
}

export const config = {
  matcher: '/api/:path*',
};