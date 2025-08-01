import dotenv from 'dotenv';  // Load env vars from .env
const { Pool } = require('pg');
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.ENV === 'production' ? 5432 : parseInt(process.env.DB_PORT || '5432', 10),
});

module.exports = { pool };
