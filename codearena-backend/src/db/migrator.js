import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { SequelizeStorage, Umzug } from "umzug";
import { sequelize } from "../config/database.js";

const here = path.dirname(fileURLToPath(import.meta.url));

// Runs the files in db/migrations in name order and records applied ones in the SequelizeMeta table.
export function createMigrator({ logger = console } = {}) {
  return new Umzug({
    migrations: {
      glob: ["migrations/*.js", { cwd: here }],
      // Migrations are ES modules, so load them with import() instead of require().
      resolve: ({ name, path: file, context }) => ({
        name,
        up: async () => (await import(pathToFileURL(file).href)).up({ context }),
        down: async () => (await import(pathToFileURL(file).href)).down({ context }),
      }),
    },
    context: sequelize.getQueryInterface(),
    storage: new SequelizeStorage({ sequelize }),
    logger,
  });
}
