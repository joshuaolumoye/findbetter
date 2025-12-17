
import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get session token from request cookies
    const sessionToken = request.cookies.get('admin_session')?.value;
    const admin = await validateSession(sessionToken);

    if (!admin) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    // Log a bit more context (avoid spamming full cookies)
    console.error('Session verification error:', error, {
      cookieHeader: request.headers.get('cookie')?.slice(0, 200) ?? null,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}