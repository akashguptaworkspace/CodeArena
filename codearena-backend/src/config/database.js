import { Sequelize } from "sequelize";
import { config } from "./env.js";

const { db } = config;

export const sequelize =
  db.dialect === "sqlite"
    ? new Sequelize({ dialect: "sqlite", storage: db.storage, logging: false })
    : new Sequelize(db.name, db.user, db.password, {
        host: db.host,
        port: db.port,
        dialect: "mysql",
        logging: db.logging ? console.log : false,
        timezone: "+00:00", // store DATETIMEs in UTC
        dialectOptions: { dateStrings: false },
        pool: { max: 10, min: 0, acquire: 30_000, idle: 10_000 },
        define: {
          underscored: true, // created_at, user_id…
          charset: "utf8mb4",
          collate: "utf8mb4_unicode_ci",
        },
      });

export async function connectDatabase() {
  await sequelize.authenticate();
  if (!config.isTest) console.log(`Connected to ${db.dialect} database "${db.dialect === "sqlite" ? db.storage : db.name}"`);
}
