// File: src/app/api/analytics/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/database';
import { ResultSetHeader } from 'mysql2';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    // Get IP and user agent from request
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    switch (type) {
      case 'pageview':
        await trackPageView(data, ip, userAgent);
        break;
      
      case 'performance':
        await trackPerformance(data);
        break;
      
      case 'click':
        await trackClick(data);
        break;
      
      case 'form_interaction':
        await trackFormInteraction(data);
        break;
      
      case 'active_user':
        await updateActiveUser(data, ip);
        break;
      
      case 'end_session':
        await endSession(data);
        break;
      
      case 'conversion':
        await trackConversion(data);
        break;
      
      case 'custom_event':
        await trackCustomEvent(data);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Unknown tracking type' },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json(
      { error: 'Tracking failed', details: error.message },
      { status: 500 }
    );
  }
}

// Track page view
async function trackPageView(data: any, ip: string, userAgent: string) {
  try {
    await pool.execute(
      `INSERT INTO page_views (
        session_id, page_path, page_title, referrer, user_agent,
        device_type, browser, os, screen_resolution, ip_address, canton
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.sessionId,
        data.pagePath,
        data.pageTitle,
        data.referrer || '',
        userAgent,
        data.deviceType || 'unknown',
        extractBrowser(userAgent),
        extractOS(userAgent),
        data.screenResolution || '',
        ip,
        data.canton || null
      ]
    );

    // Update or create session
    await upsertSession(data.sessionId, data, ip, userAgent);

  } catch (error) {
    console.error('Error tracking page view:', error);
    throw error;
  }
}

// Track performance metrics
async function trackPerformance(data: any) {
  try {
    await pool.execute(
      `INSERT INTO page_performance (
        session_id, page_path, load_time_ms, dom_ready_ms, first_contentful_paint_ms,
        time_on_page_seconds, scroll_depth_percentage, interactions_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.sessionId,
        data.pagePath,
        data.loadTime || 0,
        data.domReady || 0,
        data.firstPaint || 0,
        data.timeOnPage || 0,
        data.scrollDepth || 0,
        data.interactionsCount || 0
      ]
    );

    // Update session with page count and duration
    await pool.execute(
      `UPDATE user_sessions 
       SET page_count = page_count + 1,
           duration_seconds = ?,
           is_bounce = (page_count = 1 AND ? < 10),
           updated_at = NOW()
       WHERE session_id = ?`,
      [data.timeOnPage, data.timeOnPage, data.sessionId]
    );

  } catch (error) {
    console.error('Error tracking performance:', error);
  }
}

// Track click events
async function trackClick(data: any) {
  try {
    await pool.execute(
      `INSERT INTO click_events (
        session_id, page_path, element_type, element_id, element_class,
        element_text, click_x, click_y
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.sessionId,
        data.pagePath,
        data.elementType || '',
        data.elementId || '',
        data.elementClass || '',
        data.elementText || '',
        data.clickX || 0,
        data.clickY || 0
      ]
    );
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

// Track form interactions
async function trackFormInteraction(data: any) {
  try {
    await pool.execute(
      `INSERT INTO form_interactions (
        session_id, form_name, event_type, time_spent_seconds
      ) VALUES (?, ?, ?, ?)`,
      [
        data.sessionId,
        data.formName,
        data.eventType,
        data.timeSpent || 0
      ]
    );

    // If form completed, mark session as converted
    if (data.eventType === 'completed') {
      await pool.execute(
        `UPDATE user_sessions SET converted = TRUE WHERE session_id = ?`,
        [data.sessionId]
      );
    }
  } catch (error) {
    console.error('Error tracking form interaction:', error);
  }
}

// Update active user
async function updateActiveUser(data: any, ip: string) {
  try {
    await pool.execute(
      `INSERT INTO active_users (session_id, current_page, device_type, canton, last_activity)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE 
         current_page = VALUES(current_page),
         last_activity = NOW()`,
      [
        data.sessionId,
        data.currentPage,
        data.deviceType || 'unknown',
        data.canton || null
      ]
    );
  } catch (error) {
    console.error('Error updating active user:', error);
  }
}

// End session
async function endSession(data: any) {
  try {
    await pool.execute(
      `UPDATE user_sessions 
       SET ended_at = NOW(),
           duration_seconds = ?,
           exit_page = (SELECT page_path FROM page_views WHERE session_id = ? ORDER BY created_at DESC LIMIT 1)
       WHERE session_id = ?`,
      [data.duration, data.sessionId, data.sessionId]
    );

    // Remove from active users
    await pool.execute(
      `DELETE FROM active_users WHERE session_id = ?`,
      [data.sessionId]
    );
  } catch (error) {
    console.error('Error ending session:', error);
  }
}

// Track conversion
async function trackConversion(data: any) {
  try {
    await pool.execute(
      `INSERT INTO conversion_events (
        session_id, conversion_type, conversion_value, page_path,
        time_to_convert_seconds, metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        data.sessionId,
        data.conversionType,
        data.conversionValue || 0,
        data.pagePath,
        data.timeToConvert || 0,
        JSON.stringify(data.metadata || {})
      ]
    );

    // Update session conversion status
    await pool.execute(
      `UPDATE user_sessions 
       SET converted = TRUE, 
           conversion_value = conversion_value + ?
       WHERE session_id = ?`,
      [data.conversionValue || 0, data.sessionId]
    );
  } catch (error) {
    console.error('Error tracking conversion:', error);
  }
}

// Track custom event
async function trackCustomEvent(data: any) {
  try {
    await pool.execute(
      `INSERT INTO click_events (
        session_id, page_path, element_type, element_text
      ) VALUES (?, ?, ?, ?)`,
      [
        data.sessionId,
        data.pagePath,
        data.eventName,
        JSON.stringify(data.eventData || {})
      ]
    );
  } catch (error) {
    console.error('Error tracking custom event:', error);
  }
}

// Upsert session (create or update)
async function upsertSession(sessionId: string, data: any, ip: string, userAgent: string) {
  try {
    const [existing] = await pool.execute<any[]>(
      `SELECT id FROM user_sessions WHERE session_id = ? LIMIT 1`,
      [sessionId]
    );

    if (existing.length === 0) {
      // Create new session
      await pool.execute(
        `INSERT INTO user_sessions (
          session_id, device_type, browser, os, ip_address, canton,
          entry_page, referrer_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          data.deviceType || 'unknown',
          extractBrowser(userAgent),
          extractOS(userAgent),
          ip,
          data.canton || null,
          data.pagePath,
          data.referrer || ''
        ]
      );
    } else {
      // Update existing session
      await pool.execute(
        `UPDATE user_sessions 
         SET page_count = page_count + 1,
             updated_at = NOW()
         WHERE session_id = ?`,
        [sessionId]
      );
    }
  } catch (error) {
    console.error('Error upserting session:', error);
  }
}

// Helper: Extract browser from user agent
function extractBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
}

// Helper: Extract OS from user agent
function extractOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown';
}