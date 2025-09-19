// File: src/lib/db-utils.ts
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

export interface InsuranceQuote extends RowDataPacket {
  id: number;
  user_id: number;
  search_postal_code: string;
  search_birth_date: string;
  search_franchise: string;
  search_accident_coverage: string;
  search_current_model: string;
  search_current_insurer: string;
  new_to_switzerland: boolean;
  selected_insurer: string;
  selected_tariff_name: string;
  selected_premium: number;
  selected_franchise: string;
  selected_accident_inclusion: string;
  selected_age_group: string;
  selected_region: string;
  selected_fiscal_year: string;
  quote_status: string;
  annual_savings: number;
  created_at: string;
  updated_at: string;
}

export interface UserCompliance extends RowDataPacket {
  id: number;
  user_id: number;
  quote_id: number;
  information_art_45: boolean;
  agb_accepted: boolean;
  mandate_accepted: boolean;
  termination_authority: boolean;
  consultation_interest: boolean;
  created_at: string;
}

// Create a new user with insurance data - OPTIMIZED VERSION
export async function createUserWithInsurance(data: UserInsuranceData): Promise<number> {
  let connection;
  
  try {
    // Get connection with timeout
    connection = await Promise.race([
      pool.getConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]) as any;
    
    // Set connection timeout
    await connection.execute('SET SESSION wait_timeout = 30');
    await connection.execute('SET SESSION interactive_timeout = 30');
    
    await connection.beginTransaction();
    
    // 1. Check if user already exists (prevent duplicates)
    const [existingUser] = await connection.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [data.email]
    );
    
    if (existingUser.length > 0) {
      await connection.rollback();
      throw new Error('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits');
    }
    
    // 2. Insert user with optimized query
    const [userResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO users (
        salutation, first_name, last_name, email, phone, birth_date,
        address, postal_code, city, canton, nationality, ahv_number,
        current_insurance_policy_number, insurance_start_date,
        id_document_path, interested_in_consultation, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        data.salutation,
        data.firstName.trim(),
        data.lastName.trim(),
        data.email.toLowerCase().trim(),
        data.phone.trim(),
        data.birthDate,
        data.address.trim(),
        data.postalCode,
        data.city || null,
        data.canton || null,
        data.nationality || null,
        data.ahvNumber || null,
        data.currentInsurancePolicyNumber || null,
        data.insuranceStartDate || null,
        data.idDocumentPath || null,
        data.interestedInConsultation
      ]
    );
    
    const userId = userResult.insertId;
    
    if (!userId) {
      throw new Error('Failed to create user');
    }
    
    // 3. Insert insurance quote
    const annualSavings = calculateAnnualSavings(data.selectedInsurance.premium);
    
    const [quoteResult] = await connection.execute<ResultSetHeader>(
      `INSERT INTO insurance_quotes (
        user_id, search_postal_code, search_birth_date, search_franchise,
        search_accident_coverage, search_current_model, search_current_insurer,
        new_to_switzerland, selected_insurer, selected_tariff_name,
        selected_premium, selected_franchise, selected_accident_inclusion,
        selected_age_group, selected_region, selected_fiscal_year,
        quote_status, annual_savings, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, NOW())`,
      [
        userId,
        data.searchCriteria.postalCode,
        data.searchCriteria.birthDate,
        data.searchCriteria.franchise,
        data.searchCriteria.accidentCoverage,
        data.searchCriteria.currentModel,
        data.searchCriteria.currentInsurer || null,
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
    
    // 4. Insert compliance data
    await connection.execute(
      `INSERT INTO user_compliance (
        user_id, quote_id, information_art_45, agb_accepted,
        mandate_accepted, termination_authority, consultation_interest, created_at
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
    
    // 5. Log admin action (optional - can be done asynchronously)
    await connection.execute(
      `INSERT INTO admin_actions (user_id, quote_id, admin_user, action_type, action_details, created_at)
       VALUES (?, ?, 'system', 'created', 'User registration completed', NOW())`,
      [userId, quoteId]
    );
    
    await connection.commit();
    
    console.log(`User created successfully with ID: ${userId}`);
    return userId;
    
  } catch (error) {
    console.error('Database error in createUserWithInsurance:', error);
    
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error('Rollback error:', rollbackError);
      }
    }
    
    // Provide user-friendly error messages
    if (error.message.includes('Duplicate entry')) {
      throw new Error('Ein Benutzer mit diesen Daten existiert bereits');
    } else if (error.message.includes('timeout')) {
      throw new Error('Datenbankverbindung unterbrochen. Bitte versuchen Sie es erneut.');
    } else if (error.message.includes('connection')) {
      throw new Error('Verbindungsfehler zur Datenbank. Bitte versuchen Sie es später erneut.');
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

// Get all users for dashboard - OPTIMIZED
export async function getAllUsers(): Promise<DatabaseUser[]> {
  try {
    const [rows] = await pool.execute<DatabaseUser[]>(
      'SELECT * FROM user_dashboard_view ORDER BY join_date DESC LIMIT 1000'
    );
    return rows;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw new Error('Failed to fetch users');
  }
}

// Get detailed user information - OPTIMIZED
export async function getUserDetails(userId: number): Promise<{
  user: DetailedUser;
  quotes: InsuranceQuote[];
  compliance: UserCompliance[];
  adminActions: any[];
}> {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    // Get user details
    const [userRows] = await connection.execute<DetailedUser[]>(
      'SELECT * FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    
    if (userRows.length === 0) {
      throw new Error('User not found');
    }
    
    // Parallel execution for better performance
    const [quoteRows, complianceRows, actionRows] = await Promise.all([
      connection.execute<InsuranceQuote[]>(
        'SELECT * FROM insurance_quotes WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId]
      ),
      connection.execute<UserCompliance[]>(
        'SELECT * FROM user_compliance WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
        [userId]
      ),
      connection.execute<RowDataPacket[]>(
        'SELECT * FROM admin_actions WHERE user_id = ? ORDER BY created_at DESC LIMIT 20',
        [userId]
      )
    ]);
    
    return {
      user: userRows[0],
      quotes: quoteRows[0] as InsuranceQuote[],
      compliance: complianceRows[0] as UserCompliance[],
      adminActions: actionRows[0]
    };
    
  } catch (error) {
    console.error('Error in getUserDetails:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Update user status - OPTIMIZED
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
    
    // Update user status
    const noteEntry = notes ? `\n[${new Date().toISOString()}] ${notes}` : '';
    await connection.execute(
      'UPDATE users SET status = ?, admin_notes = CONCAT(COALESCE(admin_notes, ""), ?), updated_at = NOW() WHERE id = ?',
      [status, noteEntry, userId]
    );
    
    // Log admin action
    await connection.execute(
      `INSERT INTO admin_actions (user_id, admin_user, action_type, action_details, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [userId, adminUser, status === 'active' ? 'approved' : 'modified', notes || `Status changed to ${status}`]
    );
    
    await connection.commit();
    
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('Error in updateUserStatus:', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

// Get dashboard statistics - OPTIMIZED
export async function getDashboardStats(): Promise<any> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT * FROM admin_stats_view LIMIT 1'
    );
    return rows[0] || {
      total_users: 0,
      pending_users: 0,
      active_users: 0,
      total_quotes: 0,
      avg_premium: 0
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      total_users: 0,
      pending_users: 0,
      active_users: 0,
      total_quotes: 0,
      avg_premium: 0
    };
  }
}

// Search users - OPTIMIZED
export async function searchUsers(searchTerm: string, status?: string): Promise<DatabaseUser[]> {
  try {
    let query = `
      SELECT * FROM user_dashboard_view 
      WHERE (full_name LIKE ? OR email LIKE ? OR phone LIKE ?)
    `;
    let params: any[] = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
    
    if (status && status !== 'all') {
      query += ' AND status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY join_date DESC LIMIT 100';
    
    const [rows] = await pool.execute<DatabaseUser[]>(query, params);
    return rows;
  } catch (error) {
    console.error('Error in searchUsers:', error);
    throw new Error('Failed to search users');
  }
}

// Helper function to calculate annual savings (improved)
function calculateAnnualSavings(selectedPremium: number): number {
  // This is a simplified calculation - in reality you'd compare with average market rates
  const averageMarketPremium = 450; // CHF per month
  const monthlySavings = Math.max(0, averageMarketPremium - selectedPremium);
  return monthlySavings * 12;
}

// File upload helper - OPTIMIZED
export async function saveUserDocument(userId: number, documentPath: string): Promise<void> {
  try {
    await pool.execute(
      'UPDATE users SET id_document_path = ?, updated_at = NOW() WHERE id = ?',
      [documentPath, userId]
    );
  } catch (error) {
    console.error('Error in saveUserDocument:', error);
    throw new Error('Failed to save document path');
  }
}

// Get users by status - OPTIMIZED
export async function getUsersByStatus(status: string): Promise<DatabaseUser[]> {
  try {
    if (status === 'all') {
      return getAllUsers();
    }
    
    const [rows] = await pool.execute<DatabaseUser[]>(
      'SELECT * FROM user_dashboard_view WHERE status = ? ORDER BY join_date DESC LIMIT 500',
      [status]
    );
    return rows;
  } catch (error) {
    console.error('Error in getUsersByStatus:', error);
    throw new Error('Failed to fetch users by status');
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT 1 as health');
    return rows.length > 0 && rows[0].health === 1;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}