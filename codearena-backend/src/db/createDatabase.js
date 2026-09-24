// CLI:  npm run db:create
// Creates the MySQL database named in DB_NAME if it doesn't exist (utf8mb4 for emoji-safe text).
import mysql from "mysql2/promise";
import { config } from "../config/env.js";

const { host, port, user, password, name } = config.db;
if (!/^[A-Za-z0-9_]+$/.test(name)) {
  console.error("DB_NAME may only contain letters, numbers and underscores.");
  process.exit(1);
}

const connection = await mysql.createConnection({ host, port, user, password });
try {
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  console.log(`Database "${name}" is ready.`);
} finally {
  await connection.end();
}
