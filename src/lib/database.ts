// File: src/lib/database.ts

import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST ?? '127.0.0.1',
  user: process.env.DB_USER ?? 'nextuser',
  password: process.env.DB_PASSWORD ?? 'FindBetter!2025',
  database: process.env.DB_NAME ?? 'insurrance',
  port: Number(process.env.DB_PORT ?? 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

export default pool;

// Test connection function
export async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    console.log('Database connected successfully');
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}