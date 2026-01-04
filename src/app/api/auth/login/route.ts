// File: src/app/api/auth/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, createSession } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    // Normalize email to avoid simple casing/whitespace issues
    const normalizedEmail = String(email || '').trim().toLowerCase();
    
    // Validate input
    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    // Authenticate admin (use normalized email)
    const admin = await authenticateAdmin(normalizedEmail, password);
    
    if (!admin) {
      // Use generic error message to prevent email enumeration
      console.debug('Authentication failed for email:', normalizedEmail);
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    
    // Create session
    const sessionToken = await createSession(admin);
    
    // Set cookie
    const response = NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
    
    // Set secure cookie
    // NOTE: On VPS, ensure you use HTTPS for secure cookies. If testing on HTTP, set secure: false.
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Set to false if not using HTTPS
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
    
    return response;

    // VPS Checklist:
    // 1. .env.local must have correct DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, JWT_EXPIRES_IN
    // 2. DB user must have SELECT on admins table
    // 3. VPS system time must be correct (check with 'date')
    // 4. Node version should be >= 16
    // 5. If using HTTP (not HTTPS), set secure: false for cookies
    // 6. Make sure bcrypt is installed and works (try hashing and comparing a password in a Node REPL)
    // 7. Check logs for any errors in /var/log or your process manager (pm2, systemd, etc)
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}