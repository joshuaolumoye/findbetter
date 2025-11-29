// File: src/app/api/referrals/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader } from 'mysql2';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/referrals/[id] - Delete a referral code (Admin only)
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
    const referralId = parseInt(id);

    if (isNaN(referralId) || referralId <= 0) {
      return NextResponse.json(
        { error: 'Invalid referral ID' },
        { status: 400 }
      );
    }

    // Delete the referral (users.referral_id will be set to NULL due to ON DELETE SET NULL)
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM referrals WHERE id = ?',
      [referralId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Referral deleted successfully'
    });

  } catch (error: any) {
    console.error('Error deleting referral:', error);
    return NextResponse.json(
      { error: 'Failed to delete referral', details: error.message },
      { status: 500 }
    );
  }
}

