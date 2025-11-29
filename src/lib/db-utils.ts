// lib/db-utils.ts - PRODUCTION MODE with STREET FIELD AND OLD_INSURER FIX
// ✅ EMAIL UNIQUENESS REMOVED - Multiple registrations with same email allowed
import pool from './database';
import { RowDataPacket, ResultSetHeader } from 'mysql2';

export interface UserInsuranceData {
  // Personal Information
  salutation: 'Herr' | 'Frau';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  address: string;
  street?: string;
  postalCode: string;
  city?: string;
  canton?: string;
  nationality?: string;
  ahvNumber?: string;
  currentInsurancePolicyNumber?: string;
  oldInsurer?: string; // ✅ OLD INSURER (previous insurance company)
  insuranceStartDate?: string;
  idDocumentPath?: string;
  interestedInConsultation: boolean;
  referralId?: number | null; // ✅ REFERRAL ID for tracking
  
  // Search criteria
  searchCriteria: {
    postalCode: string;
    birthDate: string;
    franchise: string;
    accidentCoverage: string;
    currentModel: string;
    currentInsurer?: string; // ✅ NEW INSURER (selected insurance)
    oldInsurer?: string; // ✅ OLD INSURER (from form)
    newToSwitzerland: boolean;
  };
  
  // Selected insurance
  selectedInsurance: {
    insurer: string;
    tariffName: string;
    premium: number;
    franchise: string;
    accidentInclusion: string;
    ageGroup: string;
    region: string;
    fiscalYear: string;
  };
  
  // Compliance
  compliance: {
    informationArt45: boolean;
    agbAccepted: boolean;
    mandateAccepted: boolean;
    terminationAuthority: boolean;
    consultationInterest: boolean;
  };
}

export interface DatabaseUser extends RowDataPacket {
  id: number;
  status: 'pending' | 'active' | 'inactive' | 'rejected';
  full_name: string;
  email: string;
  phone: string;
  birth_date: string;
  postal_code: string;
  canton: string;
  join_date: string;
  selected_insurer?: string;
  selected_premium?: number;
  annual_savings?: number;
  quote_status?: string;
  compliance_status: 'Complete' | 'Incomplete';
}

export interface DetailedUser extends RowDataPacket {
  id: number;
  status: string;
  salutation: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  birth_date: string;
  address: string;
  street: string;
  postal_code: string;
  city: string;
  canton: string;
  nationality: string;
  ahv_number: string;
  current_insurance_policy_number: string;
  old_insurer: string; // ✅ OLD INSURER FIELD
  insurance_start_date: string;
  id_document_path: string;
  interested_in_consultation: boolean;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

// ✅ PRODUCTION: Create a new user with insurance data - WITH STREET AND OLD_INSURER FIELDS
// ✅ DUPLICATE EMAIL CHECK REMOVED - Multiple registrations allowed
export async function createUserWithInsurance(data: UserInsuranceData): Promise<number> {
  let connection;
  
  try {
    console.log('PRODUCTION: Creating user with insurance data, street, and old_insurer fields...');
    console.log('Old Insurer from data:', data.oldInsurer);
    console.log('Email (duplicates allowed):', data.email);
    
    // Get connection with timeout protection
    connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ]) as any;
    
    // Set connection timeouts for production
    await connection.execute('SET SESSION wait_timeout = 60');
    await connection.execute('SET SESSION interactive_timeout = 60');
    await connection.execute('SET SESSION net_read_timeout = 30');
    await connection.execute('SET SESSION net_write_timeout = 30');
    
    await connection.beginTransaction();
    
    // ✅ REMOVED: Duplicate email check - emails are no longer unique
    // Users can now register multiple times with the same email
    
    // Step 1: Determine canton from postal code
    const canton = determineCantonFromPostalCode(data.postalCode);
    
    // Step 2: Insert user with STREET and OLD_INSURER fields included
    console.log('Inserting new user with street and old_insurer:', {
      street: data.street,
      oldInsurer: data.oldInsurer
    });
    
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (
        salutation, first_name, last_name, email, phone, birth_date,
        address, street, postal_code, city, canton, nationality, ahv_number,
        current_insurance_policy_number, old_insurer, insurance_start_date,
        id_document_path, interested_in_consultation, referral_id, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [
        data.salutation,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email.toLowerCase().trim(),
        data.phone.trim(),
        data.birthDate,
        data.address.trim(),
        data.street?.trim() || null, // ✅ STREET FIELD
        data.postalCode,
        data.city || extractCityFromAddress(data.address),
        canton,
        data.nationality || 'swiss',
        data.ahvNumber || null,
        data.currentInsurancePolicyNumber || null,
        data.oldInsurer?.trim() || null, // ✅ OLD_INSURER FIELD NOW INCLUDED
        data.insuranceStartDate || '2025-01-01',
        data.idDocumentPath || null,
        data.interestedInConsultation,
        data.referralId || null // ✅ REFERRAL_ID FIELD
      ]
    );

