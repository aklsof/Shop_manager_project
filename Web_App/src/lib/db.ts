/**
 * TypeScript equivalent of include/connect.php
 * Provides a MySQL connection pool using mysql2/promise.
 */
import mysql from 'mysql2/promise';

/**
 * MYSQL DB (Primary connection - filess.io)
 */
const ssl_config = process.env.DB_SSL === 'true' ? {
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
} : {};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  database: process.env.DB_NAME || 'hybrid_store',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 1, // Restored to 1 to match filess.io limits
  queueLimit: 1,
  ...ssl_config,
});

export const primaryPool = pool;
export const secondaryPool = pool;
export default pool;


