// File: src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { RowDataPacket } from 'mysql2';
import { getCurrentSession } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

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

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'all';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = `
      SELECT 
        id, type, title, message, user_id, user_name, user_email,
        is_read, priority, metadata, created_at
      FROM notifications
      WHERE 1=1
    `;
    const params: any[] = [];

    // Apply filters
    if (filter === 'unread') {
      query += ' AND is_read = FALSE';
    } else if (filter === 'read') {
      query += ' AND is_read = TRUE';
    }

    if (type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [notifications] = await pool.execute<RowDataPacket[]>(query, params);

    // Get unread count
    const [countResult] = await pool.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE is_read = FALSE'
    );

    return NextResponse.json({
      success: true,
      notifications,
      unread_count: countResult[0]?.unread_count || 0
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications', details: error.message },
      { status: 500 }
    );
  }
}

// Create manual notification (for system messages)
export async function POST(request: NextRequest) {
  try {
    const admin = await getCurrentSession();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, title, message, user_id, priority, metadata } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute<any>(
      `INSERT INTO notifications (type, title, message, user_id, priority, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        type,
        title,
        message,
        user_id || null,
        priority || 'medium',
        metadata ? JSON.stringify(metadata) : null
      ]
    );

    return NextResponse.json({
      success: true,
      notification_id: result.insertId
    });
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', details: error.message },
      { status: 500 }
    );
  }
}