    const userId = userResult.insertId;

    if (!userId) {
      throw new Error('Failed to create user - no ID returned');
    }

    console.log('✅ User created with ID:', userId, 'Street:', data.street, 'Old Insurer:', data.oldInsurer, 'Referral ID:', data.referralId);
    
    // Step 3: Insert insurance quote with calculated savings
    const annualSavings = calculateAnnualSavings(data.selectedInsurance.premium);
    
    console.log('Creating insurance quote...');
    const [quoteResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO insurance_quotes (
        user_id, search_postal_code, search_birth_date, search_franchise,
        search_accident_coverage, search_current_model, search_current_insurer,
        new_to_switzerland, selected_insurer, selected_tariff_name,
        selected_premium, selected_franchise, selected_accident_inclusion,
        selected_age_group, selected_region, selected_fiscal_year,
        quote_status, annual_savings, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, NOW(), NOW())`,
      [
        userId,
        data.searchCriteria.postalCode,
        data.searchCriteria.birthDate,
        data.searchCriteria.franchise,
        data.searchCriteria.accidentCoverage,
        data.searchCriteria.currentModel,
        data.searchCriteria.currentInsurer || 'Unknown',
        data.searchCriteria.newToSwitzerland,
        data.selectedInsurance.insurer,
        data.selectedInsurance.tariffName,
        data.selectedInsurance.premium,
        data.selectedInsurance.franchise,
        data.selectedInsurance.accidentInclusion,
        data.selectedInsurance.ageGroup,
        data.selectedInsurance.region,
        data.selectedInsurance.fiscalYear,
        annualSavings
      ]
    );
    
    const quoteId = quoteResult.insertId;
    
    if (!quoteId) {
      throw new Error('Failed to create insurance quote');
    }
    
    console.log('Insurance quote created with ID:', quoteId);
    
    // Step 4: Insert compliance data
    console.log('Creating compliance record...');
    await connection.execute(
      `INSERT INTO user_compliance (
        user_id, quote_id, information_art_45, agb_accepted,
        mandate_accepted, termination_authority, consultation_interest, 
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        quoteId,
        data.compliance.informationArt45,
        data.compliance.agbAccepted,
        data.compliance.mandateAccepted,
        data.compliance.terminationAuthority,
        data.compliance.consultationInterest
      ]
    );
    
    // Step 5: Log admin action for audit trail
    await connection.execute(
      `INSERT INTO admin_actions (
        user_id, quote_id, admin_user, action_type, action_details, created_at
      ) VALUES (?, ?, 'system', 'user_created', ?, NOW())`,
      [
        userId, 
        quoteId,
        `Production user registration completed. Street: ${data.street || 'N/A'}, Old Insurer: ${data.oldInsurer || 'N/A'}`
      ]
    );
    
    await connection.commit();
    
    console.log(`✅ PRODUCTION: User created successfully with ID: ${userId}, Quote ID: ${quoteId}, Street: ${data.street}, Old Insurer: ${data.oldInsurer}`);
    return userId;
    
  } catch (error) {
    console.error('PRODUCTION: Database error in createUserWithInsurance:', error);
    
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    
    // PRODUCTION: Provide user-friendly error messages
    // ✅ REMOVED: Duplicate entry check for email
    if (error.message.includes('timeout') || error.message.includes('connection')) {
      throw new Error('Datenbankverbindung unterbrochen. Bitte versuchen Sie es erneut.');
    } else if (error.message.includes('Data too long')) {
      throw new Error('Eingabedaten zu lang. Bitte kürzen Sie Ihre Angaben.');
    } else if (error.message.includes('cannot be null')) {
      throw new Error('Pflichtfelder fehlen. Bitte prüfen Sie Ihre Eingaben.');
    }
    
    throw error;
    
  } finally {
    if (connection) {
      try {
        connection.release();
      } catch (releaseError) {
        console.error('Error releasing connection:', releaseError);
      }
    }
  }
}

