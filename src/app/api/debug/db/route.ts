import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/database';

export async function GET() {
  try {
    const ok = await testConnection();
    // Return helpful but non-sensitive info
    return NextResponse.json({
      success: ok,
      dbHost: process.env.DB_HOST ?? null,
      dbPort: process.env.DB_PORT ?? null,
      dbName: process.env.DB_NAME ?? null,
    });
  } catch (err) {
    console.error('DB debug error:', err);
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 });
  }
}
