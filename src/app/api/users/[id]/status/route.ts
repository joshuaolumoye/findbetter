// File: src/app/api/users/[id]/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';

/**
 * Update user status and admin notes
 * PUT /api/users/[id]/status
 */
export async function PUT(
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
    const userId = parseInt(id);

    if (isNaN(userId) || userId <= 0) {
      return NextResponse.json(
        { 
          error: 'Invalid user ID',
          details: 'User ID must be a positive number',
          code: 'INVALID_USER_ID'
        },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status, notes } = body;

    // Validate status
    const validStatuses = ['pending', 'active', 'inactive', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { 
          error: 'Invalid status',
          details: `Status must be one of: ${validStatuses.join(', ')}`,
          code: 'INVALID_STATUS'
        },
        { status: 400 }
      );
    }

    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Prepare admin notes entry
      const timestamp = new Date().toISOString();
      const noteEntry = notes 
        ? `\n[${timestamp}] ${admin.email}: ${notes}` 
        : `\n[${timestamp}] ${admin.email}: Status changed to ${status}`;

      // Update user status and append admin notes
      const [updateResult] = await connection.execute<ResultSetHeader>(
        `UPDATE users 
         SET status = ?, 
             admin_notes = CONCAT(COALESCE(admin_notes, ''), ?),
             updated_at = NOW()
         WHERE id = ?`,
        [status, noteEntry, userId]
      );

      if (updateResult.affectedRows === 0) {
        await connection.rollback();
        return NextResponse.json(
          { 
            error: 'User not found',
            details: `No user found with ID ${userId}`,
            code: 'USER_NOT_FOUND'
          },
          { status: 404 }
        );
      }

      // Update quote status if exists
      await connection.execute(
        `UPDATE insurance_quotes 
         SET quote_status = ?,
             updated_at = NOW()
         WHERE user_id = ?`,
        [status, userId]
      );

      // Log admin action
      await connection.execute(
        `INSERT INTO admin_actions (
          user_id, admin_user, action_type, action_details, created_at
        ) VALUES (?, ?, ?, ?, NOW())`,
        [
          userId,
          admin.email,
          status === 'active' ? 'approved' : 'status_changed',
          notes || `Status changed to ${status}`
        ]
      );

      await connection.commit();

      console.log(`✅ User ${userId} status updated to ${status} by ${admin.email}`);

      return NextResponse.json({
        success: true,
        message: 'User status updated successfully',
        data: {
          userId,
          status,
          updatedBy: admin.email,
          updatedAt: timestamp
        }
      }, { status: 200 });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error: any) {
    console.error('Error updating user status:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to update user status',
        details: process.env.NODE_ENV === 'production' 
          ? 'Internal server error' 
          : error.message,
        code: 'UPDATE_ERROR'
      },
      { status: 500 }
    );
  }
}