// All other functions remain the same...
export async function getAllUsers(): Promise<DatabaseUser[]> {
  try {
    console.log('PRODUCTION: Fetching all users...');

    const [rows] = await Promise.race([
      pool.execute<DatabaseUser[]>(
        `SELECT
          u.id, u.status,
          CONCAT(u.first_name, ' ', u.last_name) as full_name,
          u.email, u.phone, u.birth_date, u.postal_code, u.canton,
          u.created_at as join_date,
          iq.selected_insurer, iq.selected_premium, iq.annual_savings, iq.quote_status,
          CASE WHEN uc.id IS NOT NULL THEN 'Complete' ELSE 'Incomplete' END as compliance_status,
          r.code as referral_code, r.name as referral_name
        FROM users u
        LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
        LEFT JOIN user_compliance uc ON u.id = uc.user_id
        LEFT JOIN referrals r ON u.referral_id = r.id
        ORDER BY u.created_at DESC
        LIMIT 1000`
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout')), 15000)
      )
    ]) as [DatabaseUser[], any];

    console.log(`PRODUCTION: Retrieved ${rows.length} users`);
    return rows;
  } catch (error) {
    console.error('PRODUCTION: Error in getAllUsers:', error);
    throw new Error('Failed to fetch users from database');
  }
}

