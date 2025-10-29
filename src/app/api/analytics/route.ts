import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { RowDataPacket } from 'mysql2';
import { getCurrentSession } from '@/lib/auth';

interface AnalyticsQuery {
  range: 'today' | 'week' | 'month';
}

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
    const range = (searchParams.get('range') || 'today') as 'today' | 'week' | 'month';

    // Determine date range
    const dateFilter = getDateFilter(range);

    // Execute all queries in parallel for performance
    const [
      currentVisitors,
      totalVisitors,
      uniqueVisitors,
      pageViews,
      sessionMetrics,
      topPages,
      visitorsByHour,
      userBehavior,
      deviceBreakdown,
      geographicData,
      formMetrics,
      conversionMetrics
    ] = await Promise.all([
      getCurrentVisitors(),
      getTotalVisitors(dateFilter),
      getUniqueVisitors(dateFilter),
      getPageViews(dateFilter),
      getSessionMetrics(dateFilter),
      getTopPages(dateFilter),
      getVisitorsByHour(dateFilter),
      getUserBehavior(dateFilter),
      getDeviceBreakdown(dateFilter),
      getGeographicData(dateFilter),
      getFormMetrics(dateFilter),
      getConversionMetrics(dateFilter)
    ]);

    // Calculate derived metrics
    const bounceRate = sessionMetrics.totalSessions > 0
      ? (sessionMetrics.bouncedSessions / sessionMetrics.totalSessions) * 100
      : 0;

    const conversionRate = totalVisitors > 0
      ? (conversionMetrics.totalConversions / totalVisitors) * 100
      : 0;

    // Build response
    const analyticsData = {
      currentVisitors,
      totalVisitorsToday: range === 'today' ? totalVisitors : await getTotalVisitors(getDateFilter('today')),
      totalVisitorsWeek: range === 'week' ? totalVisitors : await getTotalVisitors(getDateFilter('week')),
      totalVisitorsMonth: range === 'month' ? totalVisitors : await getTotalVisitors(getDateFilter('month')),
      avgSessionDuration: Math.round(sessionMetrics.avgDuration),
      bounceRate: parseFloat(bounceRate.toFixed(1)),
      pageViews,
      uniqueVisitors,
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      topPages,
      visitorsByHour,
      userBehavior,
      deviceBreakdown,
      geographicData,
      formMetrics,
      conversionMetrics
    };

    return NextResponse.json(analyticsData, { status: 200 });

  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get date filter SQL
function getDateFilter(range: 'today' | 'week' | 'month'): string {
  switch (range) {
    case 'today':
      return 'DATE(created_at) = CURDATE()';
    case 'week':
      return 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    case 'month':
      return 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
    default:
      return 'DATE(created_at) = CURDATE()';
  }
}

// Get current active visitors (last 5 minutes)
async function getCurrentVisitors(): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count 
       FROM active_users 
       WHERE last_activity >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)`
    );
    return rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting current visitors:', error);
    return 0;
  }
}

// Get total visitors for date range
async function getTotalVisitors(dateFilter: string): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count 
       FROM user_sessions 
       WHERE ${dateFilter.replace('created_at', 'started_at')}`
    );
    return rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting total visitors:', error);
    return 0;
  }
}

// Get unique visitors
async function getUniqueVisitors(dateFilter: string): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT COALESCE(user_id, ip_address)) as count 
       FROM user_sessions 
       WHERE ${dateFilter.replace('created_at', 'started_at')}`
    );
    return rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting unique visitors:', error);
    return 0;
  }
}

// Get total page views
async function getPageViews(dateFilter: string): Promise<number> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(*) as count FROM page_views WHERE ${dateFilter}`
    );
    return rows[0]?.count || 0;
  } catch (error) {
    console.error('Error getting page views:', error);
    return 0;
  }
}

// Get session metrics (avg duration, bounce rate)
async function getSessionMetrics(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        AVG(duration_seconds) as avgDuration,
        COUNT(*) as totalSessions,
        SUM(CASE WHEN is_bounce = TRUE THEN 1 ELSE 0 END) as bouncedSessions
       FROM user_sessions 
       WHERE ${dateFilter.replace('created_at', 'started_at')}`
    );
    return {
      avgDuration: rows[0]?.avgDuration || 0,
      totalSessions: rows[0]?.totalSessions || 0,
      bouncedSessions: rows[0]?.bouncedSessions || 0
    };
  } catch (error) {
    console.error('Error getting session metrics:', error);
    return { avgDuration: 0, totalSessions: 0, bouncedSessions: 0 };
  }
}

// Get top pages
async function getTopPages(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        pv.page_path as page,
        COUNT(*) as views,
        CONCAT(
          FLOOR(AVG(pp.time_on_page_seconds) / 60), 
          ':', 
          LPAD(FLOOR(AVG(pp.time_on_page_seconds) % 60), 2, '0')
        ) as avgDuration
       FROM page_views pv
       LEFT JOIN page_performance pp ON pv.session_id = pp.session_id AND pv.page_path = pp.page_path
       WHERE ${dateFilter.replace('created_at', 'pv.created_at')}
       GROUP BY pv.page_path
       ORDER BY views DESC
       LIMIT 5`
    );
    return rows.map(row => ({
      page: row.page,
      views: row.views,
      avgDuration: row.avgDuration || '0:00'
    }));
  } catch (error) {
    console.error('Error getting top pages:', error);
    return [];
  }
}

