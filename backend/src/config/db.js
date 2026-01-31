const { Pool } = require("pg");
const env = require("./env");

let pool = null;

if (env.databaseUrl) {
  pool = new Pool({ connectionString: env.databaseUrl });
}

const query = async (text, params) => {
  if (!pool) {
    throw new Error("DATABASE_URL not configured");
  }
  return pool.query(text, params);
};

module.exports = { pool, query };
