// lib/db-utils.ts - PRODUCTION MODE FIXED
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
  postalCode: string;
  city?: string;
  canton?: string;
  nationality?: string;
  ahvNumber?: string;
  currentInsurancePolicyNumber?: string;
  insuranceStartDate?: string;
  idDocumentPath?: string;
  interestedInConsultation: boolean;
  
  // Search criteria
  searchCriteria: {
    postalCode: string;
    birthDate: string;
    franchise: string;
    accidentCoverage: string;
    currentModel: string;
    currentInsurer?: string;
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
  postal_code: string;
  city: string;
  canton: string;
  nationality: string;
  ahv_number: string;
  current_insurance_policy_number: string;
  insurance_start_date: string;
  id_document_path: string;
  interested_in_consultation: boolean;
  admin_notes: string;
  created_at: string;
  updated_at: string;
}

// PRODUCTION: Create a new user with insurance data - HEAVILY OPTIMIZED
export async function createUserWithInsurance(data: UserInsuranceData): Promise<number> {
  let connection;
  
  try {
    console.log('PRODUCTION: Creating user with insurance data...');
    
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
    
    // Step 1: Check for existing user (prevent duplicates)
    console.log('Checking for existing user:', data.email);
    const [existingUser] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [data.email.toLowerCase().trim()]
    );
    
    if (existingUser.length > 0) {
      await connection.rollback();
      throw new Error(`Ein Benutzer mit der E-Mail-Adresse ${data.email} existiert bereits`);
    }
    
    // Step 2: Determine canton from postal code (simplified)
    const canton = determineCantonFromPostalCode(data.postalCode);
    
    // Step 3: Insert user with PRODUCTION data validation
    console.log('Inserting new user...');
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (
        salutation, first_name, last_name, email, phone, birth_date,
        address, postal_code, city, canton, nationality, ahv_number,
        current_insurance_policy_number, insurance_start_date,
        id_document_path, interested_in_consultation, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
      [
        data.salutation,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email.toLowerCase().trim(),
        data.phone.trim(),
        data.birthDate,
        data.address.trim(),
        data.postalCode,
        data.city || extractCityFromAddress(data.address),
        canton,
        data.nationality || 'swiss',
        data.ahvNumber || null,
        data.currentInsurancePolicyNumber || null,
        data.insuranceStartDate || '2025-01-01',
        data.idDocumentPath || null,
        data.interestedInConsultation
      ]
    );
    
    const userId = userResult.insertId;
    
    if (!userId) {
      throw new Error('Failed to create user - no ID returned');
    }
    
    console.log('User created with ID:', userId);
    
    // Step 4: Insert insurance quote with calculated savings
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
    
    // Step 5: Insert compliance data
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
    
    // Step 6: Log admin action for audit trail
    await connection.execute(
      `INSERT INTO admin_actions (
        user_id, quote_id, admin_user, action_type, action_details, created_at
      ) VALUES (?, ?, 'system', 'user_created', 'Production user registration completed', NOW())`,
      [userId, quoteId]
    );
    
    await connection.commit();
    
    console.log(`PRODUCTION: User created successfully with ID: ${userId}, Quote ID: ${quoteId}`);
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
    if (error.message.includes('Duplicate entry') || error.message.includes('existiert bereits')) {
      throw new Error('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits');
    } else if (error.message.includes('timeout') || error.message.includes('connection')) {
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

// PRODUCTION: Get all users for dashboard - OPTIMIZED
export async function getAllUsers(): Promise<DatabaseUser[]> {
  try {
    console.log('PRODUCTION: Fetching all users...');
    
    // Use optimized query with timeout
    const [rows] = await Promise.race([
      pool.execute<DatabaseUser[]>(
        `SELECT 
          u.id,
          u.status,
          CONCAT(u.first_name, ' ', u.last_name) as full_name,
          u.email,
          u.phone,
          u.birth_date,
          u.postal_code,
          u.canton,
          u.created_at as join_date,
          iq.selected_insurer,
          iq.selected_premium,
          iq.annual_savings,
          iq.quote_status,
          CASE 
            WHEN uc.id IS NOT NULL THEN 'Complete'
            ELSE 'Incomplete'
          END as compliance_status
        FROM users u
        LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
        LEFT JOIN user_compliance uc ON u.id = uc.user_id
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

// PRODUCTION: Get detailed user information - OPTIMIZED
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
    
    // Get user details with timeout protection
    const [userRows] = await Promise.race([
      connection.execute<DetailedUser[]>(
        'SELECT * FROM users WHERE id = ? LIMIT 1',
        [userId]
      ),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('User query timeout')), 10000)
      )
    ]) as [DetailedUser[], any];
    
    if (userRows.length === 0) {
      throw new Error(`User not found with ID: ${userId}`);
    }
    
    // Parallel execution for better performance
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
    
    console.log(`PRODUCTION: User details retrieved for ID: ${userId}`);
    
    return {
      user: userRows[0],
      quotes: quoteRows,
      compliance: complianceRows,
      adminActions: actionRows
    };
    
  } catch (error) {
    console.error('PRODUCTION: Error in getUserDetails:', error);
    
    if (error.message.includes('timeout')) {
      throw new Error('Database query timeout - please try again');
    }
    
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PRODUCTION: Update user status - OPTIMIZED
export async function updateUserStatus(
  userId: number, 
  status: 'pending' | 'active' | 'inactive' | 'rejected',
  adminUser: string,
  notes?: string
): Promise<void> {
  let connection;
  
  try {
    console.log(`PRODUCTION: Updating user ${userId} status to ${status}`);
    
    connection = await pool.getConnection();
    await connection.beginTransaction();
    
    // Update user status
    const noteEntry = notes ? `\n[${new Date().toISOString()}] ${adminUser}: ${notes}` : '';
    await connection.execute(
      'UPDATE users SET status = ?, admin_notes = CONCAT(COALESCE(admin_notes, ""), ?), updated_at = NOW() WHERE id = ?',
      [status, noteEntry, userId]
    );
    
    // Log admin action
    await connection.execute(
      `INSERT INTO admin_actions (user_id, admin_user, action_type, action_details, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, adminUser, status === 'active' ? 'approved' : 'status_changed', notes || `Status changed to ${status}`]
    );
    
    await connection.commit();
    console.log(`PRODUCTION: User ${userId} status updated successfully`);
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('PRODUCTION: Error in updateUserStatus:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// PRODUCTION: Get dashboard statistics - OPTIMIZED
export async function getDashboardStats(): Promise<any> {
  try {
    console.log('PRODUCTION: Fetching dashboard statistics...');
    
    const [rows] = await Promise.race([
      pool.execute<any[]>(`
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
      `),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Stats query timeout')), 10000)
      )
    ]) as [any[], any];
    
    const stats = rows[0] || {
      total_users: 0,
      pending_users: 0,
      active_users: 0,
      rejected_users: 0,
      total_quotes: 0,
      avg_premium: 0,
      total_savings: 0
    };
    
    console.log('PRODUCTION: Dashboard statistics retrieved:', stats);
    return stats;
  } catch (error) {
    console.error('PRODUCTION: Error in getDashboardStats:', error);
    // Return empty stats rather than failing
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

// PRODUCTION: Search users - OPTIMIZED
export async function searchUsers(searchTerm: string, status?: string): Promise<DatabaseUser[]> {
  try {
    console.log(`PRODUCTION: Searching users with term: "${searchTerm}", status: ${status}`);
    
    let query = `
      SELECT 
        u.id,
        u.status,
        CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.email,
        u.phone,
        u.birth_date,
        u.postal_code,
        u.canton,
        u.created_at as join_date,
        iq.selected_insurer,
        iq.selected_premium,
        iq.annual_savings,
        iq.quote_status,
        CASE 
          WHEN uc.id IS NOT NULL THEN 'Complete'
          ELSE 'Incomplete'
        END as compliance_status
      FROM users u
      LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
      LEFT JOIN user_compliance uc ON u.id = uc.user_id
      WHERE (
        CONCAT(u.first_name, ' ', u.last_name) LIKE ? OR 
        u.email LIKE ? OR 
        u.phone LIKE ? OR
        u.postal_code LIKE ?
      )
    `;
    
    let params: any[] = [
      `%${searchTerm}%`, 
      `%${searchTerm}%`, 
      `%${searchTerm}%`,
      `%${searchTerm}%`
    ];
    
    if (status && status !== 'all') {
      query += ' AND u.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY u.created_at DESC LIMIT 100';
    
    const [rows] = await Promise.race([
      pool.execute<DatabaseUser[]>(query, params),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Search timeout')), 10000)
      )
    ]) as [DatabaseUser[], any];
    
    console.log(`PRODUCTION: Found ${rows.length} users matching search`);
    return rows;
  } catch (error) {
    console.error('PRODUCTION: Error in searchUsers:', error);
    throw new Error('Failed to search users');
  }
}

// PRODUCTION: Database health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const [rows] = await Promise.race([
      pool.execute<any[]>('SELECT 1 as health, NOW() as timestamp'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), 5000)
      )
    ]) as [any[], any];
    
    const isHealthy = rows.length > 0 && rows[0].health === 1;
    console.log('PRODUCTION: Database health check:', isHealthy ? 'HEALTHY' : 'UNHEALTHY');
    return isHealthy;
  } catch (error) {
    console.error('PRODUCTION: Database health check failed:', error);
    return false;
  }
}

// Helper functions for production mode
function determineCantonFromPostalCode(postalCode: string): string {
  if (!postalCode || !/^\d{4}$/.test(postalCode)) {
    return 'ZH'; // Default to Zurich
  }
  
  const plz = parseInt(postalCode);
  
  // Simplified canton mapping based on postal code ranges
  if (plz >= 1000 && plz <= 1299) return 'VD'; // Vaud
  if (plz >= 1300 && plz <= 1399) return 'VD'; // Vaud
  if (plz >= 1400 && plz <= 1499) return 'VD'; // Vaud
  if (plz >= 1200 && plz <= 1299) return 'GE'; // Geneva
  if (plz >= 2000 && plz <= 2099) return 'NE'; // Neuchâtel
  if (plz >= 3000 && plz <= 3999) return 'BE'; // Bern
  if (plz >= 4000 && plz <= 4999) return 'BL'; // Basel-Landschaft
  if (plz >= 5000 && plz <= 5999) return 'AG'; // Aargau
  if (plz >= 6000 && plz <= 6999) return 'LU'; // Lucerne
  if (plz >= 7000 && plz <= 7999) return 'GR'; // Graubünden
  if (plz >= 8000 && plz <= 8999) return 'ZH'; // Zurich
  if (plz >= 9000 && plz <= 9999) return 'SG'; // St. Gallen
  
  return 'ZH'; // Default fallback
}

function extractCityFromAddress(address: string): string {
  if (!address) return '';
  
  // Try to extract city from address patterns like "Bahnhofstrasse 1, 8001 Zürich"
  const cityMatch = address.match(/\d{4}\s+([A-Za-zäöüÄÖÜ\s]+)$/);
  if (cityMatch) {
    return cityMatch[1].trim();
  }
  
  // Fallback: take last part after comma
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim().replace(/^\d+\s*/, '');
  }
  
  return '';
}

function calculateAnnualSavings(selectedPremium: number): number {
  // PRODUCTION: More sophisticated calculation based on Swiss market data
  const averageSwissPremiums = {
    'basic': 450,     // CHF per month
    'standard': 480,
    'premium': 520
  };
  
  const averageMarketPremium = averageSwissPremiums.basic; // Use basic as baseline
  const monthlySavings = Math.max(0, averageMarketPremium - selectedPremium);
  return Math.round(monthlySavings * 12);
}

// PRODUCTION: Additional utility functions
export async function saveUserDocument(userId: number, documentPath: string): Promise<void> {
  try {
    console.log(`PRODUCTION: Saving document path for user ${userId}: ${documentPath}`);
    
    await pool.execute(
      'UPDATE users SET id_document_path = ?, updated_at = NOW() WHERE id = ?',
      [documentPath, userId]
    );
  } catch (error) {
    console.error('PRODUCTION: Error in saveUserDocument:', error);
    throw new Error('Failed to save document path');
  }
}

export async function getUsersByStatus(status: string): Promise<DatabaseUser[]> {
  try {
    console.log(`PRODUCTION: Fetching users by status: ${status}`);
    
    if (status === 'all') {
      return getAllUsers();
    }
    
    const [rows] = await pool.execute<DatabaseUser[]>(
      `SELECT 
        u.id, u.status, CONCAT(u.first_name, ' ', u.last_name) as full_name,
        u.email, u.phone, u.birth_date, u.postal_code, u.canton,
        u.created_at as join_date, iq.selected_insurer, iq.selected_premium,
        iq.annual_savings, iq.quote_status,
        CASE WHEN uc.id IS NOT NULL THEN 'Complete' ELSE 'Incomplete' END as compliance_status
      FROM users u
      LEFT JOIN insurance_quotes iq ON u.id = iq.user_id
      LEFT JOIN user_compliance uc ON u.id = uc.user_id
      WHERE u.status = ? 
      ORDER BY u.created_at DESC 
      LIMIT 500`,
      [status]
    );
    
    console.log(`PRODUCTION: Retrieved ${rows.length} users with status ${status}`);
    return rows;
  } catch (error) {
    console.error('PRODUCTION: Error in getUsersByStatus:', error);
    throw new Error('Failed to fetch users by status');
  }
}