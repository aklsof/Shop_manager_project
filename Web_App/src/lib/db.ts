/**
 * TypeScript equivalent of include/connect.php
 * Provides a MySQL connection pool using mysql2/promise.
 */
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'hybrid_store',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
