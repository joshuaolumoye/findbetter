// app/api/skribble/webhook/route.ts - UPDATED WEBHOOK HANDLER
import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService } from '../../../../services/SkribbleService';
import crypto from 'crypto';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

// Skribble webhook configuration
const webhookConfig = {
  secret: process.env.SKRIBBLE_WEBHOOK_SECRET || 'demo_webhook_secret_123',
  apiKey: process.env.SKRIBBLE_API_KEY || '',
  baseUrl: process.env.SKRIBBLE_BASE_URL || 'https://api.skribble.de',
  environment: process.env.SKRIBBLE_ENVIRONMENT || 'sandbox',
  username: process.env.SKRIBBLE_USERNAME || 'api_demo_companiox_15d1_1'
};

// Initialize Skribble service for webhook processing
const skribbleService = new SkribbleService(webhookConfig);

/**
 * Verify webhook signature (if Skribble provides one)
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  try {
    // Note: Adjust this based on Skribble's actual signature method
    // This is a generic HMAC-SHA256 verification
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    // Remove any prefix like 'sha256=' if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(cleanSignature)
    );
  } catch (error) {
    console.error('Webhook signature verification error:', error);
    return false;
  }
}

/**
 * Process different Skribble webhook events
 */
async function processWebhookEvent(eventType: string, data: any): Promise<{
  processed: boolean;
  action: string;
  message?: string;
}> {
  console.log(`Processing webhook event: ${eventType}`);
  
  switch (eventType) {
    case 'signature_request.signed':
      console.log('Document signed successfully:', {
        documentId: data.id,
        signerEmail: data.signatures?.[0]?.signer_email || 'unknown',
        signedAt: data.signatures?.[0]?.signed_at
      });
      
      // Here you could update your database, send notifications, etc.
      // await updateDocumentStatus(data.id, 'signed');
      // await sendConfirmationEmail(data.signatures[0].signer_email);
      
      return {
        processed: true,
        action: 'document_signed',
        message: `Document ${data.id} has been signed`
      };

    case 'signature_request.declined':
      console.log('Document declined:', {
        documentId: data.id,
        signerEmail: data.signatures?.[0]?.signer_email || 'unknown',
        declinedAt: data.signatures?.[0]?.declined_at
      });
      
      // Handle document decline
      // await updateDocumentStatus(data.id, 'declined');
      // await sendDeclineNotification(data.signatures[0].signer_email);
      
      return {
        processed: true,
        action: 'document_declined',
        message: `Document ${data.id} has been declined`
      };

    case 'signature_request.cancelled':
      console.log('Document cancelled:', {
        documentId: data.id,
        cancelledAt: data.cancelled_at
      });
      
      // Handle document cancellation
      // await updateDocumentStatus(data.id, 'cancelled');
      
      return {
        processed: true,
        action: 'document_cancelled',
        message: `Document ${data.id} has been cancelled`
      };

    case 'signature_request.created':
      console.log('New signature request created:', {
        documentId: data.id,
        title: data.title,
        signers: data.signatures?.length || 0
      });
      
      return {
        processed: true,
        action: 'document_created',
        message: `Document ${data.id} has been created`
      };

    case 'signature_request.sent':
      console.log('Signature request sent to signers:', {
        documentId: data.id,
        sentAt: data.sent_at
      });
      
      return {
        processed: true,
        action: 'document_sent',
        message: `Document ${data.id} has been sent to signers`
      };

    case 'signature_request.expired':
      console.log('Signature request expired:', {
        documentId: data.id,
        expiredAt: data.expired_at
      });
      
      // Handle document expiration
      // await updateDocumentStatus(data.id, 'expired');
      // await sendExpirationNotification();
      
      return {
        processed: true,
        action: 'document_expired',
        message: `Document ${data.id} has expired`
      };

    case 'signature_request.error':
      console.error('Signature request error:', {
        documentId: data.id,
        error: data.error_message
      });
      
      return {
        processed: true,
        action: 'document_error',
        message: `Document ${data.id} encountered an error: ${data.error_message}`
      };

    default:
      console.warn('Unknown webhook event type:', eventType);
      return {
        processed: false,
        action: 'unknown_event',
        message: `Unknown event type: ${eventType}`
      };
  }
}

/**
 * Handle webhook POST requests from Skribble
 */
