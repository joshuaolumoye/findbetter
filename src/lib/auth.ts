// File: src/lib/auth.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import pool from './database';
import { RowDataPacket } from 'mysql2';

export interface Admin {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
}

export interface SessionData {
  adminId: number;
  email: string;
  name: string;
  role: string;
}

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12');

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}

// Verify password
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(payload: SessionData): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verify JWT token
export function verifyToken(token: string): SessionData | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionData;
  } catch (error) {
    return null;
  }
}

// Find admin by email
export async function findAdminByEmail(email: string): Promise<Admin | null> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, password_hash, name, role, is_active FROM admins WHERE email = ? AND is_active = TRUE',
      [email]
    );
    
    if (rows.length === 0) return null;
    
    const row = rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      is_active: row.is_active
    };
  } catch (error) {
    console.error('Error finding admin:', error);
    return null;
  }
}

// Authenticate admin
export async function authenticateAdmin(email: string, password: string): Promise<Admin | null> {
  try {
    const [rows] = await pool.execute<RowDataPacket[]>(
      'SELECT id, email, password_hash, name, role, is_active FROM admins WHERE email = ? AND is_active = TRUE',
      [email]
    );
    
    if (rows.length === 0) return null;
    
    const admin = rows[0];
    const isValidPassword = await verifyPassword(password, admin.password_hash);
    
    if (!isValidPassword) return null;
    
    // Update last login
    await pool.execute(
      'UPDATE admins SET last_login = NOW() WHERE id = ?',
      [admin.id]
    );
    
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      is_active: admin.is_active
    };
  } catch (error) {
    console.error('Error authenticating admin:', error);
    return null;
  }
}

// Create session
export async function createSession(admin: Admin): Promise<string> {
  try {
    const sessionToken = generateToken({
      adminId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    });
    
    // Calculate expiration (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Store session in database
    await pool.execute(
      'INSERT INTO admin_sessions (session_token, admin_id, expires_at) VALUES (?, ?, ?)',
      [sessionToken, admin.id, expiresAt]
    );
    
    return sessionToken;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error('Failed to create session');
  }
}

// Validate session
export async function validateSession(sessionToken?: string): Promise<Admin | null> {
  if (!sessionToken) return null;
  
  try {
    // Verify JWT token
    const tokenData = verifyToken(sessionToken);
    if (!tokenData) return null;
    
    // Check if session exists in database and is not expired
    const [sessionRows] = await pool.execute<RowDataPacket[]>(
      `SELECT s.*, a.email, a.name, a.role, a.is_active 
       FROM admin_sessions s 
       JOIN admins a ON s.admin_id = a.id 
       WHERE s.session_token = ? AND s.expires_at > NOW() AND a.is_active = TRUE`,
      [sessionToken]
    );
    
    if (sessionRows.length === 0) {
      // Clean up invalid/expired session
      await pool.execute('DELETE FROM admin_sessions WHERE session_token = ?', [sessionToken]);
      return null;
    }
    
    const session = sessionRows[0];
    return {
      id: session.admin_id,
      email: session.email,
      name: session.name,
      role: session.role,
      is_active: session.is_active
    };
  } catch (error) {
    console.error('Error validating session:', error);
    return null;
  }
}

// Destroy session
export async function destroySession(sessionToken: string): Promise<void> {
  try {
    await pool.execute('DELETE FROM admin_sessions WHERE session_token = ?', [sessionToken]);
  } catch (error) {
    console.error('Error destroying session:', error);
  }
}

// Get current session from cookies
export async function getCurrentSession(): Promise<Admin | null> {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('admin_session')?.value;
  return await validateSession(sessionToken);
}

// Clean up expired sessions (run this periodically)
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    await pool.execute('DELETE FROM admin_sessions WHERE expires_at < NOW()');
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
  }
}