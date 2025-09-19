// app/api/skribble/webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SkribbleService } from '../../../../../services/SkribbleService';
import crypto from 'crypto';

const skribbleConfig = {
  apiKey: process.env.SKRIBBLE_API_KEY || '',
  baseUrl: process.env.SKRIBBLE_BASE_URL || 'https://api.skribble.com',
  environment: (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox') as 'sandbox' | 'production',
  webhookSecret: process.env.SKRIBBLE_WEBHOOK_SECRET || ''
};

const skribbleService = new SkribbleService(skribbleConfig);

export async function POST(request: NextRequest) {
  console.log('Received Skribble webhook');
  
  try {
    // Get webhook payload
    const payload = await request.json();
    const signature = request.headers.get('x-skribble-signature') || '';
    
    console.log('Webhook event type:', payload.event_type);
    
    // Verify webhook signature for security
    if (!verifyWebhookSignature(payload, signature)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Process the webhook through Skribble service
    const result = await skribbleService.handleWebhook(payload, signature);
    
    console.log('Webhook processed:', result);

    // Handle specific events for Swiss KVG insurance process
    switch (payload.event_type) {
      case 'document.signed':
        await handleDocumentSigned(payload.data);
        break;
        
      case 'session.completed':
        await handleSessionCompleted(payload.data);
        break;
        
      case 'document.declined':
        await handleDocumentDeclined(payload.data);
        break;
        
      case 'session.expired':
        await handleSessionExpired(payload.data);
        break;
    }

    return NextResponse.json({ 
      received: true, 
      processed: result.processed,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Verify webhook signature for security
function verifyWebhookSignature(payload: any, signature: string): boolean {
  if (!skribbleConfig.webhookSecret || !signature) {
    console.warn('Webhook signature verification skipped - no secret configured');
    return process.env.NODE_ENV === 'development'; // Allow in development only
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', skribbleConfig.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const receivedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(receivedSignature, 'hex')
    );
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

// Handle individual document signed event
async function handleDocumentSigned(data: any) {
  console.log('Document signed:', data.document_id);
  
  try {
    // Update database with signed document status
    // This is where you'd update your user records
    
    // Determine document type based on document title or metadata
    const documentStatus = await skribbleService.getDocumentStatus(data.document_id);
    
    if (documentStatus.title.includes('Kündigung')) {
      console.log('Cancellation document signed');
      await updateDocumentStatus(data.document_id, 'cancellation_signed');
      
      // Send confirmation email about cancellation
      await sendCancellationConfirmation(data);
      
    } else if (documentStatus.title.includes('Antrag')) {
      console.log('Application document signed');
      await updateDocumentStatus(data.document_id, 'application_signed');
      
      // Send confirmation email about new insurance application
      await sendApplicationConfirmation(data);
    }
    
  } catch (error) {
    console.error('Error handling document signed event:', error);
  }
}

// Handle session completed event (both documents signed)
async function handleSessionCompleted(data: any) {
  console.log('Signing session completed:', data.session_id);
  
  try {
    // Both cancellation and application have been signed
    // Process the complete insurance switch
    
    const sessionStatus = await skribbleService.getSigningSessionStatus(data.session_id);
    
    // Download all signed documents for archival
    const signedDocuments = [];
    for (const docId of sessionStatus.completed_documents) {
      const signedDoc = await skribbleService.downloadSignedDocument(docId);
      signedDocuments.push({
        documentId: docId,
        document: signedDoc.document,
        metadata: signedDoc.metadata
      });
    }
    
    // Archive documents (required by Swiss law - 10 years)
    await archiveSignedDocuments(data.session_id, signedDocuments);
    
    // Update user status to "insurance_switch_completed"
    await updateUserStatus(data.session_id, 'completed');
    
    // Send completion confirmation with next steps
    await sendCompletionConfirmation(data);
    
    // Notify insurance companies
    await notifyInsuranceCompanies(data);
    
    console.log('Insurance switch process completed successfully');
    
  } catch (error) {
    console.error('Error handling session completed:', error);
  }
}

// Handle document declined event
async function handleDocumentDeclined(data: any) {
  console.log('Document declined:', data.document_id);
  
  try {
    await updateDocumentStatus(data.document_id, 'declined');
    
    // Send notification about declined document
    await sendDeclinedNotification(data);
    
    // Optionally create a new signing session
    // await createNewSigningSession(data);
    
  } catch (error) {
    console.error('Error handling document declined:', error);
  }
}

// Handle session expired event
async function handleSessionExpired(data: any) {
  console.log('Signing session expired:', data.session_id);
  
  try {
    await updateSessionStatus(data.session_id, 'expired');
    
    // Send notification about expired session
    await sendExpirationNotification(data);
    
    // Create new session if user requests it
    // This could be triggered by user action or automatic
    
  } catch (error) {
    console.error('Error handling session expired:', error);
  }
}

// Database update functions
async function updateDocumentStatus(documentId: string, status: string) {
  // Implementation would update your database
  console.log(`Updated document ${documentId} status to ${status}`);
}

async function updateUserStatus(sessionId: string, status: string) {
  // Implementation would update user status in database
  console.log(`Updated session ${sessionId} status to ${status}`);
}

async function updateSessionStatus(sessionId: string, status: string) {
  // Implementation would update session status
  console.log(`Updated session ${sessionId} to ${status}`);
}

// Email notification functions
async function sendCancellationConfirmation(data: any) {
  console.log('Sending cancellation confirmation');
  // Implementation would send email confirmation
}

async function sendApplicationConfirmation(data: any) {
  console.log('Sending application confirmation');
  // Implementation would send email confirmation
}

async function sendCompletionConfirmation(data: any) {
  console.log('Sending completion confirmation');
  // Implementation would send final confirmation with next steps
}

async function sendDeclinedNotification(data: any) {
  console.log('Sending declined notification');
  // Implementation would notify about declined document
}

async function sendExpirationNotification(data: any) {
  console.log('Sending expiration notification');
  // Implementation would send expiration notice
}

// Document archival (Swiss legal requirement)
async function archiveSignedDocuments(sessionId: string, documents: any[]) {
  console.log(`Archiving ${documents.length} signed documents for session ${sessionId}`);
  
  // Implementation would:
  // 1. Store documents in secure, compliant storage
  // 2. Create audit trail entries
  // 3. Set retention period (10 years for Swiss insurance documents)
  // 4. Ensure documents are tamper-proof
}

// Notify insurance companies
async function notifyInsuranceCompanies(data: any) {
  console.log('Notifying insurance companies');
  
  // Implementation would:
  // 1. Send cancellation notice to current insurer
  // 2. Send application to new insurer
  // 3. Include all required Swiss KVG documentation
}