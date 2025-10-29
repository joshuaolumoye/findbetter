// File: src/app/api/notifications/delete-read/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';

/**
 * Delete all read notifications
 * DELETE /api/notifications/delete-read
 */
export async function DELETE(request: NextRequest) {
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
      'DELETE FROM notifications WHERE is_read = TRUE'
    );

    return NextResponse.json({
      success: true,
      message: 'All read notifications deleted',
      deleted_count: result.affectedRows
    });

  } catch (error: any) {
    console.error('Error deleting read notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete read notifications', details: error.message },
      { status: 500 }
    );
  }
}

