// File: src/app/api/policies/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/database';
import { RowDataPacket } from 'mysql2';
import { getCurrentSession } from '../../../lib/auth';
import fs from 'fs/promises';
import path from 'path';

interface PolicyDocument {
  id: string;
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: string;
  label: string;
  size?: number;
  uploadedAt: string;
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
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    // Build query with filters
    let query = `
      SELECT 
        u.id,
        u.status,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        u.phone as user_phone,
        u.address as user_address,
        u.street,
        u.postal_code as user_postal_code,
        u.city as user_city,
        u.canton as user_canton,
        u.birth_date,
        u.current_insurance_policy_number,
        u.insurance_start_date,
        u.id_document_path,
        u.created_at,
        u.updated_at,
        
        iq.id as quote_id,
        iq.search_current_insurer as current_insurer,
        iq.selected_insurer,
        iq.selected_tariff_name,
        iq.selected_premium,
        iq.selected_franchise,
        iq.selected_accident_inclusion,
        iq.annual_savings,
        iq.quote_status,
        
        CASE WHEN uc.id IS NOT NULL THEN 'Complete' ELSE 'Incomplete' END as compliance_status
        
      FROM users u
      LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
      LEFT JOIN user_compliance uc ON u.id = uc.user_id
      WHERE 1=1
    `;

    const params: any[] = [];

    // Add status filter
    if (status && status !== 'all') {
      query += ' AND u.status = ?';
      params.push(status);
    }

