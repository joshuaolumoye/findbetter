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
    response.cookies.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    });
    
    return response;
    
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}