// File: src/app/api/notifications/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';

/**
 * Delete a notification
 * DELETE /api/notifications/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId) || notificationId <= 0) {
      return NextResponse.json(
        { error: 'Invalid notification ID' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM notifications WHERE id = ?',
      [notificationId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification', details: error.message },
      { status: 500 }
    );
  }
}

