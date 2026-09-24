// CLI:  npm run db:migrate | db:rollback | db:status
import { sequelize } from "../config/database.js";
import { createMigrator } from "./migrator.js";

const command = process.argv[2] || "up";
const migrator = createMigrator();

try {
  if (command === "up") {
    const done = await migrator.up();
    console.log(done.length ? `Applied ${done.length} migration(s).` : "Database is up to date.");
  } else if (command === "down") {
    const undone = await migrator.down();
    console.log(undone.length ? `Rolled back ${undone[0].name}.` : "Nothing to roll back.");
  } else if (command === "status") {
    const executed = await migrator.executed();
    const pending = await migrator.pending();
    console.log("Applied:", executed.map((m) => m.name));
    console.log("Pending:", pending.map((m) => m.name));
  } else {
    console.error(`Unknown command "${command}". Use up, down or status.`);
    process.exitCode = 1;
  }
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
