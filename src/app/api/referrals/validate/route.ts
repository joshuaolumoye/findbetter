// File: src/app/api/referrals/validate/route.ts
// Public endpoint to validate a referral code
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

interface ReferralRow extends RowDataPacket {
  id: number;
  name: string;
  code: string;
}

/**
 * GET /api/referrals/validate?code=xxx - Validate a referral code (Public)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      return NextResponse.json(
        { error: 'Code parameter is required', valid: false },
        { status: 400 }
      );
    }

    const [rows] = await pool.execute<ReferralRow[]>(
      'SELECT id, name, code FROM referrals WHERE code = ?',
      [code.trim()]
    );

    if ((rows as any[]).length === 0) {
      return NextResponse.json({
        valid: false,
        message: 'Referral code not found'
      });
    }

    const referral = rows[0];
    return NextResponse.json({
      valid: true,
      referral: {
        id: referral.id,
        name: referral.name,
        code: referral.code
      }
    });

  } catch (error: any) {
    console.error('Error validating referral:', error);
    return NextResponse.json(
      { error: 'Failed to validate referral code', valid: false },
      { status: 500 }
    );
  }
}

