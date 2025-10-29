// File: src/app/api/notifications/mark-all-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';

/**
 * Mark all notifications as read
 * PUT /api/notifications/mark-all-read
 */
export async function PUT(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE'
    );

    return NextResponse.json({
      success: true,
      message: 'All notifications marked as read',
      updated_count: result.affectedRows
    });

  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read', details: error.message },
      { status: 500 }
    );
  }
}

