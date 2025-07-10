const { Pool } = require('pg');
const pool = new Pool({
  user: 'dostone',
  host: 'postgresdocument',
  database: 'dbDocumentLogbook',
  password: 'dostonepass',
  port: process.env.NODE_ENV === 'production' ? 5432 : 15432,  // Dynamic port
});
module.exports = { pool }; 