export async function POST(request: NextRequest) {
  console.log('=== SKRIBBLE WEBHOOK RECEIVED ===');
  
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('x-skribble-signature') || 
                     request.headers.get('x-signature') || 
                     request.headers.get('signature') || '';
    
    console.log('Webhook received:', {
      hasBody: !!rawBody,
      hasSignature: !!signature,
      contentType: request.headers.get('content-type'),
      userAgent: request.headers.get('user-agent'),
      timestamp: new Date().toISOString()
    });

    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('Failed to parse webhook JSON:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    console.log('Webhook payload:', {
      eventType: payload.event_type || payload.type,
      dataId: payload.data?.id,
      timestamp: payload.timestamp
    });

    // Verify webhook signature (optional, depending on Skribble's implementation)
    if (webhookConfig.environment === 'production' && signature && webhookConfig.secret) {
      const isValidSignature = verifyWebhookSignature(rawBody, signature, webhookConfig.secret);
      
      if (!isValidSignature) {
        console.error('Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
      
      console.log('Webhook signature verified successfully');
    } else {
      console.log('Skipping signature verification (development mode or no signature provided)');
    }

    // Extract event type and data
    const eventType = payload.event_type || payload.type || 'unknown';
    const eventData = payload.data || payload;

    // Validate required fields
    if (!eventType) {
      return NextResponse.json(
        { error: 'Missing event_type in webhook payload' },
        { status: 400 }
      );
    }

    if (!eventData || !eventData.id) {
      return NextResponse.json(
        { error: 'Missing data or document ID in webhook payload' },
        { status: 400 }
      );
    }

    // Process the webhook event
    const result = await processWebhookEvent(eventType, eventData);

    // Log the result
    console.log('Webhook processing result:', result);

    // Also pass to the Skribble service for additional processing
    try {
      const serviceResult = await skribbleService.handleWebhook(payload, signature);
      console.log('Skribble service webhook result:', serviceResult);
    } catch (serviceError) {
      console.warn('Skribble service webhook processing failed:', serviceError);
      // Don't fail the webhook if service processing fails
    }

    // Return success response
    return NextResponse.json({
      success: true,
      processed: result.processed,
      action: result.action,
      message: result.message,
      timestamp: new Date().toISOString(),
      environment: webhookConfig.environment
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    
    // Return error response
    return NextResponse.json(
      { 
        error: 'Webhook processing failed',
        details: webhookConfig.environment === 'sandbox' ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

/**
 * Handle webhook GET requests (for verification/health checks)
 */
export async function GET(request: NextRequest) {
  console.log('Webhook GET request - health check or verification');
  
  const challenge = request.nextUrl.searchParams.get('challenge');
  const verify_token = request.nextUrl.searchParams.get('verify_token');
  
  // If this is a verification request with challenge
  if (challenge) {
    console.log('Webhook verification challenge received');
    
    // Verify token if provided
    if (verify_token && verify_token !== webhookConfig.secret) {
      return NextResponse.json(
        { error: 'Invalid verify_token' },
        { status: 403 }
      );
    }
    
    // Return challenge for verification
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  // Regular health check
  return NextResponse.json({
    status: 'ok',
    webhook_url: request.url,
    environment: webhookConfig.environment,
    timestamp: new Date().toISOString()
  });
}

// Utility functions that you might want to implement

/**
 * Update document status in your database
 */
async function updateDocumentStatus(documentId: string, status: string): Promise<void> {
  try {
    // Implement your database update logic here
    console.log(`Updating document ${documentId} status to ${status}`);
    
    // Example:
    // await pool.execute(
    //   'UPDATE documents SET status = ?, updated_at = NOW() WHERE skribble_id = ?',
    //   [status, documentId]
    // );
    
  } catch (error) {
    console.error('Failed to update document status:', error);
    throw error;
  }
}

/**
 * Send confirmation email after document is signed
 */
async function sendConfirmationEmail(signerEmail: string): Promise<void> {
  try {
    console.log(`Sending confirmation email to ${signerEmail}`);
    
    // Implement your email sending logic here
    // This could integrate with your existing email service
    
  } catch (error) {
    console.error('Failed to send confirmation email:', error);
    // Don't throw here as it's not critical for webhook processing
  }
}

/**
 * Send notification when document is declined
 */
async function sendDeclineNotification(signerEmail: string): Promise<void> {
  try {
    console.log(`Sending decline notification for ${signerEmail}`);
    
    // Implement your notification logic here
    
  } catch (error) {
    console.error('Failed to send decline notification:', error);
  }
}