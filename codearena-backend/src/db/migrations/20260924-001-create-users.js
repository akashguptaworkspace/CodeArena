import { DataTypes } from "sequelize";

const timestamps = {
  created_at: { type: DataTypes.DATE, allowNull: false },
  updated_at: { type: DataTypes.DATE, allowNull: false },
};

export async function up({ context: qi }) {
  await qi.createTable("users", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    google_sub: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false, defaultValue: "" },
    avatar_url: { type: DataTypes.STRING(500), allowNull: true },
    daily_goal: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    ...timestamps,
  });
}

export async function down({ context: qi }) {
  await qi.dropTable("users");
}
