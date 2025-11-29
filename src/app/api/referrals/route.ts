// File: src/app/api/referrals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { getCurrentSession } from '@/lib/auth';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export const dynamic = 'force-dynamic';

interface ReferralRow extends RowDataPacket {
  id: number;
  name: string;
  code: string;
  created_at: Date;
  usage_count: number;
}

/**
 * GET /api/referrals - Get all referrals with usage count (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [rows] = await pool.execute<ReferralRow[]>(`
      SELECT 
        r.id, 
        r.name, 
        r.code, 
        r.created_at,
        COUNT(u.id) as usage_count
      FROM referrals r
      LEFT JOIN users u ON u.referral_id = r.id
      GROUP BY r.id, r.name, r.code, r.created_at
      ORDER BY r.created_at DESC
    `);

    return NextResponse.json({
      success: true,
      referrals: rows
    });

  } catch (error: any) {
    console.error('Error fetching referrals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch referrals', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/referrals - Create a new referral code (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, code } = body;

    if (!name || !code) {
      return NextResponse.json(
        { error: 'Name and code are required' },
        { status: 400 }
      );
    }

    // Validate code format (alphanumeric, no spaces)
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Code must be alphanumeric (letters and numbers only)' },
        { status: 400 }
      );
    }

    // Check if code already exists
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM referrals WHERE code = ?',
      [code]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: 'A referral with this code already exists' },
        { status: 409 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'INSERT INTO referrals (name, code, created_at) VALUES (?, ?, NOW())',
      [name.trim(), code.trim()]
    );

    return NextResponse.json({
      success: true,
      message: 'Referral created successfully',
      referral: {
        id: result.insertId,
        name: name.trim(),
        code: code.trim()
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating referral:', error);
    return NextResponse.json(
      { error: 'Failed to create referral', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/referrals - Update a referral code (Admin only)
 */
export async function PUT(request: NextRequest) {
  try {
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, code } = body;

    if (!id || !name || !code) {
      return NextResponse.json(
        { error: 'ID, name, and code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^[a-zA-Z0-9]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Code must be alphanumeric (letters and numbers only)' },
        { status: 400 }
      );
    }

    // Check if new code conflicts with another referral
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM referrals WHERE code = ? AND id != ?',
      [code, id]
    );

    if ((existing as any[]).length > 0) {
      return NextResponse.json(
        { error: 'Another referral with this code already exists' },
        { status: 409 }
      );
    }

    const [result] = await pool.execute<ResultSetHeader>(
      'UPDATE referrals SET name = ?, code = ? WHERE id = ?',
      [name.trim(), code.trim(), id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { error: 'Referral not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Referral updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating referral:', error);
    return NextResponse.json(
      { error: 'Failed to update referral', details: error.message },
      { status: 500 }
    );
  }
}

