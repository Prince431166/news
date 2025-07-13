const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'dpg-d1p98lffte5s73c43640-a.singapore-postgres.render.com',
  database: 'postgre_qnar',
  password: '7cgCi62q7b7texyZhVtdPVy4ZV62Pszv',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;