    // Add search filter
    if (search) {
      query += ` AND (
        CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR
        u.email LIKE ? OR
        u.phone LIKE ? OR
        u.postal_code LIKE ? OR
        iq.selected_insurer LIKE ? OR
        iq.search_current_insurer LIKE ?
      )`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY u.created_at DESC LIMIT 500';

    const [rows] = await pool.execute<RowDataPacket[]>(query, params);

    // Process each policy to get documents
    const policies = await Promise.all(
      rows.map(async (row) => {
        const documents = await getUserDocuments(row.id, row.id_document_path);

        // Calculate current premium estimate (if we have it)
        const currentPremium = row.selected_premium 
          ? row.selected_premium + (row.annual_savings / 12)
          : null;

        return {
          id: row.id,
          userId: row.id,
          userName: row.user_name,
          userEmail: row.user_email,
          userPhone: row.user_phone,
          userAddress: row.user_address,
          userStreet: row.street,
          userCity: row.user_city,
          userCanton: row.user_canton,
          userPostalCode: row.user_postal_code,
          birthDate: row.birth_date,

          // Current Insurance
          currentInsurer: row.current_insurer || null,
          currentPolicyNumber: row.current_insurance_policy_number || null,
          currentPremium: currentPremium,
          insuranceStartDate: row.insurance_start_date || null,

          // New/Selected Insurance
          selectedInsurer: row.selected_insurer || 'Not Selected',
          selectedTariffName: row.selected_tariff_name || 'N/A',
          selectedPremium: parseFloat(row.selected_premium) || 0,
          selectedFranchise: row.selected_franchise || 'N/A',
          selectedAccidentInclusion: row.selected_accident_inclusion || 'N/A',
          annualSavings: parseFloat(row.annual_savings) || 0,

          // Status
          status: row.status,
          quoteStatus: row.quote_status || 'pending',
          complianceStatus: row.compliance_status,

          // Documents
          documents,

          // Dates
          createdAt: row.created_at,
          updatedAt: row.updated_at
        };
      })
    );

    return NextResponse.json({ 
      policies,
      total: policies.length 
    }, { status: 200 });

  } catch (error) {
    console.error('Policies API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch policies', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get user documents
async function getUserDocuments(userId: number, idDocumentPath: string | null): Promise<PolicyDocument[]> {
  const documents: PolicyDocument[] = [];
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', userId.toString());

  try {
    // Check if uploads directory exists
    try {
      await fs.access(uploadsDir);
    } catch {
      // Directory doesn't exist, return empty array
      return documents;
    }

    // Read all files in the user's upload directory
    const files = await fs.readdir(uploadsDir);

    for (const file of files) {
      const filePath = path.join(uploadsDir, file);
      const stats = await fs.stat(filePath);
      const publicPath = `/uploads/${userId}/${file}`;

      // Determine file type and category
      const extension = path.extname(file).toLowerCase();
      const isPdf = extension === '.pdf';
      const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(extension);

      if (!isPdf && !isImage) continue;

      // Determine category and label from filename
      let category: PolicyDocument['category'] = 'other';
      let label = file;

      if (file.includes('application') || file.includes('antrag')) {
        category = 'application';
        label = 'Insurance Application Form';
      } else if (file.includes('cancellation') || file.includes('kuendigung')) {
        category = 'cancellation';
        label = 'Insurance Cancellation Letter';
      } else if (file.includes('id_front') || file.includes('ausweis_vorne')) {
        category = 'id_front';
        label = 'ID Card - Front';
      } else if (file.includes('id_back') || file.includes('ausweis_rueck')) {
        category = 'id_back';
        label = 'ID Card - Back';
      } else if (file.includes('id_combined') || file.includes('combined_id')) {
        category = 'id_combined';
        label = 'ID Card - Combined';
      }

      documents.push({
        id: `${userId}-${file}`,
        type: isPdf ? 'pdf' : 'image',
        name: file,
        path: publicPath,
        category,
        label,
        size: stats.size,
        uploadedAt: stats.mtime.toISOString()
      });
    }

    // Sort by upload date (newest first)
    documents.sort((a, b) => 
      new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );

  } catch (error) {
    console.error(`Error reading documents for user ${userId}:`, error);
  }

  return documents;
}

// Update policy status
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
    const { policyId, status, notes } = body;

    if (!policyId || !status) {
      return NextResponse.json(
        { error: 'Policy ID and status are required' },
        { status: 400 }
      );
    }

    // Update user status
    const noteEntry = notes ? `\n[${new Date().toISOString()}] ${admin.email}: ${notes}` : '';
    
    await pool.execute(
      `UPDATE users 
       SET status = ?, 
           admin_notes = CONCAT(COALESCE(admin_notes, ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [status, noteEntry, policyId]
    );

    // Log admin action
    await pool.execute(
      `INSERT INTO admin_actions (
        user_id, admin_user, action_type, action_details, created_at
      ) VALUES (?, ?, ?, ?, NOW())`,
      [
        policyId,
        admin.email,
        'policy_status_changed',
        `Status changed to ${status}. ${notes || ''}`
      ]
    );

    return NextResponse.json({ 
      success: true,
      message: 'Policy status updated successfully' 
    }, { status: 200 });

  } catch (error) {
    console.error('Update policy error:', error);
    return NextResponse.json(
      { error: 'Failed to update policy', details: error.message },
      { status: 500 }
    );
  }
}

// Approve policy
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
    const { policyId, action, notes } = body;

    if (!policyId || !action) {
      return NextResponse.json(
        { error: 'Policy ID and action are required' },
        { status: 400 }
      );
    }

    let newStatus = 'pending';
    let actionType = 'policy_action';
    let actionDetails = '';

    switch (action) {
      case 'approve':
        newStatus = 'approved';
        actionType = 'policy_approved';
        actionDetails = 'Policy approved and activated';
        break;
      case 'reject':
        newStatus = 'rejected';
        actionType = 'policy_rejected';
        actionDetails = `Policy rejected. Reason: ${notes || 'Not specified'}`;
        break;
      case 'activate':
        newStatus = 'active';
        actionType = 'policy_activated';
        actionDetails = 'Policy activated';
        break;
      case 'cancel':
        newStatus = 'cancelled';
        actionType = 'policy_cancelled';
        actionDetails = `Policy cancelled. Reason: ${notes || 'Not specified'}`;
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Update user status
    const noteEntry = `\n[${new Date().toISOString()}] ${admin.email}: ${actionDetails}`;
    
    await pool.execute(
      `UPDATE users 
       SET status = ?, 
           admin_notes = CONCAT(COALESCE(admin_notes, ''), ?),
           updated_at = NOW()
       WHERE id = ?`,
      [newStatus, noteEntry, policyId]
    );

    // Update quote status if exists
    await pool.execute(
      `UPDATE insurance_quotes 
       SET quote_status = ?,
           updated_at = NOW()
       WHERE user_id = ?`,
      [newStatus, policyId]
    );

    // Log admin action
    await pool.execute(
      `INSERT INTO admin_actions (
        user_id, admin_user, action_type, action_details, created_at
      ) VALUES (?, ?, ?, ?, NOW())`,
      [policyId, admin.email, actionType, actionDetails]
    );

    return NextResponse.json({ 
      success: true,
      message: `Policy ${action}ed successfully`,
      newStatus
    }, { status: 200 });

  } catch (error) {
    console.error('Policy action error:', error);
    return NextResponse.json(
      { error: 'Failed to process policy action', details: error.message },
      { status: 500 }
    );
  }
}