// Get visitors by hour (for today or last 24 hours)
async function getVisitorsByHour(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        DATE_FORMAT(started_at, '%H:00') as hour,
        COUNT(DISTINCT session_id) as visitors
       FROM user_sessions
       WHERE ${dateFilter.replace('created_at', 'started_at')}
       GROUP BY DATE_FORMAT(started_at, '%H:00')
       ORDER BY hour`
    );
    return rows.map(row => ({
      hour: row.hour,
      visitors: row.visitors
    }));
  } catch (error) {
    console.error('Error getting visitors by hour:', error);
    return [];
  }
}

// Get user behavior (new vs returning)
async function getUserBehavior(dateFilter: string) {
  try {
    const [newUsersRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM user_sessions
       WHERE ${dateFilter.replace('created_at', 'started_at')}
       AND session_id NOT IN (
         SELECT DISTINCT session_id FROM user_sessions 
         WHERE started_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
       )`
    );

    const [returningUsersRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM user_sessions
       WHERE ${dateFilter.replace('created_at', 'started_at')}
       AND session_id IN (
         SELECT DISTINCT session_id FROM user_sessions 
         WHERE started_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
       )`
    );

    const [completedFormsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM form_interactions
       WHERE ${dateFilter} AND event_type = 'completed'`
    );

    const [abandonedFormsRows] = await pool.execute<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT session_id) as count
       FROM form_interactions
       WHERE ${dateFilter} AND event_type = 'abandoned'`
    );

    return {
      newUsers: newUsersRows[0]?.count || 0,
      returningUsers: returningUsersRows[0]?.count || 0,
      completedForms: completedFormsRows[0]?.count || 0,
      abandonedForms: abandonedFormsRows[0]?.count || 0
    };
  } catch (error) {
    console.error('Error getting user behavior:', error);
    return {
      newUsers: 0,
      returningUsers: 0,
      completedForms: 0,
      abandonedForms: 0
    };
  }
}

// Get device breakdown
async function getDeviceBreakdown(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        device_type as device,
        COUNT(DISTINCT session_id) as count,
        ROUND(
          COUNT(DISTINCT session_id) * 100.0 / 
          (SELECT COUNT(DISTINCT session_id) FROM user_sessions WHERE ${dateFilter.replace('created_at', 'started_at')}),
          1
        ) as percentage
       FROM user_sessions
       WHERE ${dateFilter.replace('created_at', 'started_at')}
       GROUP BY device_type
       ORDER BY count DESC`
    );
    return rows.map(row => ({
      device: row.device.charAt(0).toUpperCase() + row.device.slice(1),
      count: row.count,
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error('Error getting device breakdown:', error);
    return [];
  }
}

// Get geographic data
async function getGeographicData(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COALESCE(canton, 'Unknown') as canton,
        COUNT(DISTINCT session_id) as visitors,
        ROUND(
          COUNT(DISTINCT session_id) * 100.0 / 
          (SELECT COUNT(DISTINCT session_id) FROM user_sessions WHERE ${dateFilter.replace('created_at', 'started_at')}),
          1
        ) as percentage
       FROM user_sessions
       WHERE ${dateFilter.replace('created_at', 'started_at')}
       GROUP BY canton
       ORDER BY visitors DESC
       LIMIT 6`
    );
    return rows.map(row => ({
      canton: row.canton,
      visitors: row.visitors,
      percentage: parseFloat(row.percentage) || 0
    }));
  } catch (error) {
    console.error('Error getting geographic data:', error);
    return [];
  }
}

// Get form metrics
async function getFormMetrics(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        SUM(CASE WHEN event_type = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN event_type = 'abandoned' THEN 1 ELSE 0 END) as abandoned
       FROM form_interactions
       WHERE ${dateFilter}`
    );
    return {
      completed: rows[0]?.completed || 0,
      abandoned: rows[0]?.abandoned || 0
    };
  } catch (error) {
    console.error('Error getting form metrics:', error);
    return { completed: 0, abandoned: 0 };
  }
}

// Get conversion metrics
async function getConversionMetrics(dateFilter: string) {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalConversions,
        SUM(conversion_value) as totalValue
       FROM conversion_events
       WHERE ${dateFilter}`
    );
    return {
      totalConversions: rows[0]?.totalConversions || 0,
      totalValue: parseFloat(rows[0]?.totalValue) || 0
    };
  } catch (error) {
    console.error('Error getting conversion metrics:', error);
    return { totalConversions: 0, totalValue: 0 };
  }
}