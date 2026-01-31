const env = require("../config/env");
const db = require("../config/db");

if (!env.databaseUrl || !db.pool) {
  throw new Error("DATABASE_URL must be configured for PostgreSQL");
}

module.exports = {
  db
};
