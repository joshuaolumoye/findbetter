// File: src/middleware.ts

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for API routes, static files, and _next
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Get session token from cookies
  const sessionToken = request.cookies.get('admin_session')?.value;
  
  // Validate session
  let isAuthenticated = false;
  if (sessionToken) {
    try {
      const admin = await validateSession(sessionToken);
      isAuthenticated = !!admin;
    } catch (error) {
      console.error('Middleware session validation error:', error);
      isAuthenticated = false;
    }
  }
  
  // Define route patterns
  const isLoginPage = pathname === '/admin/login';
  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  
  console.log('Middleware Debug:', {
    pathname,
    sessionToken: sessionToken ? 'present' : 'missing',
    isAuthenticated,
    isLoginPage,
    isAdminRoute
  });
  
  // If user is authenticated and tries to access login page
  if (isAuthenticated && isLoginPage) {
    console.log('Redirecting authenticated user from login to admin');
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // If user is not authenticated and tries to access admin routes (except login)
  if (!isAuthenticated && isAdminRoute) {
    console.log('Redirecting unauthenticated user to login');
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  
  // Allow the request to proceed
  return NextResponse.next();
}

export const config = {
  // Only match admin routes
  matcher: ['/admin/:path*']
};