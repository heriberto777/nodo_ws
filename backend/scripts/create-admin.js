const bcrypt = require("bcrypt");
const env = require("../src/config/env");
const { db } = require("../src/models/index");

const [name, email, password, role = "admin"] = process.argv.slice(2);

if (!name || !email || !password) {
  console.error("Usage: node scripts/create-admin.js <name> <email> <password> [role]");
  process.exit(1);
}

if (!env.databaseUrl) {
  console.error("DATABASE_URL not configured");
  process.exit(1);
}

const run = async () => {
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role",
    [name, email, passwordHash, role]
  );
  console.log("Created user:", result.rows[0]);
  process.exit(0);
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
