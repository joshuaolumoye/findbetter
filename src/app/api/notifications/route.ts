// File: src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import { getCurrentSession } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Get notifications with filtering
 * GET /api/notifications
 */
export async function GET(request: NextRequest) {
  let connection;
  
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

    // Get connection with timeout
    connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]) as any;

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
      query += ' AND is_read = 0';
    } else if (filter === 'read') {
      query += ' AND is_read = 1';
    }

    if (type !== 'all') {
      query += ' AND type = ?';
      params.push(type);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const [notifications] = await connection.execute<RowDataPacket[]>(query, params);

    // Get unread count
    const [countResult] = await connection.execute<RowDataPacket[]>(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE is_read = 0'
    );

    // Parse metadata if it exists
    const parsedNotifications = notifications.map((n: any) => ({
      ...n,
      is_read: Boolean(n.is_read),
      metadata: n.metadata ? JSON.parse(n.metadata) : null
    }));

    return NextResponse.json({
      success: true,
      notifications: parsedNotifications,
      unread_count: countResult[0]?.unread_count || 0
    });

  } catch (error: any) {
    console.error('❌ Error fetching notifications:', error);
    
    // Provide detailed error for debugging
    const errorDetails = {
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage
    };

    return NextResponse.json(
      { 
        error: 'Failed to fetch notifications', 
        details: process.env.NODE_ENV === 'development' ? errorDetails : error.message 
      },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

/**
 * Create manual notification (for system messages)
 * POST /api/notifications
 */
export async function POST(request: NextRequest) {
  let connection;
  
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
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    connection = await pool.getConnection();

    const [result] = await connection.execute<ResultSetHeader>(
      `INSERT INTO notifications (
        type, title, message, user_id, priority, metadata, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
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
      notification_id: result.insertId,
      message: 'Notification created successfully'
    });

  } catch (error: any) {
    console.error('❌ Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification', details: error.message },
      { status: 500 }
    );
  } finally {
    if (connection) {
      connection.release();
    }
  }
}