export async function getUserDetails(userId: number): Promise<{
  user: DetailedUser;
  quotes: any[];
  compliance: any[];
  adminActions: any[];
}> {
  let connection;
  
  try {
    console.log(`PRODUCTION: Fetching user details for ID: ${userId}`);
    
    connection = await Promise.race([
      pool.getConnection(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      )
    ]) as any;
    
    const [userRows] = await Promise.race([
      connection.execute<DetailedUser[]>(
        `SELECT u.*, r.code as referral_code, r.name as referral_name
         FROM users u
         LEFT JOIN referrals r ON u.referral_id = r.id
         WHERE u.id = ? LIMIT 1`,
        [userId]
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('User query timeout')), 10000)
      )
    ]) as [DetailedUser[], any];
    
    if (userRows.length === 0) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    const [quoteRows, complianceRows, actionRows] = await Promise.all([
      connection.execute<any[]>(
        'SELECT * FROM insurance_quotes WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId]
      ).then(([rows]: [any[], any]) => rows),
      
      connection.execute<any[]>(
        'SELECT * FROM user_compliance WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId]
      ).then(([rows]: [any[], any]) => rows),
      
      connection.execute<any[]>(
        'SELECT * FROM admin_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId]
      ).then(([rows]: [any[], any]) => rows)
    ]);
    
    console.log(`PRODUCTION: User details retrieved for ID: ${userId}, Street: ${userRows[0].street}, Old Insurer: ${userRows[0].old_insurer}`);
    
    return {
      user: userRows[0],
      quotes: quoteRows,
      compliance: complianceRows,
      adminActions: actionRows
    };
    
  } catch (error) {
    console.error('PRODUCTION: Error in getUserDetails:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Helper functions
function determineCantonFromPostalCode(postalCode: string): string {
  if (!postalCode || !/^\d{4}$/.test(postalCode)) return 'ZH';
  const plz = parseInt(postalCode);
  if (plz >= 1000 && plz <= 1299) return 'VD';
  if (plz >= 1200 && plz <= 1299) return 'GE';
  if (plz >= 2000 && plz <= 2099) return 'NE';
  if (plz >= 3000 && plz <= 3999) return 'BE';
  if (plz >= 4000 && plz <= 4999) return 'BL';
  if (plz >= 5000 && plz <= 5999) return 'AG';
  if (plz >= 6000 && plz <= 6999) return 'LU';
  if (plz >= 7000 && plz <= 7999) return 'GR';
  if (plz >= 8000 && plz <= 8999) return 'ZH';
  if (plz >= 9000 && plz <= 9999) return 'SG';
  return 'ZH';
}

function extractCityFromAddress(address: string): string {
  if (!address) return '';
  const cityMatch = address.match(/\d{4}\s+([A-Za-zäöüÄÖÜ\s]+)$/);
  if (cityMatch) return cityMatch[1].trim();
  const parts = address.split(',');
  if (parts.length > 1) return parts[parts.length - 1].trim().replace(/^\d+\s*/, '');
  return '';
}

function calculateAnnualSavings(selectedPremium: number): number {
  const averageMarketPremium = 450;
  const monthlySavings = Math.max(0, averageMarketPremium - selectedPremium);
  return Math.round(monthlySavings * 12);
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const [rows] = await Promise.race([
      pool.execute<any[]>('SELECT 1 as health'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]) as [any[], any];
    return rows.length > 0 && rows[0].health === 1;
  } catch (error) {
    console.error('PRODUCTION: Database health check failed:', error);
    return false;
  }
}

// Other helper functions remain the same...
export async function updateUserStatus(
  userId: number, 
  status: 'pending' | 'active' | 'inactive' | 'rejected',
  adminUser: string,
  notes?: string
): Promise<void> {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();
    const noteEntry = notes ? `\n[${new Date().toISOString()}] ${adminUser}: ${notes}` : '';
    await connection.execute(
      'UPDATE users SET status = ?, admin_notes = CONCAT(COALESCE(admin_notes, ""), ?), updated_at = NOW() WHERE id = ?',
      [status, noteEntry, userId]
    );
    await connection.execute(
      `INSERT INTO admin_actions (user_id, admin_user, action_type, action_details, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, adminUser, status === 'active' ? 'approved' : 'status_changed', notes || `Status changed to ${status}`]
    );
    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback();
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

export async function getDashboardStats(): Promise<any> {
  try {
    const [rows] = await pool.execute<any[]>(`
      SELECT 
        COUNT(DISTINCT u.id) as total_users,
        COUNT(CASE WHEN u.status = 'pending' THEN 1 END) as pending_users,
        COUNT(CASE WHEN u.status = 'active' THEN 1 END) as active_users,
        COUNT(CASE WHEN u.status = 'rejected' THEN 1 END) as rejected_users,
        COUNT(DISTINCT iq.id) as total_quotes,
        ROUND(AVG(iq.selected_premium), 2) as avg_premium,
        ROUND(SUM(iq.annual_savings), 2) as total_savings
      FROM users u 
      LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
    `);
    return rows[0] || {};
  } catch (error) {
    return {
      total_users: 0,
      pending_users: 0,
      active_users: 0,
      rejected_users: 0,
      total_quotes: 0,
      avg_premium: 0,
      total_savings: 0
    };
  }
}

export async function searchUsers(searchTerm: string, status?: string): Promise<DatabaseUser[]> {
  try {
    let query = `
      SELECT u.id, u.status, CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.email, u.phone, u.birth_date, u.postal_code, u.canton, u.created_at as join_date,
        iq.selected_insurer, iq.selected_premium, iq.annual_savings, iq.quote_status,
        CASE WHEN uc.id IS NOT NULL THEN 'Complete' ELSE 'Incomplete' END as compliance_status
      FROM users u
      LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
      LEFT JOIN user_compliance uc ON u.id = uc.user_id
      WHERE (CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.postal_code LIKE ?)
    `;
    let params: any[] = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
    if (status && status !== 'all') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    query += ' ORDER BY u.created_at DESC LIMIT 100';
    const [rows] = await pool.execute<DatabaseUser[]>(query, params);
    return rows;
  } catch (error) {
    throw new Error('Failed to search users');
  }
}

export async function saveUserDocument(userId: number, documentPath: string): Promise<void> {
  await pool.execute(
    'UPDATE users SET id_document_path = ?, updated_at = NOW() WHERE id = ?',
    [documentPath, userId]
  );
}

export async function getUsersByStatus(status: string): Promise<DatabaseUser[]> {
  if (status === 'all') return getAllUsers();
  const [rows] = await pool.execute<DatabaseUser[]>(
    `SELECT u.id, u.status, CONCAT(u.first_name, ' ', u.last_name) as full_name,
      u.email, u.phone, u.birth_date, u.postal_code, u.canton, u.created_at as join_date,
      iq.selected_insurer, iq.selected_premium, iq.annual_savings, iq.quote_status,
      CASE WHEN uc.id IS NOT NULL THEN 'Complete' ELSE 'Incomplete' END as compliance_status,
      r.code as referral_code, r.name as referral_name
    FROM users u
    LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
    LEFT JOIN user_compliance uc ON u.id = uc.user_id
    LEFT JOIN referrals r ON u.referral_id = r.id
    WHERE u.status = ?
    ORDER BY u.created_at DESC LIMIT 500`,
    [status]
  );
  return rows;
}